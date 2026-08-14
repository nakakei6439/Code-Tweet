import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import UnifiedGenerateForm from "@/components/UnifiedGenerateForm";
import type { GenerateTabKey } from "@/components/GenerateTabs";
import OnboardingHost from "@/components/onboarding/OnboardingHost";
import { hashIp } from "@/lib/rateLimit";
import { getGuestUsage, getUserUsage } from "@/lib/usage";
import type { UsageInfo } from "@/types/usage";

type LocaleParams = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "homePage" });
  return { title: t("title"), description: t("description") };
}

type SearchParams = Promise<{ onboarding?: string | string[]; tab?: string | string[] }>;

export default async function Home({
  params,
  searchParams,
}: {
  params: LocaleParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const search = await searchParams;
  const onboardingParam = Array.isArray(search.onboarding) ? search.onboarding[0] : search.onboarding;
  const tabParam = Array.isArray(search.tab) ? search.tab[0] : search.tab;
  const initialTab: GenerateTabKey =
    tabParam === "note" ? "note" : tabParam === "tweet" ? "tweet" : "appss";

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

      <OnboardingHost initialOnboarding={onboardingParam} />
    </main>
  );
}
