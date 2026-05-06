import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import GenerateForm from "@/components/GenerateForm";
import AuthOverlay from "@/components/AuthOverlay";
import { hashIp } from "@/lib/rateLimit";
import { getGuestUsage, getUserUsage } from "@/lib/usage";
import type { UsageInfo } from "@/types/usage";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

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
    <main className="min-h-screen bg-gray-950 relative px-4 py-16">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          あなたの{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 bg-clip-text text-transparent">
            README
          </span>{" "}
          がポストに変わる
        </h1>
        <p className="text-gray-400 text-center mb-10">
          AIがプロジェクトを分析して5件のマーケティングポストを自動生成
        </p>

        {!isAuthenticated && <AuthOverlay />}
        <GenerateForm initialUsage={initialUsage} />
      </div>
    </main>
  );
}
