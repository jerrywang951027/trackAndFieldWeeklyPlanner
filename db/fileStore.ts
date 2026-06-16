import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  Athlete,
  AthleteEvent,
  Availability,
  DailyReadiness,
  Goal,
  Injury,
  Meet,
  PlanAdjustment,
  WeeklyPlan,
  Workout,
  WorkoutLog,
} from "./schema";

/**
 * MVP storage layer: a single JSON file on disk.
 *
 * Design notes
 * - One file (.data/store.json), atomic writes via tmp+rename so a crash mid-write
 *   never corrupts the file.
 * - No in-memory cache: every read hits disk. Plenty fast for a single user and
 *   it sidesteps Next.js dev hot-reload getting out of sync.
 * - A tiny promise-chain mutex serializes writes inside one process so two
 *   server actions racing don't clobber each other.
 * - When we outgrow this, db/schema.ts is the source of truth — swap in a real
 *   DB layer (Postgres + Drizzle, SQLite + drizzle, Prisma, etc.) without
 *   touching consumers.
 */

export type Sequences = {
  athleteEvents: number;
  goals: number;
  meets: number;
  injuries: number;
  weeklyPlans: number;
  workouts: number;
  workoutLogs: number;
  readiness: number;
  planAdjustments: number;
};

export type StoreData = {
  version: 1;
  athletes: Athlete[];
  athleteEvents: AthleteEvent[];
  goals: Goal[];
  availability: Availability[];
  meets: Meet[];
  injuryHistory: Injury[];
  weeklyPlans: WeeklyPlan[];
  workouts: Workout[];
  workoutLogs: WorkoutLog[];
  dailyReadiness: DailyReadiness[];
  planAdjustments: PlanAdjustment[];
  sequences: Sequences;
};

const DATA_DIR =
  process.env.SPRINT_COACH_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function emptyStore(): StoreData {
  return {
    version: 1,
    athletes: [],
    athleteEvents: [],
    goals: [],
    availability: [],
    meets: [],
    injuryHistory: [],
    weeklyPlans: [],
    workouts: [],
    workoutLogs: [],
    dailyReadiness: [],
    planAdjustments: [],
    sequences: {
      athleteEvents: 0,
      goals: 0,
      meets: 0,
      injuries: 0,
      weeklyPlans: 0,
      workouts: 0,
      workoutLogs: 0,
      readiness: 0,
      planAdjustments: 0,
    },
  };
}

async function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureDir();
  if (!existsSync(DATA_FILE)) return emptyStore();
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    if (!raw.trim()) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return { ...emptyStore(), ...parsed, version: 1 };
  } catch (err) {
    throw new Error(
      `Failed to read ${DATA_FILE}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await ensureDir();
  const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, DATA_FILE);
}

type GlobalLock = { __sprintCoachWriteLock?: Promise<unknown> };
const g = globalThis as unknown as GlobalLock;

/**
 * Read the store, hand it to `fn` which may mutate it in place, then atomically
 * write it back. Returns whatever `fn` returns. Concurrent calls are serialized
 * via a shared promise chain so two requests can't lose each other's writes.
 */
export async function updateStore<T>(
  fn: (data: StoreData) => T | Promise<T>
): Promise<T> {
  const previous = g.__sprintCoachWriteLock ?? Promise.resolve();
  const next = previous.then(async () => {
    const data = await readStore();
    const result = await fn(data);
    await writeStore(data);
    return result;
  });
  g.__sprintCoachWriteLock = next.catch(() => {});
  return next as Promise<T>;
}

export function nextId(seq: keyof Sequences, data: StoreData): number {
  data.sequences[seq] = (data.sequences[seq] ?? 0) + 1;
  return data.sequences[seq];
}

export function nowISO(): string {
  return new Date().toISOString();
}

export const _internal = {
  DATA_DIR,
  DATA_FILE,
  emptyStore,
};
