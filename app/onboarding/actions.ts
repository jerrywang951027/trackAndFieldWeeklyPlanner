"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nextId, nowISO, updateStore } from "@/db/fileStore";
import { getCurrentAthleteId } from "@/lib/athlete";

const OnboardingSchema = z.object({
  name: z.string().min(1).max(80),
  age: z.coerce.number().int().min(10).max(80).optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  heightCm: z.coerce.number().min(120).max(230).optional(),
  weightKg: z.coerce.number().min(35).max(180).optional(),
  experienceYears: z.coerce.number().int().min(0).max(40).optional(),
  level: z
    .enum(["high_school", "collegiate", "club", "amateur", "professional"])
    .optional(),
  primaryEvent: z.enum([
    "sprints_60m",
    "sprints_100m",
    "sprints_200m",
    "sprints_400m",
  ]),
  secondaryEvents: z
    .array(
      z.enum(["sprints_60m", "sprints_100m", "sprints_200m", "sprints_400m"])
    )
    .default([]),
  prSeconds: z.coerce.number().positive().optional(),
  goalKinds: z
    .array(
      z.enum([
        "acceleration",
        "top_speed",
        "speed_endurance",
        "strength",
        "peak_for_meet",
        "break_time",
        "general_fitness",
      ])
    )
    .default([]),
  goalNotes: z.string().max(500).optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  sessionMinutes: z.coerce.number().int().min(20).max(240),
  hasTrack: z.coerce.boolean().optional(),
  hasGym: z.coerce.boolean().optional(),
  equipment: z.array(z.string()).default([]),
  meets: z
    .array(
      z.object({
        name: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        priority: z.enum(["A", "B", "C"]).default("B"),
      })
    )
    .default([]),
  injuries: z
    .array(
      z.object({
        area: z.string().min(1),
        severity: z.enum(["minor", "moderate", "severe"]),
        active: z.boolean().default(false),
        notes: z.string().optional(),
      })
    )
    .default([]),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export async function completeOnboarding(raw: unknown) {
  const parsed = OnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const data = parsed.data;
  const id = getCurrentAthleteId();
  const now = nowISO();

  await updateStore((store) => {
    const existing = store.athletes.find((a) => a.id === id);
    if (existing) {
      Object.assign(existing, {
        name: data.name,
        age: data.age ?? null,
        sex: data.sex ?? null,
        heightCm: data.heightCm ?? null,
        weightKg: data.weightKg ?? null,
        experienceYears: data.experienceYears ?? null,
        level: data.level ?? null,
        updatedAt: now,
      });
    } else {
      store.athletes.push({
        id,
        name: data.name,
        age: data.age ?? null,
        sex: data.sex ?? null,
        heightCm: data.heightCm ?? null,
        weightKg: data.weightKg ?? null,
        experienceYears: data.experienceYears ?? null,
        level: data.level ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    store.athleteEvents = store.athleteEvents.filter((e) => e.athleteId !== id);
    store.athleteEvents.push({
      id: nextId("athleteEvents", store),
      athleteId: id,
      eventCode: data.primaryEvent,
      isPrimary: true,
      prSeconds: data.prSeconds ?? null,
      prDate: null,
    });
    for (const e of data.secondaryEvents) {
      if (e === data.primaryEvent) continue;
      store.athleteEvents.push({
        id: nextId("athleteEvents", store),
        athleteId: id,
        eventCode: e,
        isPrimary: false,
        prSeconds: null,
        prDate: null,
      });
    }

    store.goals = store.goals.filter((g) => g.athleteId !== id);
    for (const kind of data.goalKinds) {
      store.goals.push({
        id: nextId("goals", store),
        athleteId: id,
        kind,
        targetValue: null,
        targetDate: null,
        notes: data.goalNotes ?? null,
      });
    }

    store.availability = store.availability.filter((a) => a.athleteId !== id);
    store.availability.push({
      athleteId: id,
      daysPerWeek: data.daysPerWeek,
      sessionMinutes: data.sessionMinutes,
      hasTrack: data.hasTrack ?? true,
      hasGym: data.hasGym ?? true,
      equipment: data.equipment,
    });

    store.meets = store.meets.filter((m) => m.athleteId !== id);
    for (const m of data.meets) {
      store.meets.push({
        id: nextId("meets", store),
        athleteId: id,
        name: m.name,
        date: m.date,
        priority: m.priority,
        seasonPhase: null,
      });
    }

    store.injuryHistory = store.injuryHistory.filter(
      (i) => i.athleteId !== id
    );
    for (const inj of data.injuries) {
      store.injuryHistory.push({
        id: nextId("injuries", store),
        athleteId: id,
        area: inj.area,
        severity: inj.severity,
        notes: inj.notes ?? null,
        active: inj.active,
      });
    }
  });

  redirect("/home");
}
