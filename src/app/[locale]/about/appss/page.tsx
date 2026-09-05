import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutAppssPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const STEP_KEYS = ["step1", "step2", "step3"] as const;
const FEATURE_KEYS = [
  "feature1",
  "feature2",
  "feature3",
  "feature4",
  "feature5",
  "feature6",
] as const;
const DEMOS = [
  { src: "/appss/demo/01.jpg", altKey: "demoAlt1" },
  { src: "/appss/demo/02.jpg", altKey: "demoAlt2" },
  { src: "/appss/demo/03.jpg", altKey: "demoAlt3" },
] as const;

export default async function AppSSAboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutAppssPage");
  const tAbout = await getTranslations("aboutPage");

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-200">
      <article className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          App{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            SS
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
            href="/?tab=appss"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
          >
            {t("ctaCreate")}
          </Link>
          <Link
            href="/appss"
            className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            {t("ctaEditor")}
          </Link>
        </div>

        <hr className="my-16 border-gray-800" />

        {/* ── “広告”の価値訴求（このページの肝） ── */}
        <section className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-b from-fuchsia-500/10 to-transparent p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
            {t("whyLabel")}
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-white">
            {t("whyHeadingLine1")}
            <br />
            {t("whyHeadingLine2Before")}
            <span className="text-fuchsia-300">{t("whyHeadingEmphasis")}</span>
            {t("whyHeadingLine2After")}
          </h2>
          <p className="mt-4 text-sm leading-7 text-gray-300">{t("whyBody1")}</p>
          <p className="mt-3 text-sm leading-7 text-gray-300">{t("whyBody2")}</p>
        </section>

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

        {/* ── 出力サンプル（デモ） ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {tAbout("sectionSample")}
          </h2>
          <p className="mt-3 text-xs leading-6 text-gray-500">{t("sampleLead")}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            {DEMOS.map((d) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={d.src}
                src={d.src}
                alt={t(d.altKey)}
                className="w-full rounded-xl border border-gray-800 bg-gray-900"
                loading="lazy"
              />
            ))}
          </div>
        </section>

        <hr className="my-16 border-gray-800" />

        <section id="features">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t("sectionFeatures")}
          </h2>
          <ul className="mt-6 space-y-4">
            {FEATURE_KEYS.map((key) => (
              <li key={key} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                <p className="text-sm font-semibold text-white">{t(`${key}Title`)}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{t(`${key}Body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <hr className="my-16 border-gray-800" />

        {/* ── 参考元・クレジット ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t("sectionCredits")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            {t("creditsBody1Before")}{" "}
            <a
              href="https://github.com/ParthJadhav/app-store-screenshots"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200"
            >
              ParthJadhav/app-store-screenshots
            </a>{" "}
            {t("creditsBody1After")}
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            {t("creditsBody2Before")} {t("creditsBody2After")}
          </p>
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
