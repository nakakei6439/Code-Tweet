import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import UnifiedGenerateForm from "@/components/UnifiedGenerateForm";
import type { GenerateTabKey } from "@/components/GenerateTabs";
import { hashIp } from "@/lib/rateLimit";
import { getGuestUsage, getUserUsage } from "@/lib/usage";
import type { UsageInfo } from "@/types/usage";

export const metadata: Metadata = {
  title: "READMEをポスト / note Draftに変換",
  description: "GitHubリポジトリやプロジェクト説明から、Xのポストとnote.comの紹介記事Draftを1ページで生成できます。",
};

type SearchParams = Promise<{ tab?: string | string[] }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab: GenerateTabKey = tabParam === "note" ? "note" : "tweet";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialUsage: UsageInfo | null = null;
  if (user) {
    initialUsage = await getUserUsage(user.id);
  } else {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    if (ip) {
      initialUsage = await getGuestUsage(hashIp(ip));
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 relative px-4 py-20 sm:py-28">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <Suspense fallback={null}>
          <UnifiedGenerateForm initialUsage={initialUsage} initialTab={initialTab} />
        </Suspense>
      </div>
    </main>
  );
}
