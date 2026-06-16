import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, ChevronRight, HeartPulse, Trophy } from "lucide-react";
import {
  getAthlete,
  getAthleteWithContext,
  getCurrentWeekPlan,
  getRecentReadiness,
  getReadinessForDate,
} from "@/lib/queries";
import {
  averageReadiness,
  deriveSeasonPhase,
  readinessScore,
  todayISO,
  weekStartISO,
} from "@/lib/sprintDomain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WorkoutCard } from "@/components/WorkoutCard";
import { GeneratePlanButton } from "@/components/GeneratePlanButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const athlete = await getAthlete().catch(() => null);
  if (!athlete) redirect("/onboarding");

  const ctx = await getAthleteWithContext();
  const weekStart = weekStartISO();
  const planBundle = await getCurrentWeekPlan(weekStart);
  const today = todayISO();
  const todayWorkout =
    planBundle?.workouts.find((w) => w.date === today) ?? null;

  const [todayReadiness, recentReadiness] = await Promise.all([
    getReadinessForDate(today),
    getRecentReadiness(7),
  ]);
  const todayScore = readinessScore(todayReadiness);
  const weekAvg = averageReadiness(recentReadiness);

  const phase = deriveSeasonPhase(ctx?.meets ?? []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMM d")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Hey {athlete.name.split(" ")[0]}.
        </h1>
        <p className="text-muted-foreground">
          {todayWorkout
            ? "Here's your day."
            : planBundle
              ? "Rest day — that's part of the plan."
              : "Let's build your first week."}
        </p>
      </header>

      {!planBundle && (
        <Card>
          <CardHeader>
            <CardTitle>No plan for this week yet</CardTitle>
            <CardDescription>
              Generate a personalized 7-day sprint plan tuned to your goals,
              meets and recent fatigue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GeneratePlanButton />
          </CardContent>
        </Card>
      )}

      {todayWorkout && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today</h2>
            <Link
              href={`/plan/${todayWorkout.id}`}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Open <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <WorkoutCard
            workout={todayWorkout}
            href={`/plan/${todayWorkout.id}`}
          />
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <HeartPulse className="h-4 w-4" /> Today&apos;s readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayScore.score !== null ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">{todayScore.score}</span>
                  <Badge
                    variant={
                      todayScore.band === "high"
                        ? "success"
                        : todayScore.band === "moderate"
                          ? "outline"
                          : "warning"
                    }
                  >
                    {todayScore.band}
                  </Badge>
                </div>
                <Progress value={todayScore.score} className="mt-2" />
              </>
            ) : (
              <Link
                href="/recovery"
                className="text-sm text-primary hover:underline"
              >
                Check in →
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> 7-day average
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weekAvg.avgScore !== null ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">{weekAvg.avgScore}</span>
                  <Badge variant="outline">{weekAvg.band}</Badge>
                </div>
                <Progress value={weekAvg.avgScore} className="mt-2" />
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Log a few days to see this trend.
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4" /> Next A-meet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {phase.nextA ? (
              <>
                <div className="text-base font-semibold leading-tight">
                  {phase.nextA.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {format(new Date(phase.nextA.date), "MMM d")} ·{" "}
                  {phase.daysToNextA} days
                </div>
                <Badge variant="secondary" className="mt-2">
                  Phase: {phase.phase.replace(/_/g, " ")}
                </Badge>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                No A-meet scheduled.{" "}
                <Link href="/profile" className="text-primary hover:underline">
                  Add one
                </Link>
              </span>
            )}
          </CardContent>
        </Card>
      </section>

      {planBundle && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">This week&apos;s focus</h2>
            <Link
              href="/plan"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Full plan <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {planBundle.plan.focus && (
            <Card>
              <CardContent className="p-4 text-sm">
                {planBundle.plan.focus}
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
