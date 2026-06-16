"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveReadiness } from "@/app/actions/log";
import type { DailyReadiness } from "@/db/schema";

export function ReadinessForm({
  date,
  existing,
}: {
  date: string;
  existing: DailyReadiness | null;
}) {
  const router = useRouter();
  const [sleep, setSleep] = useState<string>(
    existing?.sleepHours?.toString() ?? "7.5"
  );
  const [soreness, setSoreness] = useState<number>(existing?.soreness ?? 3);
  const [fatigue, setFatigue] = useState<number>(existing?.fatigue ?? 3);
  const [mood, setMood] = useState<number>(existing?.mood ?? 7);
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveReadiness({
        date,
        sleepHours: sleep ? Number(sleep) : undefined,
        soreness,
        fatigue,
        mood,
        notes,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How are you today?</CardTitle>
        <CardDescription>
          The AI uses this to adjust your training intensity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sleep">Sleep last night (hours)</Label>
            <Input
              id="sleep"
              type="number"
              step="0.5"
              min={0}
              max={16}
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
            />
          </div>
        </div>

        <Range label="Soreness" value={soreness} setValue={setSoreness} hint="0 = no soreness, 10 = very sore" />
        <Range label="Fatigue" value={fatigue} setValue={setFatigue} hint="0 = fresh, 10 = exhausted" />
        <Range label="Mood" value={mood} setValue={setMood} hint="0 = down, 10 = great" />

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to add?"
            rows={2}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && (
          <p className="text-sm text-emerald-400">Saved. Thanks for checking in.</p>
        )}

        <Button onClick={onSave} disabled={pending} className="w-full" size="lg">
          <CheckCircle2 className="h-4 w-4" />
          {pending ? "Saving..." : "Save check-in"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Range({
  label,
  value,
  setValue,
  hint,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-semibold text-primary">{value}</span>
      </div>
      <Slider
        min={0}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(v) => setValue(v[0])}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
