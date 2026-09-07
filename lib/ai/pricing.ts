/**
 * Sales Pilot — Centralized AI Pricing Configuration
 *
 * Tracks per-token costs for OpenAI text generation, vision, and embedding models.
 * Prices are in USD per 1,000,000 tokens (or converted to per-token).
 */

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const AI_PRICING: Record<string, ModelPricing> = {
  // Default OpenAI Chat / Completion Models
  "gpt-5-mini": {
    inputPerMillion: 0.25,
    outputPerMillion: 2.0,
  },
  "gpt-4o-mini": {
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
  },
  "gpt-4o": {
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
  },
  // Default OpenAI Embedding Models
  "text-embedding-3-small": {
    inputPerMillion: 0.02,
    outputPerMillion: 0.0,
  },
  "text-embedding-3-large": {
    inputPerMillion: 0.13,
    outputPerMillion: 0.0,
  },
};

export const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-5-mini";
export const DEFAULT_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
export const DEFAULT_VISION_MODEL = process.env.OPENAI_VISION_MODEL || DEFAULT_CHAT_MODEL;

/**
 * Calculates estimated cost in USD based on model and token counts
 */
export function calculateAiCost(params: {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  eventType?: "embedding" | "chat_completion" | "vision_analysis" | "message";
}): number {
  const modelKey = (params.model || (params.eventType === "embedding" ? DEFAULT_EMBEDDING_MODEL : DEFAULT_CHAT_MODEL)).toLowerCase();
  
  // Find closest matching pricing tier
  let pricing = AI_PRICING[modelKey];
  if (!pricing) {
    if (modelKey.includes("embedding")) {
      pricing = AI_PRICING["text-embedding-3-small"];
    } else if (modelKey.includes("4o-mini") || modelKey.includes("mini")) {
      pricing = AI_PRICING["gpt-4o-mini"];
    } else if (modelKey.includes("4o")) {
      pricing = AI_PRICING["gpt-4o"];
    } else {
      pricing = AI_PRICING["gpt-5-mini"];
    }
  }

  const promptTokens = Math.max(0, params.promptTokens || 0);
  const completionTokens = Math.max(0, params.completionTokens || 0);

  const promptCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;

  // Round to 6 decimal places for database storage
  return Number((promptCost + completionCost).toFixed(6));
}
