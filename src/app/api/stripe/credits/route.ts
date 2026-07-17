import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditPack } from "@/lib/creditPacks";
import { getAppUrl, getMissingStripeCreditsEnv, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// クレジットパック（単発課金）の Stripe Checkout Session を作成する。
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const missingEnv = getMissingStripeCreditsEnv();
  if (missingEnv.length > 0) {
    logError("stripe/credits", "missing env", undefined, { missingEnv });
    return Response.json(
      { error: "Stripe の環境変数が未設定です。STRIPE_SECRET_KEY を設定してください。" },
      { status: 503 },
    );
  }

  let packId: string | undefined;
  try {
    const body = (await request.json()) as { packId?: string };
    packId = body.packId;
  } catch {
    return Response.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const pack = packId ? getCreditPack(packId) : null;
  if (!pack) {
    return Response.json({ error: "指定されたパックが見つかりません。" }, { status: 400 });
  }

  const appUrl = getAppUrl(request.url);
  const admin = createAdminClient();
  const { data: subscriptionRow, error } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logError("stripe/credits", "subscription fetch error", error, { userId: user.id });
    return Response.json({ error: "プラン情報の取得に失敗しました。" }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const customer = subscriptionRow?.stripe_customer_id
      ? { customer: subscriptionRow.stripe_customer_id }
      : { customer_email: user.email ?? undefined };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...customer,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            unit_amount: pack.amountJpy, // 円はゼロ小数通貨（¥300 → 300）
            product_data: {
              name: `Code Tweet クレジット ${pack.name}（生成${pack.credits}回分）`,
            },
          },
          quantity: 1,
        },
      ],
      // pack_id は webhook 側でパック定義から付与数を再解決するために使う。
      metadata: { user_id: user.id, pack_id: pack.id },
      // session_id はファネル用 purchase イベントの二重送信ガードに使う（Stripe が実値に置換）。
      success_url: `${appUrl}/settings?checkout=success&type=credits&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    logError("stripe/credits", "session create error", err, { userId: user.id, packId: pack.id });
    return Response.json({ error: "決済ページの作成に失敗しました。" }, { status: 500 });
  }
}
