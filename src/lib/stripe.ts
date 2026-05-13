import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID is not set");
  }
  return priceId;
}

export function getMissingStripeCheckoutEnv() {
  return ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID"].filter((key) => !process.env[key]);
}

export function getMissingStripeWebhookEnv() {
  return ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].filter((key) => !process.env[key]);
}

export function getAppUrl(requestUrl?: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return "http://localhost:3000";
}
