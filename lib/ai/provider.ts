// =====================================================
// SALES PILOT ? AI PROVIDER LAYER
// =====================================================
//
// A thin, extensible LLM provider abstraction. The rest of the
// app talks to this module instead of hard-coding a provider. This
// keeps provider/model selection configurable through environment
// variables and leaves a clean seam for future providers (e.g. a
// vision-capable model) without rewriting the chat architecture.
//
// Env vars (all optional, with defaults):
//   OPENAI_API_KEY        ? required bearer token
//   OPENAI_CHAT_MODEL     ? text model  (default gpt-5-mini)
//   OPENAI_VISION_MODEL   ? vision model (defaults to chat model)
//   OPENAI_BASE_URL       ? API base URL (default the OpenAI Responses API)
// =====================================================

const DEFAULT_BASE_URL = "https://api.openai.com/v1/responses";

export interface AiProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  visionModel?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AiCompletionInput {
  instructions: string;
  text: string;
  /** Optional base64 data URL (e.g. "data:image/png;base64,...") for vision. */
  imageDataUrl?: string | null;
}

export interface AiCompletionResult {
  text: string;
  raw?: unknown;
}

// =====================================================
// HELPERS
// =====================================================

function asEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export function getProviderConfig(): AiProviderConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseUrl: asEnv("OPENAI_BASE_URL", DEFAULT_BASE_URL),
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5-mini",
    visionModel: process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-5-mini",
    maxOutputTokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? 700),
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS ?? 60000),
  };
}

// =====================================================
// EXTRACT RESPONSES API TEXT
// =====================================================

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) return "";

  const parts: string[] = [];
  for (const outputItem of data.output) {
    if (!Array.isArray(outputItem?.content)) continue;
    for (const contentItem of outputItem.content) {
      if (contentItem?.type === "output_text" && typeof contentItem?.text === "string") {
        parts.push(contentItem.text);
      }
    }
  }
  return parts.join("\n").trim();
}

// =====================================================
// COMPLETE
// =====================================================

export async function completeAi(
  input: AiCompletionInput,
  overrides?: Partial<AiProviderConfig>
): Promise<AiCompletionResult> {
  const config: AiProviderConfig = { ...getProviderConfig(), ...overrides };

  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const wantsVision = Boolean(input.imageDataUrl);
  const model = wantsVision ? config.visionModel : config.model;
  const hasVision = modelParamAllowsImages(model);

  const body: Record<string, unknown> = {
    model,
    instructions: input.instructions,
    store: false,
    reasoning: { effort: "low" },
    max_output_tokens: config.maxOutputTokens ?? 700,
  };

  // Build the input content. The Responses API accepts either a
  // plain string or an array of content parts (text + image_url).
  if (wantsVision && hasVision && input.imageDataUrl) {
    body.input = [
      { role: "user", content: [
        { type: "input_text", text: input.text },
        { type: "input_image", image_url: input.imageDataUrl },
      ]},
    ];
  } else {
    body.input = input.text;
  }

  const controller = new AbortController();
  const timeoutMs = config.timeoutMs ?? 60000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  console.log("=================================");
  console.log("AI PROVIDER REQUEST");
  console.log("MODEL:", model);
  console.log("VISION:", wantsVision);
  console.log("VISION MODEL SUPPORTS IMAGES:", hasVision);
  console.log("TEXT LENGTH:", String(input.text || "").length);

  try {
    const response = await fetch(config.baseUrl ?? DEFAULT_BASE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    clearTimeout(timeout);
    const responseText = await response.text();

    if (!response.ok) {
      console.error("AI PROVIDER STATUS:", response.status);
      console.error("AI PROVIDER ERROR:", responseText);
      let errorMessage = `AI provider returned ${response.status}.`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData?.error?.message || errorMessage;
      } catch {
        /* non-JSON */
      }
      if (response.status === 429) {
        throw new Error("AI provider rate limit reached. Please try again shortly.");
      }
      throw new Error(errorMessage);
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("AI provider returned invalid JSON.");
    }

    console.log("AI PROVIDER STATUS:", data?.status);
    if (data?.incomplete_details) {
      console.warn("AI PROVIDER INCOMPLETE:", data.incomplete_details);
    }

    const rawResult = extractOutputText(data);
    if (data?.status === "incomplete" && data?.incomplete_details?.reason === "max_output_tokens") {
      throw new Error("AI response reached the output token limit before producing a complete answer.");
    }

    const duration = Date.now() - startedAt;
    console.log("AI PROVIDER COMPLETED");
    console.log(`AI PROVIDER TIME: ${duration}ms`);

    if (!rawResult) {
      console.error("AI PROVIDER RAW RESPONSE:", JSON.stringify(data).slice(0, 500));
      throw new Error("AI provider returned an empty response.");
    }

    return { text: rawResult, raw: data };
  } catch (error: any) {
    clearTimeout(timeout);
    console.error("=================================");
    console.error("AI PROVIDER ERROR");
    console.error(error);
    console.error("=================================");
    if (error?.name === "AbortError") {
      throw new Error(`AI response timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    throw error;
  }
}

// =====================================================
// VISION MODEL DETECTION
// =====================================================

function modelParamAllowsImages(model: string | undefined): boolean {
  const m = String(model || "").toLowerCase();
  // OpenAI vision-capable models are generally "gpt-*-vision-*",
  // "*-turbo*" variants that support vision, or newer gpt-5x models.
  if (m.includes("vision")) return true;
  if (m.includes("-turbo")) return true;
  if (m.includes("gpt-4o")) return true;
  if (m.includes("gpt-4.1")) return true;
  if (m.includes("gpt-5")) return true;
  if (m.includes("gpt-4-mini")) return true;
  return false;
}

export function supportsVision(): boolean {
  const cfg = getProviderConfig();
  return modelParamAllowsImages(cfg.visionModel);
}