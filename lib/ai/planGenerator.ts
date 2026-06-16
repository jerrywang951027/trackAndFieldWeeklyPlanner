import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, ANTHROPIC_MODEL } from "@/lib/anthropic";
import {
  WeeklyPlanSchema,
  type WeeklyPlanOutput,
} from "@/lib/ai/schemas";
import {
  averageReadiness,
  deriveSeasonPhase,
  SPRINT_EVENTS,
  weekStartISO,
} from "@/lib/sprintDomain";
import type {
  Athlete,
  AthleteEvent,
  Availability,
  DailyReadiness,
  Goal,
  Injury,
  Meet,
  WorkoutLog,
  Workout,
} from "@/db/schema";

export type PlannerContext = {
  athlete: Athlete;
  events: AthleteEvent[];
  goals: Goal[];
  availability: Availability | null;
  meets: Meet[];
  injuries: Injury[];
  recentReadiness: DailyReadiness[];
  recentLogs: Array<{ log: WorkoutLog; workout: Workout }>;
  targetWeekStartISO?: string;
  /** Free-text adjustment request from the athlete. Triggers revise-mode. */
  adjustmentNote?: string;
  /** Existing plan being revised. Required when adjustmentNote is set. */
  previousPlan?: {
    focus: string | null;
    workouts: Workout[];
  };
};

const SYSTEM_PROMPT = `You are an expert sprint coach (think: an experienced collegiate sprints coach with a sports-science background) building a one-week training plan for a single athlete in the Sprint Coach app.

Hard rules:
- ALWAYS respond by calling the "emit_weekly_plan" tool with a fully populated argument object. Never reply with prose.
- Always return exactly 7 workouts, one per day from Monday through Sunday in chronological order, with dates derived from "weekStartDate".
- Respect the athlete's training days per week — only that many days should have a non-rest workout (use type "rest" for off days).
- Never schedule two consecutive max-intensity sprint sessions (intensity >= 8). Insert at least one easy/recovery/technical/gym day between them.
- Honor active injuries — modify or remove sessions that would aggravate them; explain the adaptation in the workout's whyExplanation.
- Use only the equipment listed as available. Default to track + bodyweight when nothing is provided.

Sprints training principles you must apply:
- Periodize by season phase. Off-season/general prep emphasizes volume + strength. Specific prep adds speed work. Competition phase: high-quality, lower-volume speed + meet sharpening. Peaking: minimal volume, full recovery, neural priming.
- Within a week, alternate stimulus types: Acceleration (10-30m), Top Speed (30-60m flying), Speed Endurance (80-300m), Tempo/Aerobic, Strength/Power (gym), Technical/Drill, Recovery/Mobility.
- High-fatigue input should cut volume and/or intensity. High readiness allows for quality work.
- Within 10 days of an A-meet, taper: 50-70% normal volume, maintain intensity, more rest.
- The day after a high-intensity day should be light: tempo, technical, gym (legs allowed if not done day-of), or mobility — never max-effort sprinting.

Each workout must include:
- A specific, actionable title (e.g. "Speed endurance: 4x150m @ 90% w/ 6 min rest").
- Realistic intensity (1-10) and duration (in minutes) consistent with the athlete's session length.
- 3-5 ordered blocks (Warmup, Main, Supplement/Cooldown). Warmup is always required for any non-rest day.
- Coaching notes with cues, common errors, or focus points.
- A whyExplanation that REFERENCES the athlete's recent fatigue, goals, or upcoming meets — this is what teaches the athlete.

Tone: confident, motivating, professional. Never moralize about safety; instead, build safety into the programming.`;

const ADJUSTMENT_PROMPT_ADDENDUM = `
REVISE MODE
-----------
The athlete is asking you to ADJUST an existing weekly plan, not start over. You will be given:
1) The current plan (focus + 7 workouts).
2) The athlete's adjustment request in their own words.

Rules for revise mode:
- Apply ONLY what the athlete requested, plus any second-order edits physiologically required to keep the week safe and balanced (e.g. if they swap a hard day forward, you may need to push the next planned hard day back).
- Preserve unchanged workouts as closely as possible: keep title, blocks, intensity, duration, and coaching notes intact unless your edit requires altering them.
- The date range MUST stay the same as the current plan.
- Still emit a full 7-day plan via the emit_weekly_plan tool.
- In each affected workout's whyExplanation, briefly mention the adjustment ("Reduced intensity per your request because...").`;

function formatContext(ctx: PlannerContext) {
  const weekStart = ctx.targetWeekStartISO ?? weekStartISO();
  const primary = ctx.events.find((e) => e.isPrimary);
  const secondary = ctx.events.filter((e) => !e.isPrimary).map((e) => e.eventCode);
  const eventLabel = (code: string) =>
    SPRINT_EVENTS.find((e) => e.code === code)?.label ?? code;
  const phase = deriveSeasonPhase(ctx.meets);
  const avgReadiness = averageReadiness(ctx.recentReadiness);

  const activeInjuries = ctx.injuries.filter((i) => i.active);

  const recentLogsSummary = ctx.recentLogs.slice(0, 7).map((row) => ({
    date: row.workout.date,
    title: row.workout.title,
    type: row.workout.type,
    intensity: row.workout.intensity,
    completed: row.log.completed,
    rpe: row.log.rpe,
    notes: row.log.notes,
  }));

  const recentReadinessSummary = ctx.recentReadiness.slice(0, 7).map((r) => ({
    date: r.date,
    sleepHours: r.sleepHours,
    soreness: r.soreness,
    fatigue: r.fatigue,
    mood: r.mood,
  }));

  return {
    weekStartDate: weekStart,
    athlete: {
      name: ctx.athlete.name,
      age: ctx.athlete.age,
      sex: ctx.athlete.sex,
      heightCm: ctx.athlete.heightCm,
      weightKg: ctx.athlete.weightKg,
      experienceYears: ctx.athlete.experienceYears,
      level: ctx.athlete.level,
    },
    primaryEvent: primary
      ? { code: primary.eventCode, label: eventLabel(primary.eventCode), prSeconds: primary.prSeconds }
      : null,
    secondaryEvents: secondary.map((c) => ({ code: c, label: eventLabel(c) })),
    goals: ctx.goals.map((g) => ({ kind: g.kind, notes: g.notes ?? null })),
    availability: ctx.availability
      ? {
          daysPerWeek: ctx.availability.daysPerWeek,
          sessionMinutes: ctx.availability.sessionMinutes,
          hasTrack: ctx.availability.hasTrack,
          hasGym: ctx.availability.hasGym,
          equipment: ctx.availability.equipment,
        }
      : null,
    meets: ctx.meets.map((m) => ({
      name: m.name,
      date: m.date,
      priority: m.priority,
    })),
    activeInjuries: activeInjuries.map((i) => ({
      area: i.area,
      severity: i.severity,
      notes: i.notes,
    })),
    seasonPhase: {
      phase: phase.phase,
      daysToNextAMeet: phase.daysToNextA,
      nextAMeet: phase.nextA?.name ?? null,
    },
    readiness: {
      last7DaysAverageScore: avgReadiness.avgScore,
      band: avgReadiness.band,
      entries: recentReadinessSummary,
    },
    recentWorkouts: recentLogsSummary,
  };
}

/**
 * Anthropic-compatible JSON Schema for the weekly plan. Used as the tool's
 * input_schema; forcing tool_use is how we get strict structured output from
 * Claude (analogous to OpenAI's response_format json_schema).
 */
const WEEKLY_PLAN_INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["weekStartDate", "focus", "workouts"],
  properties: {
    weekStartDate: {
      type: "string",
      description: "Monday of the week in YYYY-MM-DD.",
    },
    focus: {
      type: "string",
      description: "One-sentence weekly theme.",
    },
    workouts: {
      type: "array",
      description:
        "Exactly 7 entries, Mon-Sun in order. Use type 'rest' for off days.",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "date",
          "type",
          "title",
          "intensity",
          "durationMin",
          "blocks",
          "coachingNotes",
          "whyExplanation",
        ],
        properties: {
          date: { type: "string" },
          type: {
            type: "string",
            enum: [
              "sprint",
              "gym",
              "technical",
              "mobility",
              "recovery",
              "rest",
              "meet_prep",
            ],
          },
          title: { type: "string" },
          intensity: { type: "integer", minimum: 1, maximum: 10 },
          durationMin: { type: "integer", minimum: 0, maximum: 240 },
          blocks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "description", "details", "durationMin"],
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                details: {
                  type: "array",
                  items: { type: "string" },
                },
                durationMin: { type: "integer", minimum: 0, maximum: 180 },
              },
            },
          },
          coachingNotes: { type: "string" },
          whyExplanation: { type: "string" },
        },
      },
    },
  },
};

const PLAN_TOOL: Anthropic.Tool = {
  name: "emit_weekly_plan",
  description:
    "Emit the finalized weekly training plan. The plan must contain exactly 7 daily workouts (Mon-Sun) and respect all rules in the system prompt.",
  input_schema: WEEKLY_PLAN_INPUT_SCHEMA,
};

export async function generateWeeklyPlanFromContext(
  ctx: PlannerContext
): Promise<{ plan: WeeklyPlanOutput; model: string }> {
  const userContext = formatContext(ctx);
  const isAdjustment = !!ctx.adjustmentNote && !!ctx.previousPlan;

  let userMessage: string;
  if (isAdjustment) {
    const prev = ctx.previousPlan!;
    const serializedPrev = {
      focus: prev.focus,
      workouts: prev.workouts.map((w) => ({
        date: w.date,
        type: w.type,
        title: w.title,
        intensity: w.intensity,
        durationMin: w.durationMin,
        blocks: w.blocks,
        coachingNotes: w.coachingNotes,
        whyExplanation: w.whyExplanation,
      })),
    };
    userMessage = `Revise the existing weekly plan based on the athlete's adjustment request. The week must stay on ${userContext.weekStartDate} (Monday).

ATHLETE CONTEXT:
${JSON.stringify(userContext, null, 2)}

CURRENT PLAN:
${JSON.stringify(serializedPrev, null, 2)}

ATHLETE ADJUSTMENT REQUEST (verbatim):
"""
${ctx.adjustmentNote}
"""

Emit the full revised 7-day plan via the emit_weekly_plan tool.`;
  } else {
    userMessage = `Build the weekly plan based on this athlete context (JSON below). The week must start on ${userContext.weekStartDate} (Monday).

CONTEXT:
${JSON.stringify(userContext, null, 2)}`;
  }

  const systemPrompt = isAdjustment
    ? SYSTEM_PROMPT + ADJUSTMENT_PROMPT_ADDENDUM
    : SYSTEM_PROMPT;

  const attempt = async (followUp?: string) => {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: userMessage },
    ];
    if (followUp) {
      messages.push({
        role: "user",
        content: followUp,
      });
    }

    const resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: isAdjustment ? 0.5 : 0.7,
      system: systemPrompt,
      tools: [PLAN_TOOL],
      tool_choice: { type: "tool", name: PLAN_TOOL.name },
      messages,
    });

    const toolBlock = resp.content.find(
      (b) => b.type === "tool_use" && b.name === PLAN_TOOL.name
    );
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error(
        `Model did not call ${PLAN_TOOL.name}. stop_reason=${resp.stop_reason}`
      );
    }
    const parsed = WeeklyPlanSchema.safeParse(toolBlock.input);
    if (!parsed.success) {
      throw new Error(
        `Plan failed schema validation: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`
      );
    }
    return parsed.data;
  };

  try {
    const plan = await attempt();
    return { plan, model: ANTHROPIC_MODEL };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const plan = await attempt(
      `Your previous tool call was invalid: ${msg}. Try again and ensure the arguments exactly match the tool's input_schema, with exactly 7 workouts dated Mon-Sun starting ${userContext.weekStartDate}.`
    );
    return { plan, model: ANTHROPIC_MODEL };
  }
}
