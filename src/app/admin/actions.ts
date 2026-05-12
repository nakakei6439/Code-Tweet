"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import type { SubscriptionTier } from "@/lib/subscription";

export async function setUserTier(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Unauthorized");
  }

  const userId = String(formData.get("userId") ?? "");
  const tier = String(formData.get("tier") ?? "") as SubscriptionTier;
  if (!userId || (tier !== "free" && tier !== "paid")) {
    throw new Error("Invalid input");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .upsert({ user_id: userId, tier }, { onConflict: "user_id" });

  if (error) {
    console.error("[admin] setUserTier error:", error);
    throw new Error("Failed to update tier");
  }

  revalidatePath("/admin");
}
