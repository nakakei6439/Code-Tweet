import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/entitlements";
import { PROJECT_TEXT_LIMITS } from "@/lib/generateLimits";
import { USER_FREE_MONTHLY_LIMIT, USER_PAID_MONTHLY_LIMIT } from "@/lib/rateLimit";
import AuthOverlay from "@/components/AuthOverlay";
import HomeLinkButton from "@/components/HomeLinkButton";
import SettingsForm from "@/components/SettingsForm";
import StripeActionButton from "@/components/StripeActionButton";
import { getMissingStripePortalEnv } from "@/lib/stripe";
import { isGithubAppConfigured } from "@/lib/githubApp";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settingsPage" });
  return { title: "Settings", description: t("metaDescription") };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settingsPage");
  const tp = await getTranslations("pricingPage");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">Settings</h1>
          <div aria-hidden="true" />
        </div>

        <p className="text-gray-400 text-sm mb-6">
          {t("loginRequired")}
        </p>
        <AuthOverlay />
      </main>
    );
  }

  const entitlements = await getEntitlements(user.id, user.email);
  // isSubscriber は Stripe サブスク契約の有無（解約導線・削除ブロック用）。
  // hasProAccess は perk 判定（サブスク / 管理者 / クレジット残高あり）。
  const isSubscriber = entitlements.subscriptionTier === "paid";
  const hasProAccess = entitlements.perkTier === "paid";
  const monthlyLimit =
    entitlements.quotaTier === "paid" ? USER_PAID_MONTHLY_LIMIT : USER_FREE_MONTHLY_LIMIT;
  const stripeReady = getMissingStripePortalEnv().length === 0;

  const admin = createAdminClient();
  const { data } = await admin
    .from("github_app_installations")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const appConfigured = isGithubAppConfigured();

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <HomeLinkButton className="justify-self-start" />
        <h1 className="text-center text-2xl font-bold text-white">Settings</h1>
        <div aria-hidden="true" />
      </div>

      <div className="mb-6 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">{t("usage")}</p>
          <p className="text-white text-lg font-bold">
            {t("usageValue", { limit: monthlyLimit, credits: entitlements.creditBalance.toLocaleString(locale) })}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {t("usageNote")}
          </p>
          {hasProAccess ? (
            <p className="text-emerald-300/90 text-xs mt-1">
              {t("perks", { limit: PROJECT_TEXT_LIMITS.paid.toLocaleString(locale) })}
            </p>
          ) : (
            <p className="text-gray-400 text-xs mt-1">
              {t("freeLimits", { limit: PROJECT_TEXT_LIMITS.free.toLocaleString(locale), paid: PROJECT_TEXT_LIMITS.paid.toLocaleString(locale) })}
            </p>
          )}
        </div>
        <Link
          href="/pricing"
          className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer
            bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400
            text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
        >
          {t("buyCredits")}
        </Link>
      </div>

      {isSubscriber && (
        <div className="mb-6 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">{t("subscription")}</p>
            <p className="text-white text-lg font-bold flex items-center gap-2">
              Pro
              <span className="text-xs font-medium text-fuchsia-400 bg-fuchsia-950/50 border border-fuchsia-800 px-2 py-0.5 rounded-full">
                {t("subscriptionPrice")}
              </span>
            </p>
            <p className="text-gray-400 text-xs mt-1">{t("subscriptionNote")}</p>
          </div>
          {stripeReady ? (
            <StripeActionButton
              action="portal"
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium border border-gray-700 text-gray-100 transition-colors hover:border-gray-600 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("manageBilling")}
            </StripeActionButton>
          ) : (
            <button
              disabled
              title={tp("comingSoonTitle")}
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium border border-gray-700 text-gray-500 cursor-not-allowed"
            >
              {t("manageBilling")}
            </button>
          )}
        </div>
      )}

      <SettingsForm
        isConnected={!!data}
        hasProAccess={hasProAccess}
        hasActiveSubscription={isSubscriber}
        appConfigured={appConfigured}
      />
    </main>
  );
}
