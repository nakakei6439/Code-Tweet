export const ONBOARDING_COOKIE_NAME = "code_tweet_onboarding_dismissed";
export const ONBOARDING_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type OnboardingResolution =
  | { kind: "hidden" }
  | { kind: "show"; forced: boolean };

export function resolveOnboarding(
  queryValue: string | null,
  dismissed: boolean,
): OnboardingResolution {
  if (queryValue === "off") return { kind: "hidden" };
  if (queryValue === "show") return { kind: "show", forced: true };
  if (dismissed) return { kind: "hidden" };
  return { kind: "show", forced: false };
}
