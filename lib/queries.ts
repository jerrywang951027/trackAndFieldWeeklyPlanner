import { readStore } from "@/db/fileStore";
import type {
  Athlete,
  AthleteEvent,
  DailyReadiness,
  PlanAdjustment,
  Workout,
  WorkoutLog,
} from "@/db/schema";
import { getCurrentAthleteId } from "@/lib/athlete";

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function getAthlete(): Promise<Athlete | null> {
  const store = await readStore();
  return store.athletes.find((a) => a.id === getCurrentAthleteId()) ?? null;
}

export async function getAthleteWithContext() {
  const store = await readStore();
  const id = getCurrentAthleteId();
  const athlete = store.athletes.find((a) => a.id === id);
  if (!athlete) return null;
  return {
    athlete,
    events: store.athleteEvents.filter((e) => e.athleteId === id),
    goals: store.goals.filter((g) => g.athleteId === id),
    availability:
      store.availability.find((a) => a.athleteId === id) ?? null,
    meets: [...store.meets.filter((m) => m.athleteId === id)].sort((a, b) =>
      a.date < b.date ? -1 : 1
    ),
    injuries: store.injuryHistory.filter((i) => i.athleteId === id),
  };
}

export async function getCurrentWeekPlan(weekStartISO: string) {
  const store = await readStore();
  const id = getCurrentAthleteId();
  const plan = store.weeklyPlans.find(
    (p) => p.athleteId === id && p.weekStartDate === weekStartISO
  );
  if (!plan) return null;
  const workouts = store.workouts
    .filter((w) => w.weeklyPlanId === plan.id)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return { plan, workouts };
}

export async function getWorkoutById(id: number): Promise<Workout | null> {
  const store = await readStore();
  return store.workouts.find((w) => w.id === id) ?? null;
}

export async function getLogForWorkout(
  workoutId: number
): Promise<WorkoutLog | null> {
  const store = await readStore();
  const logs = store.workoutLogs
    .filter((l) => l.workoutId === workoutId)
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));
  return logs[0] ?? null;
}

export async function getLogsForWorkoutIds(
  workoutIds: number[]
): Promise<Map<number, WorkoutLog>> {
  const store = await readStore();
  const set = new Set(workoutIds);
  const out = new Map<number, WorkoutLog>();
  for (const log of store.workoutLogs) {
    if (!set.has(log.workoutId)) continue;
    const existing = out.get(log.workoutId);
    if (!existing || existing.loggedAt < log.loggedAt) {
      out.set(log.workoutId, log);
    }
  }
  return out;
}

export async function getReadinessForDate(
  dateISO: string
): Promise<DailyReadiness | null> {
  const store = await readStore();
  const id = getCurrentAthleteId();
  const rows = store.dailyReadiness
    .filter((r) => r.athleteId === id && r.date === dateISO)
    .sort((a, b) => b.id - a.id);
  return rows[0] ?? null;
}

export async function getRecentReadiness(
  days = 7
): Promise<DailyReadiness[]> {
  const store = await readStore();
  const id = getCurrentAthleteId();
  const since = daysAgoISO(days);
  return store.dailyReadiness
    .filter((r) => r.athleteId === id && r.date >= since)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getRecentWorkoutLogs(
  days = 14
): Promise<Array<{ log: WorkoutLog; workout: Workout }>> {
  const store = await readStore();
  const id = getCurrentAthleteId();
  const since = daysAgoISO(days);
  const planIds = new Set(
    store.weeklyPlans.filter((p) => p.athleteId === id).map((p) => p.id)
  );
  const workouts = store.workouts.filter(
    (w) => planIds.has(w.weeklyPlanId) && w.date >= since
  );
  const wIndex = new Map(workouts.map((w) => [w.id, w]));
  const rows: Array<{ log: WorkoutLog; workout: Workout }> = [];
  for (const log of store.workoutLogs) {
    const workout = wIndex.get(log.workoutId);
    if (workout) rows.push({ log, workout });
  }
  return rows.sort((a, b) => (a.workout.date < b.workout.date ? 1 : -1));
}

export async function getAllWorkoutsInRange(
  startISO: string,
  endISO: string
): Promise<Array<{ workout: Workout; log: WorkoutLog | null }>> {
  const store = await readStore();
  const id = getCurrentAthleteId();
  const planIds = new Set(
    store.weeklyPlans.filter((p) => p.athleteId === id).map((p) => p.id)
  );
  const workouts = store.workouts
    .filter(
      (w) =>
        planIds.has(w.weeklyPlanId) && w.date >= startISO && w.date <= endISO
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const latestLogByWorkout = new Map<number, WorkoutLog>();
  for (const log of store.workoutLogs) {
    const existing = latestLogByWorkout.get(log.workoutId);
    if (!existing || existing.loggedAt < log.loggedAt) {
      latestLogByWorkout.set(log.workoutId, log);
    }
  }

  return workouts.map((w) => ({
    workout: w,
    log: latestLogByWorkout.get(w.id) ?? null,
  }));
}

export async function getPRsSummary(): Promise<AthleteEvent[]> {
  const store = await readStore();
  const id = getCurrentAthleteId();
  return store.athleteEvents.filter((e) => e.athleteId === id);
}

export async function getAdjustmentsForWeek(
  weekStartISO: string
): Promise<PlanAdjustment[]> {
  const store = await readStore();
  const id = getCurrentAthleteId();
  return store.planAdjustments
    .filter((a) => a.athleteId === id && a.weekStartDate === weekStartISO)
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}

export async function getAllAdjustments(): Promise<PlanAdjustment[]> {
  const store = await readStore();
  const id = getCurrentAthleteId();
  return store.planAdjustments
    .filter((a) => a.athleteId === id)
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}
