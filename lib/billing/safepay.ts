import { Safepay } from "@sfpy/node-sdk";

const apiKey = process.env.SAFEPAY_SECRET_KEY;

if (!apiKey) {
  throw new Error("SAFEPAY_SECRET_KEY is missing.");
}

const environment =
  process.env.SAFEPAY_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";

export const safepay = new Safepay({
  environment,
  apiKey,
});