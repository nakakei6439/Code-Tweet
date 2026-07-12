import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import FunnelAnalytics from "@/components/FunnelAnalytics";

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://code-tweet.vercel.app"),
  title: {
    default: "Code Tweet",
    template: "%s | Code Tweet",
  },
  description: "READMEやGitHubリポジトリからX向けマーケティングポストを生成する個人開発者向けAIツール",
  openGraph: {
    title: "Code Tweet",
    description: "READMEやGitHubリポジトリからX向けマーケティングポストを生成する個人開発者向けAIツール",
    url: "https://code-tweet.vercel.app",
    siteName: "Code Tweet",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Code Tweet",
    description: "READMEやGitHubリポジトリからX向けマーケティングポストを生成する個人開発者向けAIツール",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-950">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <Analytics />
        <SpeedInsights />
        <MicrosoftClarity />
        {gaId && <GoogleAnalytics gaId={gaId} />}
        {gaId && <FunnelAnalytics />}
      </body>
    </html>
  );
}
