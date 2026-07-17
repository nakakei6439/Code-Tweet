import Stripe from "stripe";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditPack } from "@/lib/creditPacks";
import { grantCredits } from "@/lib/credits";
import { getMissingStripeWebhookEnv, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function periodEndOf(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

function tierOf(subscription: Stripe.Subscription) {
  return subscription.status === "active" || subscription.status === "trialing" ? "paid" : "free";
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription, fallbackUserId?: string | null) {
  const customerId = idOf(subscription.customer);
  const admin = createAdminClient();
  let userId = subscription.metadata.user_id || fallbackUserId;

  if (!userId) {
    const { data, error } = await admin
      .from("subscriptions")
      .select("user_id")
      .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
      .maybeSingle();

    if (error) {
      logError("stripe/webhook", "subscription lookup error", error, {
        subscriptionId: subscription.id,
        customerId,
      });
      throw error;
    }

    userId = data?.user_id ?? null;
  }

  if (!userId || !customerId) {
    logError("stripe/webhook", "missing user or customer id", undefined, {
      subscriptionId: subscription.id,
      userId,
      customerId,
    });
    return;
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      tier: tierOf(subscription),
      current_period_end: periodEndOf(subscription),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    logError("stripe/webhook", "subscription upsert error", error, {
      subscriptionId: subscription.id,
      userId,
    });
    throw error;
  }
}

// クレジットパック購入（mode: 'payment'）の完了。パック定義から付与数を再解決し、
// event.id 単位の冪等 RPC で残高に加算する（リトライ二重発火でも二重付与しない）。
async function handleCreditPurchaseCompleted(eventId: string, session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const packId = session.metadata?.pack_id;
  const pack = packId ? getCreditPack(packId) : null;
  const userId = session.metadata?.user_id ?? session.client_reference_id;

  if (!pack || !userId) {
    logError("stripe/webhook", "credit purchase missing pack or user", undefined, {
      sessionId: session.id,
      packId,
      userId,
    });
    return;
  }

  await grantCredits(eventId, userId, pack.credits, session.id);
}

async function handleCheckoutCompleted(eventId: string, session: Stripe.Checkout.Session) {
  if (session.mode === "payment") {
    await handleCreditPurchaseCompleted(eventId, session);
    return;
  }

  const subscriptionId = idOf(session.subscription);
  if (!subscriptionId) return;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe(subscription, session.client_reference_id ?? session.metadata?.user_id);
}

export async function POST(request: Request) {
  const missingEnv = getMissingStripeWebhookEnv();
  if (missingEnv.length > 0) {
    logError("stripe/webhook", "missing env", undefined, { missingEnv });
    return Response.json({ error: "Webhook configuration is missing." }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return Response.json({ error: "Webhook configuration is missing." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    logError("stripe/webhook", "signature verification failed", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.id, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    logError("stripe/webhook", "handler error", err, { eventType: event.type, eventId: event.id });
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
