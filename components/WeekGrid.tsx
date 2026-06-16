import { WorkoutCard } from "@/components/WorkoutCard";
import type { Workout, WorkoutLog } from "@/db/schema";

export function WeekGrid({
  workouts,
  logsByWorkoutId,
}: {
  workouts: Workout[];
  logsByWorkoutId: Map<number, WorkoutLog>;
}) {
  if (workouts.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No workouts in this week yet.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {workouts.map((w) => (
        <WorkoutCard
          key={w.id}
          workout={w}
          log={logsByWorkoutId.get(w.id) ?? null}
          compact
          href={`/plan/${w.id}`}
        />
      ))}
    </div>
  );
}
