import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl, getMissingStripePortalEnv, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const missingEnv = getMissingStripePortalEnv();
  if (missingEnv.length > 0) {
    logError("stripe/portal", "missing env", undefined, { missingEnv });
    return Response.json(
      { error: "Stripe の環境変数が未設定です。STRIPE_SECRET_KEY を設定してください。" },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logError("stripe/portal", "subscription fetch error", error, { userId: user.id });
    return Response.json({ error: "プラン情報の取得に失敗しました。" }, { status: 500 });
  }

  if (!data?.stripe_customer_id) {
    return Response.json({ error: "支払い情報が見つかりません。" }, { status: 404 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${getAppUrl(request.url)}/settings`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    logError("stripe/portal", "session create error", err, { userId: user.id });
    return Response.json({ error: "支払い管理ページの作成に失敗しました。" }, { status: 500 });
  }
}
