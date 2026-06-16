"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nextId, nowISO, readStore, updateStore } from "@/db/fileStore";
import { getCurrentAthleteId } from "@/lib/athlete";
import {
  getAthleteWithContext,
  getCurrentWeekPlan,
  getRecentReadiness,
  getRecentWorkoutLogs,
} from "@/lib/queries";
import { generateWeeklyPlanFromContext } from "@/lib/ai/planGenerator";
import { weekStartISO } from "@/lib/sprintDomain";

export type GeneratePlanResult =
  | { ok: true; planId: number; created: boolean }
  | { ok: false; error: string };

export type AdjustPlanResult =
  | { ok: true; planId: number }
  | { ok: false; error: string };

/**
 * Generate (or fetch existing) weekly plan for the current week.
 * Pass force=true to regenerate even if one already exists.
 */
export async function generateWeeklyPlan(
  options: { force?: boolean; targetWeekStartISO?: string } = {}
): Promise<GeneratePlanResult> {
  try {
    const athleteId = getCurrentAthleteId();
    const weekStart = options.targetWeekStartISO ?? weekStartISO();

    const initialStore = await readStore();
    const existing = initialStore.weeklyPlans.find(
      (p) => p.athleteId === athleteId && p.weekStartDate === weekStart
    );
    if (existing && !options.force) {
      return { ok: true, planId: existing.id, created: false };
    }

    const ctx = await getAthleteWithContext();
    if (!ctx) {
      return { ok: false, error: "No athlete profile found." };
    }
    const [recentReadiness, recentLogs] = await Promise.all([
      getRecentReadiness(7),
      getRecentWorkoutLogs(14),
    ]);

    const { plan, model } = await generateWeeklyPlanFromContext({
      ...ctx,
      recentReadiness,
      recentLogs,
      targetWeekStartISO: weekStart,
    });

    const planId = await updateStore((store) => {
      const stale = store.weeklyPlans.find(
        (p) => p.athleteId === athleteId && p.weekStartDate === weekStart
      );
      if (stale) {
        const workoutIds = new Set(
          store.workouts.filter((w) => w.weeklyPlanId === stale.id).map((w) => w.id)
        );
        store.workouts = store.workouts.filter(
          (w) => w.weeklyPlanId !== stale.id
        );
        store.workoutLogs = store.workoutLogs.filter(
          (l) => !workoutIds.has(l.workoutId)
        );
        store.weeklyPlans = store.weeklyPlans.filter((p) => p.id !== stale.id);
      }

      const newPlanId = nextId("weeklyPlans", store);
      store.weeklyPlans.push({
        id: newPlanId,
        athleteId,
        weekStartDate: plan.weekStartDate,
        focus: plan.focus,
        generatedByModel: model,
        promptHash: null,
        createdAt: nowISO(),
      });

      for (const w of plan.workouts) {
        store.workouts.push({
          id: nextId("workouts", store),
          weeklyPlanId: newPlanId,
          date: w.date,
          type: w.type,
          title: w.title,
          intensity: w.intensity,
          durationMin: w.durationMin,
          blocks: w.blocks,
          coachingNotes: w.coachingNotes,
          whyExplanation: w.whyExplanation,
        });
      }

      return newPlanId;
    });

    revalidatePath("/home");
    revalidatePath("/plan");
    return { ok: true, planId, created: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

const AdjustInputSchema = z.object({
  note: z.string().trim().min(3).max(2000),
  targetWeekStartISO: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * Revise the existing weekly plan based on a free-text instruction from the
 * athlete. Loads the current plan, sends it to Claude along with the request,
 * and atomically replaces it with the returned revision.
 */
export async function adjustWeeklyPlan(
  raw: unknown
): Promise<AdjustPlanResult> {
  try {
    const parsed = AdjustInputSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join("; "),
      };
    }
    const { note, targetWeekStartISO } = parsed.data;
    const athleteId = getCurrentAthleteId();
    const weekStart = targetWeekStartISO ?? weekStartISO();

    const planBundle = await getCurrentWeekPlan(weekStart);
    if (!planBundle) {
      return {
        ok: false,
        error:
          "No plan exists for this week yet. Generate one first, then ask for an adjustment.",
      };
    }

    const ctx = await getAthleteWithContext();
    if (!ctx) {
      return { ok: false, error: "No athlete profile found." };
    }
    const [recentReadiness, recentLogs] = await Promise.all([
      getRecentReadiness(7),
      getRecentWorkoutLogs(14),
    ]);

    const { plan, model } = await generateWeeklyPlanFromContext({
      ...ctx,
      recentReadiness,
      recentLogs,
      targetWeekStartISO: weekStart,
      adjustmentNote: note,
      previousPlan: {
        focus: planBundle.plan.focus,
        workouts: planBundle.workouts,
      },
    });

    const planId = await updateStore((store) => {
      const stale = store.weeklyPlans.find(
        (p) => p.athleteId === athleteId && p.weekStartDate === weekStart
      );
      const previousPlanId = stale?.id ?? null;
      if (stale) {
        const staleWorkoutIds = new Set(
          store.workouts
            .filter((w) => w.weeklyPlanId === stale.id)
            .map((w) => w.id)
        );
        store.workouts = store.workouts.filter(
          (w) => w.weeklyPlanId !== stale.id
        );
        store.weeklyPlans = store.weeklyPlans.filter((p) => p.id !== stale.id);
        store.workoutLogs = store.workoutLogs.filter(
          (l) => !staleWorkoutIds.has(l.workoutId)
        );
      }

      const newPlanId = nextId("weeklyPlans", store);
      const adjustedModel = `${model} (adjusted)`;
      const now = nowISO();
      store.weeklyPlans.push({
        id: newPlanId,
        athleteId,
        weekStartDate: plan.weekStartDate,
        focus: plan.focus,
        generatedByModel: adjustedModel,
        promptHash: null,
        createdAt: now,
      });

      for (const w of plan.workouts) {
        store.workouts.push({
          id: nextId("workouts", store),
          weeklyPlanId: newPlanId,
          date: w.date,
          type: w.type,
          title: w.title,
          intensity: w.intensity,
          durationMin: w.durationMin,
          blocks: w.blocks,
          coachingNotes: w.coachingNotes,
          whyExplanation: w.whyExplanation,
        });
      }

      store.planAdjustments.push({
        id: nextId("planAdjustments", store),
        athleteId,
        weekStartDate: plan.weekStartDate,
        weeklyPlanId: newPlanId,
        previousPlanId,
        note,
        model: adjustedModel,
        appliedAt: now,
      });

      return newPlanId;
    });

    revalidatePath("/home");
    revalidatePath("/plan");
    return { ok: true, planId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
