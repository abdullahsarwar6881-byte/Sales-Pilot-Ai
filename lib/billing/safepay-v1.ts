import { Safepay } from "@sfpy/node-sdk";
import { Environment } from "@sfpy/node-sdk/dist/utils";

const apiKey =
  process.env.SAFEPAY_PUBLIC_KEY;

const v1Secret =
  process.env.SAFEPAY_SECRET_KEY;

const webhookSecret =
  process.env.SAFEPAY_WEBHOOK_SECRET;

if (!apiKey) {
  throw new Error(
    "SAFEPAY_PUBLIC_KEY is not configured."
  );
}

if (!v1Secret) {
  throw new Error(
    "SAFEPAY_SECRET_KEY is not configured."
  );
}

if (!webhookSecret) {
  throw new Error(
    "SAFEPAY_WEBHOOK_SECRET is not configured."
  );
}

const environment =
  process.env.SAFEPAY_ENVIRONMENT === "production"
    ? Environment.Production
    : Environment.Sandbox;

export const safepayV1 =
  new Safepay({
    environment,

    apiKey,

    v1Secret,

    webhookSecret,
  });