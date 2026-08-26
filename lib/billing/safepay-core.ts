import Safepay from "@sfpy/node-core";

const secretKey = process.env.SAFEPAY_SECRET_KEY;

if (!secretKey) {
  throw new Error(
    "SAFEPAY_SECRET_KEY is not configured."
  );
}

const environment =
  process.env.SAFEPAY_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";

const host =
  environment === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";

export const safepayCore = new Safepay(
  secretKey,
  {
    authType: "secret",
    host,
  }
);