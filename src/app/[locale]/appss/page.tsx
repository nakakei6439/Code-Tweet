import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import {
  Dela_Gothic_One,
  Klee_One,
  M_PLUS_Rounded_1c,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Sans_TC,
  Noto_Serif_JP,
  Noto_Serif_KR,
  Noto_Serif_SC,
  Noto_Serif_TC,
  RocknRoll_One,
  Shippori_Mincho,
  Zen_Kaku_Gothic_New,
  Zen_Maru_Gothic,
} from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { hashIp } from "@/lib/rateLimit";
import { getGuestUsage, getUserUsage } from "@/lib/usage";
import type { UsageInfo } from "@/types/usage";
import { AppSSEditor } from "@/components/appss/AppSSEditor";

// エディタ・書き出し PNG の両方で使うフォント。
// next/font は同一オリジンの woff2 として self-host されるため、
// html-to-image のフォント埋め込みが CORS で失敗しない。
//
// subsets に "latin" しか指定していないが、CJK のグリフは Google Fonts が
// unicode-range で分割配信するため必要な字だけ取得される（日本語も同じ仕組み）。
// 簡体字・繁体字・韓国語のフォントを当てないと、その言語のスライドが
// 豆腐（□）になるので、言語ごとに専用フォントを用意する。
const gothic = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-appss-gothic",
  display: "swap",
});
const maru = Zen_Maru_Gothic({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-maru",
  display: "swap",
});
const mincho = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-appss-mincho",
  display: "swap",
});
const rounded = M_PLUS_Rounded_1c({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-rounded",
  display: "swap",
});
const dela = Dela_Gothic_One({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-appss-dela",
  display: "swap",
});
const shippori = Shippori_Mincho({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  variable: "--font-appss-shippori",
  display: "swap",
});
const klee = Klee_One({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-appss-klee",
  display: "swap",
});
const rocknroll = RocknRoll_One({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-appss-rocknroll",
  display: "swap",
});
const kaku = Zen_Kaku_Gothic_New({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-kaku",
  display: "swap",
});

// ---------- 簡体字中国語 ----------
const scSans = Noto_Sans_SC({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-sc-sans",
  display: "swap",
});
const scSerif = Noto_Serif_SC({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-sc-serif",
  display: "swap",
});

// ---------- 繁体字中国語 ----------
const tcSans = Noto_Sans_TC({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-tc-sans",
  display: "swap",
});
const tcSerif = Noto_Serif_TC({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-tc-serif",
  display: "swap",
});

// ---------- 韓国語 ----------
const krSans = Noto_Sans_KR({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-kr-sans",
  display: "swap",
});
const krSerif = Noto_Serif_KR({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-appss-kr-serif",
  display: "swap",
});

// 全フォントの CSS 変数をルートに流し込む。書き出し時のオフスクリーン描画でも
// 同じ変数を参照するため、言語を問わず 1 箇所にまとめておく。
const FONT_VARIABLES = [
  gothic, maru, mincho, rounded, dela, shippori, klee, rocknroll, kaku,
  scSans, scSerif, tcSans, tcSerif, krSans, krSerif,
].map((f) => f.variable).join(" ");

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "appssPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function AppSSPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialUsage: UsageInfo | null = null;
  if (user) {
    initialUsage = await getUserUsage(user.id, user.email);
  } else {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    if (ip) {
      initialUsage = await getGuestUsage(hashIp(ip));
    }
  }

  return (
    <main
      className={`min-h-screen bg-gray-950 ${FONT_VARIABLES}`}
    >
      <AppSSEditor isLoggedIn={!!user} initialUsage={initialUsage} />
    </main>
  );
}
