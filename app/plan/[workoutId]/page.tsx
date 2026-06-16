import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getLogForWorkout,
  getWorkoutById,
} from "@/lib/queries";
import { intensityLabel, workoutTypeLabel } from "@/lib/sprintDomain";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const id = Number(workoutId);
  if (!Number.isFinite(id)) notFound();
  const workout = await getWorkoutById(id);
  if (!workout) notFound();
  const log = await getLogForWorkout(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/plan"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to week
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {format(new Date(workout.date), "EEEE, MMMM d")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{workout.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{workoutTypeLabel(workout.type)}</Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {intensityLabel(workout.intensity)} ({workout.intensity}/10)
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {workout.durationMin} min
          </Badge>
          {log?.completed && (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Logged
            </Badge>
          )}
        </div>
      </header>

      {workout.whyExplanation && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Why this session
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            {workout.whyExplanation}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Session</h2>
        {workout.blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks recorded.</p>
        ) : (
          <ol className="space-y-3">
            {workout.blocks.map((block, i) => (
              <li key={i}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {i + 1}. {block.name}
                      </CardTitle>
                      {block.durationMin ? (
                        <span className="text-xs text-muted-foreground">
                          {block.durationMin} min
                        </span>
                      ) : null}
                    </div>
                    {block.description && (
                      <CardDescription>{block.description}</CardDescription>
                    )}
                  </CardHeader>
                  {block.details && block.details.length > 0 && (
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {block.details.map((d, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      {workout.coachingNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <NotebookPen className="h-4 w-4" /> Coaching notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            {workout.coachingNotes}
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <Link href={`/log/${workout.id}`}>
          <Button size="lg">
            {log?.completed ? "Edit log" : "Log this workout"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
