import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionTier } from "@/lib/subscription";
import { isAdminEmail } from "@/lib/admin";
import HeaderActions from "@/components/HeaderActions";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tier = user ? await getSubscriptionTier(user.id) : null;
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header className="w-full border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="px-4 py-3 relative flex items-center justify-center">
        <nav className="absolute left-4 flex items-center gap-5 text-sm font-medium text-gray-300">
          <Link href="/about" className="transition-colors hover:text-white">
            Code Tweetとは
          </Link>
          <Link href="/note" className="transition-colors hover:text-white">
            note Draft
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-white">
            プラン
          </Link>
        </nav>
        <Link href="/" className="text-white font-semibold tracking-tight">
          Code{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
            Tweet
          </span>
        </Link>
        <div className="absolute right-4">
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
