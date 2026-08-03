import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTweetGenerations, TWEET_GENERATION_HISTORY_LIMIT } from "@/lib/generationHistory";
import { hasProAccess } from "@/lib/entitlements";
import AuthOverlay from "@/components/AuthOverlay";
import HomeLinkButton from "@/components/HomeLinkButton";
import HistoryList from "./HistoryList";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "historyPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function HistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("historyPage");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">{t("heading")}</h1>
          <div aria-hidden="true" />
        </div>
        <p className="mb-6 text-sm text-gray-400">
          {t("loginRequired")}
        </p>
        <AuthOverlay />
      </main>
    );
  }

  const canUseHistory = await hasProAccess(user.id, user.email);
  if (!canUseHistory) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">{t("heading")}</h1>
          <div aria-hidden="true" />
        </div>
        <section className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8 text-center">
          <p className="text-base font-semibold text-white">{t("paidOnlyTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {t("paidOnlyBody", { limit: TWEET_GENERATION_HISTORY_LIMIT })}
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            {t("viewPacks")}
          </Link>
        </section>
      </main>
    );
  }

  const historyResult = await listTweetGenerations(user.id);
  const histories = historyResult.records;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <HomeLinkButton className="justify-self-start" />
        <h1 className="text-center text-2xl font-bold text-white">{t("heading")}</h1>
        <div aria-hidden="true" />
      </div>
      <p className="mb-6 text-center text-xs text-gray-500">
        {t("limitNote", { limit: TWEET_GENERATION_HISTORY_LIMIT })}
      </p>

      <HistoryList histories={historyResult.ok ? histories : []} />
    </main>
  );
}
