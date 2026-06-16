"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { saveWorkoutLog } from "@/app/actions/log";
import type { Workout, WorkoutLog } from "@/db/schema";

export function LogForm({
  workout,
  existing,
}: {
  workout: Workout;
  existing: WorkoutLog | null;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState<boolean>(
    existing?.completed ?? true
  );
  const [rpe, setRpe] = useState<number>(existing?.rpe ?? 6);
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    start(async () => {
      const res = await saveWorkoutLog({
        workoutId: workout.id,
        completed,
        rpe,
        notes,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        router.push(`/plan/${workout.id}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href={`/plan/${workout.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <Card>
        <CardHeader>
          <CardDescription>
            {format(new Date(workout.date), "EEEE, MMM d")}
          </CardDescription>
          <CardTitle>{workout.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label htmlFor="completed" className="text-sm font-medium">
              Did you complete this workout?
            </Label>
            <Checkbox
              id="completed"
              checked={completed}
              onCheckedChange={(v) => setCompleted(!!v)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Effort (RPE)</Label>
              <span className="font-semibold text-primary">{rpe} / 10</span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[rpe]}
              onValueChange={(v) => setRpe(v[0])}
            />
            <p className="text-xs text-muted-foreground">
              How hard did it feel? 1 = effortless, 10 = maximal effort.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Splits, how it felt, anything off..."
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button onClick={onSave} disabled={pending} size="lg" className="w-full">
            <CheckCircle2 className="h-4 w-4" />
            {pending ? "Saving..." : "Save log"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
