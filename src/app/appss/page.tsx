import { headers } from "next/headers";
import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Zen_Maru_Gothic } from "next/font/google";
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

export const metadata: Metadata = {
  title: "AppSS — App Store スクショ作成",
  description:
    "アプリのスクリーンショットから App Store 提出用のマーケティング画像をブラウザだけで作成。AIキャッチコピー生成付き。画像はサーバーに送信されません。",
};

export default async function AppSSPage() {
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
    <main className={`min-h-screen bg-gray-950 ${gothic.variable} ${maru.variable} ${mincho.variable}`}>
      <AppSSEditor isLoggedIn={!!user} initialUsage={initialUsage} />
    </main>
  );
}
