import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

// クレジットパックは price_data をインライン指定するため Price ID は不要。
export function getMissingStripeCreditsEnv() {
  return ["STRIPE_SECRET_KEY"].filter((key) => !process.env[key]);
}

// カスタマーポータル（解約・支払い管理）も SECRET のみで動く。
export function getMissingStripePortalEnv() {
  return ["STRIPE_SECRET_KEY"].filter((key) => !process.env[key]);
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
