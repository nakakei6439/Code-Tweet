import { headers } from "next/headers";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import NoteGenerateForm from "@/components/NoteGenerateForm";
import { hashIp } from "@/lib/rateLimit";
import { getGuestUsage, getUserUsage } from "@/lib/usage";
import type { UsageInfo } from "@/types/usage";

export const metadata: Metadata = {
  title: "READMEからnote Draftを作る",
  description: "GitHubリポジトリやプロジェクト説明から、note.com にコピー＆ペーストできる紹介記事の Draft を生成します。",
};

export default async function NotePage() {
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
        <h1 className="text-center text-5xl font-medium tracking-tight text-white sm:text-7xl">
          note{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            Draft
          </span>
        </h1>
        <p className="mx-auto mt-5 mb-10 max-w-xl text-center text-sm leading-6 text-gray-300">
          <span className="block">GitHubリポジトリURLを貼るだけで、</span>
          <span className="block">note.com に貼り付けられるMarkdown Draftを1本生成します。</span>
        </p>
        <NoteGenerateForm initialUsage={initialUsage} />
      </div>
    </main>
  );
}
