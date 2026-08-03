import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import FunnelAnalytics from "@/components/FunnelAnalytics";
import { routing } from "@/i18n/routing";
import { DEFAULT_LOCALE, LOCALES, LOCALE_IDS, type LocaleId } from "@/lib/locales";

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const SITE_URL = "https://code-tweet.vercel.app";

export function generateStaticParams() {
  return LOCALE_IDS.map((locale) => ({ locale }));
}

/** 既定ロケールは接頭辞なし（/about）、他は /en/about のような絶対 URL を返す。 */
function localizedUrl(locale: LocaleId, pathname = "/"): string {
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const path = pathname === "/" ? "" : pathname;
  return `${SITE_URL}${prefix}${path}` || SITE_URL;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta" });
  const description = t("description");

  // hreflang。next-intl は Link ヘッダでも出すが、HTML 側にも明示して取りこぼしを防ぐ。
  const languages = Object.fromEntries(
    LOCALE_IDS.map((id) => [LOCALES[id].bcp47, localizedUrl(id)]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Code Tweet",
      template: "%s | Code Tweet",
    },
    description,
    alternates: {
      canonical: localizedUrl(locale),
      languages: { ...languages, "x-default": localizedUrl(DEFAULT_LOCALE) },
    },
    openGraph: {
      title: "Code Tweet",
      description,
      url: localizedUrl(locale),
      siteName: "Code Tweet",
      locale: LOCALES[locale].ogpLocale,
      alternateLocale: LOCALE_IDS.filter((id) => id !== locale).map((id) => LOCALES[id].ogpLocale),
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Code Tweet",
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // 静的レンダリングを有効にするために必要（これが無いと全ページ動的になる）。
  setRequestLocale(locale);

  return (
    <html lang={LOCALES[locale].bcp47} className="h-full">
      <body className="min-h-full flex flex-col bg-gray-950">
        <NextIntlClientProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
        <MicrosoftClarity />
        {gaId && <GoogleAnalytics gaId={gaId} />}
        {gaId && <FunnelAnalytics />}
      </body>
    </html>
  );
}
