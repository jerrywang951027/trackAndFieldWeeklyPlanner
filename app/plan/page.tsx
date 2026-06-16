import { format } from "date-fns";
import { redirect } from "next/navigation";
import {
  getAdjustmentsForWeek,
  getAthlete,
  getCurrentWeekPlan,
  getLogsForWorkoutIds,
} from "@/lib/queries";
import { weekStartISO } from "@/lib/sprintDomain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { WeekGrid } from "@/components/WeekGrid";
import { GeneratePlanButton } from "@/components/GeneratePlanButton";
import { AdjustPlanCard } from "@/components/AdjustPlanCard";
import { AdjustmentHistory } from "@/components/AdjustmentHistory";
import type { WorkoutLog } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const athlete = await getAthlete().catch(() => null);
  if (!athlete) redirect("/onboarding");
  const weekStart = weekStartISO();
  const planBundle = await getCurrentWeekPlan(weekStart);

  let logsByWorkoutId = new Map<number, WorkoutLog>();
  if (planBundle && planBundle.workouts.length) {
    logsByWorkoutId = await getLogsForWorkoutIds(
      planBundle.workouts.map((w) => w.id)
    );
  }
  const adjustments = planBundle
    ? await getAdjustmentsForWeek(weekStart)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training plan</h1>
          <p className="text-muted-foreground">
            Week of {format(new Date(weekStart), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {planBundle ? (
            <GeneratePlanButton force label="Regenerate" />
          ) : (
            <GeneratePlanButton />
          )}
        </div>
      </header>

      {planBundle?.plan.focus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly focus</CardTitle>
            <CardDescription>{planBundle.plan.focus}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!planBundle ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No plan yet — hit Generate.
          </CardContent>
        </Card>
      ) : (
        <>
          <WeekGrid
            workouts={planBundle.workouts}
            logsByWorkoutId={logsByWorkoutId}
          />
          <AdjustPlanCard />
          <AdjustmentHistory adjustments={adjustments} />
        </>
      )}
    </div>
  );
}
