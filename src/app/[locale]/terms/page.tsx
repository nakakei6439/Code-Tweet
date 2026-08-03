import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "termsPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

// 9 は「規約の言語」条項。多言語で契約文書を出す以上、正文がどれかを明示する必要がある。
const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"] as const;

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("termsPage");

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Terms
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          {t("heading")}
        </h1>
        <p className="mt-6 text-sm leading-7 text-gray-400">{t("lead")}</p>

        <hr className="my-12 border-gray-800" />

        <div className="space-y-10">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-white">{t(`${key}Title`)}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-400">{t(`${key}Body`)}</p>
            </section>
          ))}
        </div>

        <hr className="my-12 border-gray-800" />

        <Link
          href="/contact"
          className="inline-flex rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
        >
          {t("contactCta")}
        </Link>
      </article>
    </main>
  );
}
