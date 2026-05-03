import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_tokens")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-white text-2xl font-bold mb-8">設定</h1>
      <SettingsForm hasPat={!!data} />
    </main>
  );
}
