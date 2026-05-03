import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderActions from "@/components/HeaderActions";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="w-full border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-white font-semibold tracking-tight">
          Code Tweet
        </Link>
        <HeaderActions
          isAuthenticated={!!user}
          email={user?.email ?? null}
        />
      </div>
    </header>
  );
}
