"use client";

import { useState } from "react";
import type { OnboardingResolution } from "@/lib/onboarding";
import OnboardingStep from "./OnboardingStep";

type Props = {
  initialResolution: OnboardingResolution;
};

type ResolutionKey = "hidden" | "show" | "forced";

function toResolutionKey(resolution: OnboardingResolution): ResolutionKey {
  if (resolution.kind === "hidden") return "hidden";
  return resolution.forced ? "forced" : "show";
}

export default function OnboardingHost({ initialResolution }: Props) {
  const resolutionKey = toResolutionKey(initialResolution);
  const [closed, setClosed] = useState(false);

  if (closed || resolutionKey === "hidden") return null;

  const handleClose = (dontShowAgain: boolean) => {
    if (dontShowAgain && resolutionKey !== "forced") {
      void fetch("/api/onboarding/dismiss", { method: "POST" });
    }
    setClosed(true);
  };

  return <OnboardingStep forced={resolutionKey === "forced"} onClose={handleClose} />;
}
