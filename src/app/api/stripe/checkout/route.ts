import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl, getMissingStripeCheckoutEnv, getStripe, getStripePriceId } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const missingEnv = getMissingStripeCheckoutEnv();
  if (missingEnv.length > 0) {
    logError("stripe/checkout", "missing env", undefined, { missingEnv });
    return Response.json(
      { error: "Stripe の環境変数が未設定です。STRIPE_SECRET_KEY と STRIPE_PRICE_ID を設定してください。" },
      { status: 503 },
    );
  }

  const appUrl = getAppUrl(request.url);
  const admin = createAdminClient();
  const { data: subscriptionRow, error } = await admin
    .from("subscriptions")
    .select("stripe_customer_id, tier")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logError("stripe/checkout", "subscription fetch error", error, { userId: user.id });
    return Response.json({ error: "プラン情報の取得に失敗しました。" }, { status: 500 });
  }

  if (subscriptionRow?.tier === "paid") {
    return Response.json({ error: "すでに Pro プランです。" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const customer = subscriptionRow?.stripe_customer_id
      ? { customer: subscriptionRow.stripe_customer_id }
      : { customer_email: user.email ?? undefined };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...customer,
      client_reference_id: user.id,
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    logError("stripe/checkout", "session create error", err, { userId: user.id });
    return Response.json({ error: "決済ページの作成に失敗しました。" }, { status: 500 });
  }
}
