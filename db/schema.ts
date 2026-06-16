/**
 * Plain TypeScript types describing the persisted shape of every entity.
 * Backed by db/fileStore.ts (JSON file at .data/store.json).
 *
 * Naming and field shapes deliberately mirror what a typical Postgres-backed
 * model would look like, so we can swap to a real DB later without changing
 * consumers. All date-only fields are ISO strings "YYYY-MM-DD"; all timestamps
 * are full ISO strings.
 */

export type Sex = "male" | "female" | "other";

export type Level =
  | "high_school"
  | "collegiate"
  | "club"
  | "amateur"
  | "professional";

export type GoalKind =
  | "acceleration"
  | "top_speed"
  | "speed_endurance"
  | "strength"
  | "peak_for_meet"
  | "break_time"
  | "general_fitness";

export type MeetPriority = "A" | "B" | "C";

export type SeasonPhase =
  | "off_season"
  | "general_prep"
  | "specific_prep"
  | "competition"
  | "peaking"
  | "transition";

export type WorkoutType =
  | "sprint"
  | "gym"
  | "technical"
  | "mobility"
  | "recovery"
  | "rest"
  | "meet_prep";

export type InjurySeverity = "minor" | "moderate" | "severe";

export type Athlete = {
  id: string;
  name: string;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  experienceYears: number | null;
  level: Level | null;
  createdAt: string;
  updatedAt: string;
};

export type AthleteEvent = {
  id: number;
  athleteId: string;
  eventCode: string;
  isPrimary: boolean;
  prSeconds: number | null;
  prDate: string | null;
};

export type Goal = {
  id: number;
  athleteId: string;
  kind: GoalKind;
  targetValue: string | null;
  targetDate: string | null;
  notes: string | null;
};

export type Availability = {
  athleteId: string;
  daysPerWeek: number;
  sessionMinutes: number;
  hasTrack: boolean;
  hasGym: boolean;
  equipment: string[];
};

export type Meet = {
  id: number;
  athleteId: string;
  name: string;
  date: string;
  priority: MeetPriority;
  seasonPhase: SeasonPhase | null;
};

export type Injury = {
  id: number;
  athleteId: string;
  area: string;
  severity: InjurySeverity;
  notes: string | null;
  active: boolean;
};

export type WeeklyPlan = {
  id: number;
  athleteId: string;
  weekStartDate: string;
  focus: string | null;
  generatedByModel: string;
  promptHash: string | null;
  createdAt: string;
};

export type WorkoutBlock = {
  name: string;
  description: string;
  details?: string[];
  durationMin?: number;
};

export type Workout = {
  id: number;
  weeklyPlanId: number;
  date: string;
  type: WorkoutType;
  title: string;
  intensity: number;
  durationMin: number;
  blocks: WorkoutBlock[];
  coachingNotes: string | null;
  whyExplanation: string | null;
};

export type WorkoutLog = {
  id: number;
  workoutId: number;
  completed: boolean;
  rpe: number | null;
  notes: string | null;
  performance: Record<string, unknown> | null;
  loggedAt: string;
};

export type DailyReadiness = {
  id: number;
  athleteId: string;
  date: string;
  sleepHours: number | null;
  soreness: number | null;
  fatigue: number | null;
  mood: number | null;
  notes: string | null;
};

/**
 * One row per "Ask AI to adjust" submission. Persisted so the athlete can see
 * the history of changes they have asked the coach for on a given week.
 */
export type PlanAdjustment = {
  id: number;
  athleteId: string;
  weekStartDate: string;
  /** ID of the new plan that came out of this adjustment. */
  weeklyPlanId: number;
  /** ID of the plan that was replaced, if any. */
  previousPlanId: number | null;
  /** The athlete's free-text request, verbatim. */
  note: string;
  /** Model that produced the revision (e.g. "claude-opus-4-7 (adjusted)"). */
  model: string;
  appliedAt: string;
};
