import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CREDIT_PACKS } from "@/lib/creditPacks";
import { PROJECT_TEXT_LIMITS } from "@/lib/generateLimits";
import { TWEET_GENERATION_HISTORY_LIMIT } from "@/lib/generationHistory";
import { USER_FREE_MONTHLY_LIMIT } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionTier } from "@/lib/subscription";
import GitHubLoginButton from "@/components/GitHubLoginButton";
import StripeActionButton from "@/components/StripeActionButton";
import { getMissingStripeCreditsEnv } from "@/lib/stripe";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricingPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricingPage");
  const format = (value: number) => value.toLocaleString(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const isSubscriber = user ? (await getSubscriptionTier(user.id)) === "paid" : false;
  const stripeReady = getMissingStripeCreditsEnv().length === 0;

  // クレジット購入で解放される機能（旧 Pro 特典）。
  const creditPerks = [
    t("perkReadmeLimit", {
      paid: format(PROJECT_TEXT_LIMITS.paid),
      free: format(PROJECT_TEXT_LIMITS.free),
    }),
    t("perkHistory", { limit: TWEET_GENERATION_HISTORY_LIMIT }),
    t("perkPrivateRepo"),
    t("perkNoExpiry"),
  ];

  const freeFeatures = [
    t("freeFeature1", { free: USER_FREE_MONTHLY_LIMIT }),
    t("freeFeature2"),
    t("freeFeature3"),
    t("freeFeature4"),
    t("freeFeature5"),
  ];

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-16 text-gray-200">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Pricing · Pay as you go
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
            {t("headlineLine1")}
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
              {t("headlineLine2")}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
            {t("lead", { free: USER_FREE_MONTHLY_LIMIT })}
          </p>
        </header>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {/* 無料プラン */}
          <div className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-base font-bold text-white">{t("freePlan")}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">¥0</span>
            </div>
            <p className="mt-1 text-xs text-emerald-300">
              {t("freeQuota", { free: USER_FREE_MONTHLY_LIMIT })}
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-xs leading-5 text-gray-300">
              {freeFeatures.map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-emerald-300">✓</span>
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isAuthenticated ? (
                <button
                  disabled
                  className="w-full cursor-default rounded-lg border border-emerald-800/70 bg-emerald-950/30 px-4 py-2 text-xs font-semibold text-emerald-200"
                >
                  {t("inUse")}
                </button>
              ) : (
                <GitHubLoginButton
                  next="/"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                >
                  {t("loginToUse")}
                </GitHubLoginButton>
              )}
            </div>
          </div>

          {/* クレジットパック */}
          {CREDIT_PACKS.map((pack, index) => {
            const perUse = Math.round((pack.amountJpy / pack.credits) * 10) / 10;
            const isBestValue = index === CREDIT_PACKS.length - 1;
            return (
              <div
                key={pack.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  isBestValue
                    ? "border-fuchsia-700/60 bg-gray-900/80 shadow-lg shadow-fuchsia-500/10"
                    : "border-gray-800 bg-gray-900/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {t("packName", { credits: pack.credits })}
                  </h2>
                  {isBestValue && (
                    <span className="rounded-full border border-fuchsia-700/60 bg-fuchsia-950/40 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200">
                      {t("bestValue")}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">
                    ¥{format(pack.amountJpy)}
                  </span>
                  <span className="text-xs text-gray-400">{t("oneTime")}</span>
                </div>
                <p className="mt-1 text-xs text-emerald-300">
                  {t("packQuota", { credits: pack.credits, perUse })}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-xs leading-5 text-gray-300">
                  {creditPerks.map((label) => (
                    <li key={label} className="flex items-start gap-2">
                      <span aria-hidden className="mt-0.5 text-emerald-300">✓</span>
                      {label}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {!stripeReady ? (
                    <button
                      disabled
                      title={t("comingSoonTitle")}
                      className="w-full cursor-not-allowed rounded-lg border border-gray-800 px-4 py-2 text-xs font-semibold text-gray-500"
                    >
                      {t("comingSoon")}
                    </button>
                  ) : isAuthenticated ? (
                    <StripeActionButton
                      action="credits"
                      packId={pack.id}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                    >
                      {t("buyPack", { credits: pack.credits })}
                    </StripeActionButton>
                  ) : (
                    <GitHubLoginButton
                      next="/pricing"
                      className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-950 transition-colors hover:bg-gray-100"
                    >
                      {t("loginToBuy")}
                    </GitHubLoginButton>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <p className="mt-8 text-center text-xs text-gray-500">
          {t("guestNote", { guest: format(PROJECT_TEXT_LIMITS.guest) })}
        </p>
        <p className="mt-3 text-center text-[11px] text-gray-500">
          {t("creditNote")}
          {isSubscriber && (
            <>
              <br />
              {t("subscriberNotePrefix")}
              <Link href="/settings" className="mx-1 underline hover:text-gray-300">
                {t("subscriberNoteLink")}
              </Link>
              {t("subscriberNoteSuffix")}
            </>
          )}
        </p>
      </div>
    </main>
  );
}
