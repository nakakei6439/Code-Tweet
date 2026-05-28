"use client";

import { useEffect, useState } from "react";
import {
  markDismissed,
  resolveOnboarding,
  type OnboardingResolution,
} from "@/lib/onboarding";
import OnboardingStep from "./OnboardingStep";

export default function OnboardingHost() {
  const [resolution, setResolution] = useState<OnboardingResolution>({ kind: "hidden" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setResolution(resolveOnboarding(params.get("onboarding")));
  }, []);

  if (resolution.kind === "hidden") return null;

  const handleClose = (dontShowAgain: boolean) => {
    if (dontShowAgain && !resolution.forced) {
      markDismissed();
    }
    setResolution({ kind: "hidden" });
  };

  return <OnboardingStep forced={resolution.forced} onClose={handleClose} />;
}
