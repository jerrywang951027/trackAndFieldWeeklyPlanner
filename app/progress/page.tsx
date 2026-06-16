import { addDays, format, startOfISOWeek, subDays } from "date-fns";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllWorkoutsInRange,
  getAthlete,
  getPRsSummary,
} from "@/lib/queries";
import { SPRINT_EVENTS, todayISO } from "@/lib/sprintDomain";
import { TrainingLoadChart } from "@/components/TrainingLoadChart";
import {
  ConsistencyHeatmap,
  type ConsistencyDay,
} from "@/components/ConsistencyHeatmap";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const athlete = await getAthlete().catch(() => null);
  if (!athlete) redirect("/onboarding");

  const today = new Date();
  const start = subDays(today, 7 * 8 - 1);
  const startISO = format(start, "yyyy-MM-dd");
  const endISO = todayISO();

  const rows = await getAllWorkoutsInRange(startISO, endISO);
  const prs = await getPRsSummary();

  const loadByWeek = new Map<string, number>();
  for (const r of rows) {
    if (!r.log?.completed) continue;
    const weekStart = format(
      startOfISOWeek(new Date(r.workout.date)),
      "yyyy-MM-dd"
    );
    const load = (r.workout.intensity ?? 0) * (r.workout.durationMin ?? 0);
    loadByWeek.set(weekStart, (loadByWeek.get(weekStart) ?? 0) + load);
  }
  const loadData = Array.from(loadByWeek.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, load]) => ({
      week: format(new Date(week), "MMM d"),
      load,
    }));

  const daysMap = new Map<string, ConsistencyDay["status"]>();
  for (const r of rows) {
    const status: ConsistencyDay["status"] = r.log?.completed
      ? "logged"
      : r.workout.type === "rest"
        ? "rest"
        : new Date(r.workout.date) > today
          ? "future"
          : r.log
            ? "missed"
            : "planned";
    daysMap.set(r.workout.date, status);
  }
  const days: ConsistencyDay[] = [];
  for (let d = 0; d < 7 * 8; d++) {
    const date = format(addDays(start, d), "yyyy-MM-dd");
    days.push({ date, status: daysMap.get(date) ?? "rest" });
  }

  const totalLogged = rows.filter((r) => r.log?.completed).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">
          The last 8 weeks of training, at a glance.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sessions completed</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{totalLogged}</span>
            <p className="text-xs text-muted-foreground">in the last 8 weeks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average weekly load</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {loadData.length
                ? Math.round(
                    loadData.reduce((a, b) => a + b.load, 0) / loadData.length
                  )
                : 0}
            </span>
            <p className="text-xs text-muted-foreground">intensity × minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active streak</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{calcStreak(rows)}</span>
            <p className="text-xs text-muted-foreground">consecutive days logged</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Weekly training load</CardTitle>
          <CardDescription>
            Sum of intensity × duration of logged sessions per week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingLoadChart data={loadData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consistency</CardTitle>
          <CardDescription>
            Each square is a day in the last 8 weeks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConsistencyHeatmap days={days} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal records</CardTitle>
          <CardDescription>
            Edit these on the Profile page after each meet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No PRs recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {prs.map((p) => {
                const meta = SPRINT_EVENTS.find((e) => e.code === p.eventCode);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">
                        {meta?.label ?? p.eventCode}
                      </span>
                      {p.isPrimary && <Badge variant="secondary">Primary</Badge>}
                    </span>
                    <span className="font-mono text-base">
                      {p.prSeconds ? `${p.prSeconds.toFixed(2)}s` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function calcStreak(
  rows: Awaited<ReturnType<typeof getAllWorkoutsInRange>>
): number {
  const loggedDates = new Set(
    rows.filter((r) => r.log?.completed).map((r) => r.workout.date)
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const date = format(subDays(today, i), "yyyy-MM-dd");
    if (loggedDates.has(date)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}
