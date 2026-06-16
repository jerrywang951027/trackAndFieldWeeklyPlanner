"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nextId, nowISO, updateStore } from "@/db/fileStore";
import { getCurrentAthleteId } from "@/lib/athlete";

const WorkoutLogSchema = z.object({
  workoutId: z.coerce.number().int().positive(),
  completed: z.coerce.boolean().optional().default(true),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
});

export async function saveWorkoutLog(raw: unknown) {
  const parsed = WorkoutLogSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const data = parsed.data;
  const now = nowISO();

  await updateStore((store) => {
    const existing = store.workoutLogs.find(
      (l) => l.workoutId === data.workoutId
    );
    if (existing) {
      existing.completed = data.completed;
      existing.rpe = data.rpe ?? null;
      existing.notes = data.notes ?? null;
      existing.loggedAt = now;
    } else {
      store.workoutLogs.push({
        id: nextId("workoutLogs", store),
        workoutId: data.workoutId,
        completed: data.completed,
        rpe: data.rpe ?? null,
        notes: data.notes ?? null,
        performance: null,
        loggedAt: now,
      });
    }
  });

  revalidatePath(`/plan/${data.workoutId}`);
  revalidatePath("/plan");
  revalidatePath("/home");
  revalidatePath("/progress");
  return { ok: true as const };
}

const ReadinessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepHours: z.coerce.number().min(0).max(16).optional(),
  soreness: z.coerce.number().int().min(0).max(10).optional(),
  fatigue: z.coerce.number().int().min(0).max(10).optional(),
  mood: z.coerce.number().int().min(0).max(10).optional(),
  notes: z.string().max(1000).optional(),
});

export async function saveReadiness(raw: unknown) {
  const parsed = ReadinessSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const data = parsed.data;
  const id = getCurrentAthleteId();

  await updateStore((store) => {
    store.dailyReadiness.push({
      id: nextId("readiness", store),
      athleteId: id,
      date: data.date,
      sleepHours: data.sleepHours ?? null,
      soreness: data.soreness ?? null,
      fatigue: data.fatigue ?? null,
      mood: data.mood ?? null,
      notes: data.notes ?? null,
    });
  });

  revalidatePath("/recovery");
  revalidatePath("/home");
  return { ok: true as const };
}
