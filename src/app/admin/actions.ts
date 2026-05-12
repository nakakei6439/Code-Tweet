"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedAdminUser } from "@/lib/adminServerAuth";
import type { SubscriptionTier } from "@/lib/subscription";

async function requireAdmin(): Promise<void> {
  await requireVerifiedAdminUser();
}

export async function setUserTier(formData: FormData): Promise<void> {
  await requireAdmin();

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

export async function resetGuestUsage(): Promise<void> {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("ip_usage_logs")
    .delete()
    .not("id", "is", null);

  if (error) {
    console.error("[admin] resetGuestUsage error:", error);
    throw new Error("Failed to reset guest usage");
  }

  revalidatePath("/admin");
  revalidatePath("/");
}
