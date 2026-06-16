import { z } from "zod";

export const WorkoutBlockSchema = z.object({
  name: z
    .string()
    .describe("Short label such as 'Warmup', 'Main set', 'Cooldown', 'Strength'."),
  description: z.string().describe("1-2 sentence summary of this block."),
  details: z
    .array(z.string())
    .describe(
      "Concrete steps, e.g. '4x60m at 95% with 4 min rest'. Provide 1-6 items."
    ),
  durationMin: z
    .number()
    .int()
    .min(0)
    .max(180)
    .describe("Approximate duration of this block in minutes."),
});

export const WorkoutSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Date in YYYY-MM-DD format."),
  type: z.enum([
    "sprint",
    "gym",
    "technical",
    "mobility",
    "recovery",
    "rest",
    "meet_prep",
  ]),
  title: z
    .string()
    .describe("Short workout title, e.g. 'Speed endurance: 4x150m'."),
  intensity: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Overall intensity 1-10 (10 = max effort)."),
  durationMin: z
    .number()
    .int()
    .min(0)
    .max(240)
    .describe("Total estimated session duration in minutes."),
  blocks: z
    .array(WorkoutBlockSchema)
    .min(1)
    .describe("Ordered list of workout blocks."),
  coachingNotes: z
    .string()
    .describe(
      "1-3 sentences of practical coaching tips: cues, common mistakes, what to watch for."
    ),
  whyExplanation: z
    .string()
    .describe(
      "1-3 sentences explaining WHY this session is in the plan today, referencing the athlete's goals, recent fatigue, or upcoming meets."
    ),
});

export const WeeklyPlanSchema = z.object({
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Monday of the week, YYYY-MM-DD."),
  focus: z
    .string()
    .describe(
      "One-sentence theme for this week, e.g. 'Acceleration block — building max horizontal force.'"
    ),
  workouts: z
    .array(WorkoutSchema)
    .length(7)
    .describe(
      "Exactly 7 entries, one per day Monday through Sunday in chronological order. Use type 'rest' for off days."
    ),
});

export type WeeklyPlanOutput = z.infer<typeof WeeklyPlanSchema>;
export type WorkoutOutput = z.infer<typeof WorkoutSchema>;
export type WorkoutBlockOutput = z.infer<typeof WorkoutBlockSchema>;
