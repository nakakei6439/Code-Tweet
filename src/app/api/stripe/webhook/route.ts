import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
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
      console.error("[stripe/webhook] subscription lookup error:", error);
      throw error;
    }

    userId = data?.user_id ?? null;
  }

  if (!userId || !customerId) {
    console.error("[stripe/webhook] missing user or customer id", {
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
    console.error("[stripe/webhook] subscription upsert error:", error);
    throw error;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = idOf(session.subscription);
  if (!subscriptionId) return;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe(subscription, session.client_reference_id ?? session.metadata?.user_id);
}

export async function POST(request: Request) {
  const missingEnv = getMissingStripeWebhookEnv();
  if (missingEnv.length > 0) {
    console.error("[stripe/webhook] missing env:", missingEnv.join(", "));
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
    console.error("[stripe/webhook] signature verification failed:", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
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
    console.error("[stripe/webhook] handler error:", err);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
