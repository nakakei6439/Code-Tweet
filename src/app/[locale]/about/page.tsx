import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const STEP_KEYS = ["step1", "step2", "step3"] as const;
const FEATURE_KEYS = ["feature1", "feature2", "feature3", "feature4", "feature5"] as const;

// 出力サンプルの投稿日時。実際の生成物ではなく固定の見本なので翻訳対象外。
const SAMPLE_TIME_LABEL = "2026-05-13 20:30";
const SAMPLE_WEIGHTED_LENGTH = 119;

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutPage");

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Code{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            Tweet
          </span>
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          {t("headlineLine1")}
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            {t("headlineLine2")}
          </span>
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-400">{t("lead")}</p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            {t("ctaOpen")}
          </Link>
          <a
            href="#steps"
            className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            {t("ctaHowTo")}
          </a>
        </div>

        <hr className="my-16 border-gray-800" />

        <section id="steps">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t("sectionHowTo")}
          </h2>
          <ol className="mt-6 space-y-10">
            {STEP_KEYS.map((key, index) => (
              <li key={key} className="grid grid-cols-[44px_1fr] gap-5">
                <span className="text-4xl font-light leading-none text-gray-700">
                  {index + 1}
                </span>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-white">{t(`${key}Title`)}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-400">{t(`${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3 text-xs leading-6 text-gray-400">
            {t("stepsHint")}
          </p>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t("sectionFeatures")}
          </h2>
          <ul className="mt-6 space-y-3">
            {FEATURE_KEYS.map((key) => (
              <li
                key={key}
                className="flex gap-3 border-b border-gray-800 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-gray-600">·</span>
                <div>
                  <p className="text-sm font-medium text-white">{t(`${key}Title`)}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-400">{t(`${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t("sectionSample")}
          </h2>
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0 text-cyan-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 6v6l4 2" />
                </svg>
                <span className="text-sm font-medium text-gray-200">{SAMPLE_TIME_LABEL}</span>
              </div>
              <span className="text-xs text-gray-400">{SAMPLE_WEIGHTED_LENGTH}/280</span>
            </div>
            <p className="mb-3 text-xs text-gray-400">{t("sampleReason")}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
              {t("sampleText")}
            </p>
          </div>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t("sectionQuota")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">{t("quotaBody")}</p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex items-center gap-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            {t("quotaCta")}
          </Link>
        </section>
      </article>
    </main>
  );
}
