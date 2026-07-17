import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlements";
import { isAdminEmail } from "@/lib/admin";
import HeaderActions from "@/components/HeaderActions";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ヘッダーの表示 tier は perk 判定（サブスク / 管理者 / クレジット残高あり）。
  const tier = user
    ? (await getEntitlements(user.id, user.email)).perkTier === "paid"
      ? ("paid" as const)
      : ("free" as const)
    : null;
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header className="w-full border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="flex-1 flex justify-start min-w-0">
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-300">
            <Link href="/about" className="transition-colors hover:text-white">
              Code Tweetとは
            </Link>
            <Link href="/about/note" className="transition-colors hover:text-white">
              note Draftとは
            </Link>
            <Link href="/appss" className="transition-colors hover:text-white">
              スクショ作成
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-white">
              プラン
            </Link>
          </nav>
        </div>
        <Link href="/" className="shrink-0 text-white font-semibold tracking-tight">
          Code{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            Tweet
          </span>
        </Link>
        <div className="flex-1 flex justify-end min-w-0">
          <HeaderActions
            isAuthenticated={!!user}
            email={user?.email ?? null}
            tier={tier}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </header>
  );
}
