"use client";

import { useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateWeeklyPlan } from "@/app/actions/plan";
import { formatElapsed, useElapsedSeconds } from "@/lib/useElapsed";

export function GeneratePlanButton({
  force = false,
  label,
}: {
  force?: boolean;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const elapsed = useElapsedSeconds(pending);

  function onClick() {
    start(async () => {
      const res = await generateWeeklyPlan({ force });
      if (!res.ok) {
        alert(`Could not generate plan: ${res.error}`);
      }
    });
  }

  const Icon = force ? RefreshCw : Sparkles;
  const idleText =
    label ?? (force ? "Regenerate week" : "Generate this week's plan");
  return (
    <Button
      onClick={onClick}
      disabled={pending}
      variant={force ? "outline" : "default"}
    >
      <Icon className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? `Generating… ${formatElapsed(elapsed)}` : idleText}
    </Button>
  );
}
