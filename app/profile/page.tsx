import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAthlete, getAthleteWithContext } from "@/lib/queries";
import { SPRINT_EVENTS } from "@/lib/sprintDomain";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const athlete = await getAthlete().catch(() => null);
  if (!athlete) redirect("/onboarding");
  const ctx = await getAthleteWithContext();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">{athlete.name}</p>
        </div>
        <Link href="/onboarding">
          <Button variant="outline">
            <Pencil className="h-4 w-4" /> Edit profile
          </Button>
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Athlete</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Field label="Age" value={athlete.age} />
            <Field label="Sex" value={athlete.sex} />
            <Field label="Level" value={athlete.level?.replace(/_/g, " ")} />
            <Field
              label="Height"
              value={athlete.heightCm ? `${athlete.heightCm} cm` : null}
            />
            <Field
              label="Weight"
              value={athlete.weightKg ? `${athlete.weightKg} kg` : null}
            />
            <Field label="Experience" value={athlete.experienceYears ? `${athlete.experienceYears} yr` : null} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {ctx?.events.map((e) => {
              const meta = SPRINT_EVENTS.find((x) => x.code === e.eventCode);
              return (
                <li key={e.id}>
                  <Badge
                    variant={e.isPrimary ? "default" : "outline"}
                    className="text-xs"
                  >
                    {meta?.label ?? e.eventCode}
                    {e.prSeconds ? ` · ${e.prSeconds.toFixed(2)}s PR` : ""}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {ctx?.goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals set.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {ctx?.goals.map((g) => (
                <li key={g.id} className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {g.kind.replace(/_/g, " ")}
                  {g.notes && (
                    <span className="text-muted-foreground">— {g.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming meets</CardTitle>
          <CardDescription>A-meets drive your tapering window.</CardDescription>
        </CardHeader>
        <CardContent>
          {ctx?.meets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meets scheduled.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {ctx?.meets.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border-b border-border/60 py-1 last:border-0"
                >
                  <span>
                    <strong>{m.name}</strong>{" "}
                    <span className="text-muted-foreground">
                      — {format(new Date(m.date), "MMM d, yyyy")}
                    </span>
                  </span>
                  <Badge
                    variant={m.priority === "A" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {m.priority}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
