import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import {
  Dela_Gothic_One,
  Klee_One,
  M_PLUS_Rounded_1c,
  Noto_Sans_JP,
  Noto_Serif_JP,
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

// エディタ・書き出し PNG の両方で使う日本語フォント。
// next/font は同一オリジンの woff2 として self-host されるため、
// html-to-image のフォント埋め込みが CORS で失敗しない。
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
      className={`min-h-screen bg-gray-950 ${gothic.variable} ${maru.variable} ${mincho.variable} ${rounded.variable} ${dela.variable} ${shippori.variable} ${klee.variable} ${rocknroll.variable} ${kaku.variable}`}
    >
      <AppSSEditor isLoggedIn={!!user} initialUsage={initialUsage} />
    </main>
  );
}
