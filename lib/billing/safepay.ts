import {
  Safepay,
} from "@sfpy/node-sdk";

import {
  Environment,
} from "@sfpy/node-sdk/dist/utils";

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
  process.env.SAFEPAY_API_KEY;

const v1Secret =
  process.env.SAFEPAY_V1_SECRET;

const webhookSecret =
  process.env.SAFEPAY_WEBHOOK_SECRET;

// =====================================================
// VALIDATION
// =====================================================

if (!apiKey) {
  throw new Error(
    "SAFEPAY_API_KEY is not configured."
  );
}

if (!v1Secret) {
  throw new Error(
    "SAFEPAY_V1_SECRET is not configured."
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

export const safepay =
  new Safepay({
    environment:
      safepayEnvironment,

    apiKey,

    v1Secret,

    webhookSecret,
  });