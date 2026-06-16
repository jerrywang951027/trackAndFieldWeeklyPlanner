import { format } from "date-fns";
import {
  getReadinessForDate,
  getRecentReadiness,
} from "@/lib/queries";
import { todayISO } from "@/lib/sprintDomain";
import { ReadinessForm } from "@/components/ReadinessForm";
import { Card, CardContent } from "@/components/ui/card";
import { readinessScore } from "@/lib/sprintDomain";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  const today = todayISO();
  const [todays, recent] = await Promise.all([
    getReadinessForDate(today),
    getRecentReadiness(7),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Recovery</h1>
        <p className="text-muted-foreground">
          Quick check-in. Takes under a minute.
        </p>
      </header>

      <ReadinessForm date={today} existing={todays} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Last 7 days</h2>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No check-ins yet — your first one above will populate this list.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => {
              const s = readinessScore(r);
              return (
                <li key={r.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <div className="font-medium">
                          {format(new Date(r.date), "EEE MMM d")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sleep {r.sleepHours ?? "—"}h · Soreness {r.soreness ?? "—"} · Fatigue {r.fatigue ?? "—"} · Mood {r.mood ?? "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.score ?? "—"}</span>
                        <Badge
                          variant={
                            s.band === "high"
                              ? "success"
                              : s.band === "low"
                                ? "warning"
                                : "outline"
                          }
                        >
                          {s.band}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
