import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, toLocaleId, type LocaleId } from "@/lib/locales";
import { apiError } from "@/lib/apiErrors";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditPack } from "@/lib/creditPacks";
import { getAppUrl, getMissingStripeCreditsEnv, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe Checkout がサポートするロケールへの対応表。
// 簡体字は "zh"、繁体字は Stripe 側に該当が無いので最も近い "zh-TW" を当てる。
type CheckoutLocale = NonNullable<
  Parameters<ReturnType<typeof getStripe>["checkout"]["sessions"]["create"]>[0]
>["locale"];

const STRIPE_LOCALES: Record<LocaleId, CheckoutLocale> = {
  ja: "ja",
  en: "en",
  es: "es",
  "zh-Hans": "zh",
  "zh-Hant": "zh-TW",
  fr: "fr",
  de: "de",
  ko: "ko",
};

// クレジットパック（単発課金）の Stripe Checkout Session を作成する。
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("login_required", 401);
  }

  const missingEnv = getMissingStripeCreditsEnv();
  if (missingEnv.length > 0) {
    logError("stripe/credits", "missing env", undefined, { missingEnv });
    return apiError("stripe_not_configured", 503);
  }

  let packId: string | undefined;
  let locale = DEFAULT_LOCALE;
  try {
    const body = (await request.json()) as { packId?: string; locale?: string };
    packId = body.packId;
    // クライアント申告の locale は信用せず、既知のロケールに丸める。
    locale = toLocaleId(body.locale);
  } catch {
    return apiError("invalid_request", 400);
  }

  const pack = packId ? getCreditPack(packId) : null;
  if (!pack) {
    return apiError("pack_not_found", 400);
  }

  const t = await getTranslations({ locale, namespace: "stripeProduct" });
  const appUrl = getAppUrl(request.url);
  const admin = createAdminClient();
  const { data: subscriptionRow, error } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logError("stripe/credits", "subscription fetch error", error, { userId: user.id });
    return apiError("plan_fetch_failed", 500);
  }

  try {
    const stripe = getStripe();
    const customer = subscriptionRow?.stripe_customer_id
      ? { customer: subscriptionRow.stripe_customer_id }
      : { customer_email: user.email ?? undefined };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Stripe のホスト決済ページ自体もユーザーの言語にする（未対応なら Stripe 側で自動判定）。
      locale: STRIPE_LOCALES[locale],
      ...customer,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            unit_amount: pack.amountJpy, // 円はゼロ小数通貨（¥300 → 300）
            // 商品名は購入時の言語で作る。決済記録・領収書にはこの名前が残るため、
            // 集計は言語に依存しない metadata.pack_id 側で行うこと。
            product_data: {
              name: t("creditPack", { credits: pack.credits }),
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
    return apiError("checkout_failed", 500);
  }
}
