"use client";

import { useState } from "react";
import {
  markDismissed,
  resolveOnboarding,
  type OnboardingResolution,
} from "@/lib/onboarding";
import OnboardingStep from "./OnboardingStep";

type Props = {
  initialOnboarding?: string;
};

export default function OnboardingHost({ initialOnboarding }: Props) {
  const [resolution, setResolution] = useState<OnboardingResolution>(() =>
    resolveOnboarding(initialOnboarding ?? null),
  );

  if (resolution.kind === "hidden") return null;

  const handleClose = (dontShowAgain: boolean) => {
    if (dontShowAgain && !resolution.forced) {
      markDismissed();
    }
    setResolution({ kind: "hidden" });
  };

  return <OnboardingStep forced={resolution.forced} onClose={handleClose} />;
}
