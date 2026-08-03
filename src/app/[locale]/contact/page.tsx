import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import StripePortalCard from "@/components/StripePortalCard";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionTier } from "@/lib/subscription";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contactPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contactPage");
  // 解約カードはサブスクリプション契約者にのみ表示する（新規販売停止済みの旧 Pro 向け）。
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isSubscriber = user ? (await getSubscriptionTier(user.id)) === "paid" : false;

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Contact
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          {t("heading")}
        </h1>
        <p className="mt-6 text-sm leading-7 text-gray-400">
          {t("lead")}
        </p>

        <hr className="my-12 border-gray-800" />

        <div className="space-y-4">
          {isSubscriber && <StripePortalCard />}
          <a
            href="https://x.com/nakakei6439"
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-gray-800 bg-gray-900/70 p-5 transition-colors hover:border-gray-700 hover:bg-gray-900"
          >
            <p className="text-sm font-semibold text-white">{t("xTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {t("xBody")}
            </p>
          </a>
          <a
            href="https://github.com/nakakei6439/Code-Tweet"
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-gray-800 bg-gray-900/70 p-5 transition-colors hover:border-gray-700 hover:bg-gray-900"
          >
            <p className="text-sm font-semibold text-white">{t("githubTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {t("githubBody")}
            </p>
          </a>
        </div>
      </article>
    </main>
  );
}
