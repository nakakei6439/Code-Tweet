import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutNotePage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const STEP_KEYS = ["step1", "step2", "step3"] as const;
const QUALITY_KEYS = ["quality1", "quality2", "quality3", "quality4"] as const;

export default async function NoteAboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutNotePage");
  const tAbout = await getTranslations("aboutPage");

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          note{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            Draft
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

        {/* Code Tweet・App SS は 8 言語で生成できるため、note だけ日本語固定である理由まで書く。 */}
        <p className="mt-4 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 text-sm leading-6 text-gray-400">
          {t("japaneseOnly")}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/?tab=note"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            {tAbout("ctaOpen")}
          </Link>
          <a
            href="#quality"
            className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            {t("ctaQuality")}
          </a>
        </div>

        <hr className="my-16 border-gray-800" />

        <section id="steps">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {tAbout("sectionHowTo")}
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
        </section>

        <hr className="my-16 border-gray-800" />

        <section id="quality">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t("sectionQuality")}
          </h2>
          <p className="mt-3 text-xs leading-6 text-gray-500">{t("qualityLead")}</p>
          <ul className="mt-6 space-y-4">
            {QUALITY_KEYS.map((key) => (
              <li key={key} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                <p className="text-sm font-semibold text-white">{t(`${key}Title`)}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{t(`${key}Body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {tAbout("sectionSample")}
          </h2>
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base font-semibold leading-tight text-white">
                {t("sampleTitle")}
              </p>
              <span className="shrink-0 text-xs text-gray-400">{t("sampleCharCount")}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">
              {t("sampleBody")}
            </p>
          </div>
        </section>

        <hr className="my-16 border-gray-800" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {tAbout("sectionQuota")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">{t("quotaBody")}</p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex items-center gap-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            {tAbout("quotaCta")}
          </Link>
        </section>
      </article>
    </main>
  );
}
