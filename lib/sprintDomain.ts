import { differenceInCalendarDays, format, startOfWeek } from "date-fns";
import type { DailyReadiness, Meet } from "@/db/schema";

export const SPRINT_EVENTS = [
  { code: "sprints_60m", label: "60m", typicalPRSeconds: 7.5 },
  { code: "sprints_100m", label: "100m", typicalPRSeconds: 11.5 },
  { code: "sprints_200m", label: "200m", typicalPRSeconds: 23.5 },
  { code: "sprints_400m", label: "400m", typicalPRSeconds: 52 },
] as const;

export type SprintEventCode = (typeof SPRINT_EVENTS)[number]["code"];

export const ALL_EVENT_CATEGORIES = [
  { code: "sprints", label: "Sprints", supported: true },
  { code: "hurdles", label: "Hurdles", supported: false },
  { code: "mid_distance", label: "Mid-distance", supported: false },
  { code: "distance", label: "Distance", supported: false },
  { code: "jumps", label: "Jumps", supported: false },
  { code: "throws", label: "Throws", supported: false },
  { code: "combined", label: "Combined events", supported: false },
] as const;

export function weekStartISO(d: Date = new Date()): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Pick the season phase based on distance to the next A-meet.
 * Coarse but useful — the AI also receives raw meet data and can refine.
 */
export function deriveSeasonPhase(meets: Meet[]): {
  phase:
    | "off_season"
    | "general_prep"
    | "specific_prep"
    | "competition"
    | "peaking"
    | "transition";
  daysToNextA: number | null;
  nextA: Meet | null;
} {
  const today = new Date();
  const aMeets = meets
    .filter((m) => m.priority === "A")
    .map((m) => ({ ...m, _d: new Date(m.date) }))
    .filter((m) => m._d >= today)
    .sort((a, b) => a._d.getTime() - b._d.getTime());
  const nextA = aMeets[0] ?? null;
  if (!nextA) {
    return { phase: "off_season", daysToNextA: null, nextA: null };
  }
  const daysToNextA = differenceInCalendarDays(nextA._d, today);
  let phase: ReturnType<typeof deriveSeasonPhase>["phase"];
  if (daysToNextA <= 10) phase = "peaking";
  else if (daysToNextA <= 28) phase = "competition";
  else if (daysToNextA <= 70) phase = "specific_prep";
  else if (daysToNextA <= 140) phase = "general_prep";
  else phase = "off_season";
  return { phase, daysToNextA, nextA };
}

/**
 * Readiness score 0-100 from sleep + soreness + fatigue + mood.
 * Higher = better. Used by the dashboard and the planner prompt.
 */
export function readinessScore(r: DailyReadiness | null | undefined): {
  score: number | null;
  band: "high" | "moderate" | "low" | "unknown";
} {
  if (!r) return { score: null, band: "unknown" };
  const sleep = r.sleepHours ?? null;
  const soreness = r.soreness ?? null;
  const fatigue = r.fatigue ?? null;
  const mood = r.mood ?? null;
  if (
    sleep === null &&
    soreness === null &&
    fatigue === null &&
    mood === null
  ) {
    return { score: null, band: "unknown" };
  }

  let weight = 0;
  let sum = 0;

  if (sleep !== null) {
    const sleepScore = Math.max(0, Math.min(1, (sleep - 4) / 4));
    sum += sleepScore * 30;
    weight += 30;
  }
  if (soreness !== null) {
    sum += ((10 - soreness) / 10) * 25;
    weight += 25;
  }
  if (fatigue !== null) {
    sum += ((10 - fatigue) / 10) * 25;
    weight += 25;
  }
  if (mood !== null) {
    sum += (mood / 10) * 20;
    weight += 20;
  }
  const score = Math.round((sum / weight) * 100);
  const band: "high" | "moderate" | "low" =
    score >= 75 ? "high" : score >= 50 ? "moderate" : "low";
  return { score, band };
}

export function averageReadiness(rows: DailyReadiness[]): {
  avgScore: number | null;
  band: "high" | "moderate" | "low" | "unknown";
} {
  if (rows.length === 0) return { avgScore: null, band: "unknown" };
  const scores = rows
    .map((r) => readinessScore(r).score)
    .filter((s): s is number => s !== null);
  if (scores.length === 0) return { avgScore: null, band: "unknown" };
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const band: "high" | "moderate" | "low" =
    avg >= 75 ? "high" : avg >= 50 ? "moderate" : "low";
  return { avgScore: avg, band };
}

export function intensityLabel(intensity: number): string {
  if (intensity >= 9) return "Max";
  if (intensity >= 7) return "High";
  if (intensity >= 5) return "Moderate";
  if (intensity >= 3) return "Light";
  return "Recovery";
}

export function workoutTypeLabel(type: string): string {
  return type
    .split("_")
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");
}
