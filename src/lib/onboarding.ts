export const ONBOARDING_STORAGE_KEY = "code-tweet:onboarding-dismissed";

export type OnboardingResolution =
  | { kind: "hidden" }
  | { kind: "show"; forced: boolean };

export function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDismissed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch {
    // ignore (private mode 等で書き込めない場合)
  }
}

export function resolveOnboarding(queryValue: string | null): OnboardingResolution {
  if (queryValue === "off") return { kind: "hidden" };
  if (queryValue === "show") return { kind: "show", forced: true };
  if (isDismissed()) return { kind: "hidden" };
  return { kind: "show", forced: false };
}
