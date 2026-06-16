"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adjustWeeklyPlan } from "@/app/actions/plan";
import { formatElapsed, useElapsedSeconds } from "@/lib/useElapsed";

const EXAMPLES = [
  "I tweaked my hamstring on Sunday — lighten Mon and Tue, no max-effort sprints.",
  "Move the gym session to Wednesday, add a tempo run on Friday.",
  "I have an unplanned local meet on Saturday — taper the back half of the week.",
  "Drop intensity 20% this week, I'm coming back from a cold.",
];

export function AdjustPlanCard() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const elapsed = useElapsedSeconds(pending);

  function submit() {
    setError(null);
    setSuccess(false);
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      setError("Tell the coach what to change.");
      return;
    }
    start(async () => {
      const res = await adjustWeeklyPlan({ note: trimmed });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      setNote("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4 text-primary" />
          Ask AI to adjust this week
        </CardTitle>
        <CardDescription>
          Tell your coach what you want changed in plain English — it&apos;ll
          revise the week without starting from scratch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I'm sore from yesterday — make Tuesday a recovery day and shift everything forward by one slot."
          rows={3}
          disabled={pending}
        />

        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="opacity-70">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setNote(ex)}
              disabled={pending}
              className="rounded-full border border-border px-2 py-0.5 transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {ex.length > 64 ? ex.slice(0, 61) + "…" : ex}
            </button>
          ))}
        </div>

        {error && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {success && !pending && (
          <p className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Week updated. Scroll down to see the changes.
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {pending
              ? `Revising your week… ${formatElapsed(elapsed)}. This usually takes 30–120s on Opus.`
              : "Existing logs are preserved when possible."}
          </p>
          <Button onClick={submit} disabled={pending}>
            <Wand2 className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} />
            {pending ? "Adjusting…" : "Apply adjustment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
