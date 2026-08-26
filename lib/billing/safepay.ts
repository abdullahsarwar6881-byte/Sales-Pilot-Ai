import { Safepay } from "@sfpy/node-sdk";
import { Environment } from "@sfpy/node-sdk/dist/utils";

// =====================================================
// ENVIRONMENT
// =====================================================

const safepayEnvironment =
  process.env.SAFEPAY_ENVIRONMENT === "production"
    ? Environment.Production
    : Environment.Sandbox;

// =====================================================
// CREDENTIALS
// =====================================================

const apiKey =
  process.env.SAFEPAY_SECRET_KEY;

const webhookSecret =
  process.env.SAFEPAY_WEBHOOK_SECRET;

// =====================================================
// VALIDATION
// =====================================================

if (!apiKey) {
  throw new Error(
    "SAFEPAY_SECRET_KEY is not configured."
  );
}

if (!webhookSecret) {
  throw new Error(
    "SAFEPAY_WEBHOOK_SECRET is not configured."
  );
}

// =====================================================
// SAFEPAY CLIENT
// =====================================================

export const safepay = new Safepay({
  environment: safepayEnvironment,

  apiKey,

  // SDK 3.0.2 requires this field.
  // We do not have a separate V1 secret in your
  // Safepay dashboard, so use the Secret Key here.
  v1Secret: apiKey,

  webhookSecret,
});