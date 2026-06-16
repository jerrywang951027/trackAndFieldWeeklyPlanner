import Link from "next/link";
import { format } from "date-fns";
import {
  Bed,
  Dumbbell,
  Footprints,
  HeartHandshake,
  Sparkle,
  Trophy,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { intensityLabel, workoutTypeLabel } from "@/lib/sprintDomain";
import type { Workout, WorkoutLog } from "@/db/schema";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  sprint: Zap,
  gym: Dumbbell,
  technical: Footprints,
  mobility: HeartHandshake,
  recovery: Bed,
  rest: Bed,
  meet_prep: Trophy,
};

function intensityVariant(intensity: number) {
  if (intensity >= 8) return "destructive";
  if (intensity >= 6) return "default";
  if (intensity >= 3) return "secondary";
  return "outline";
}

export function WorkoutCard({
  workout,
  log,
  compact = false,
  href,
}: {
  workout: Workout;
  log?: WorkoutLog | null;
  compact?: boolean;
  href?: string;
}) {
  const Icon = TYPE_ICON[workout.type] ?? Sparkle;
  const date = new Date(workout.date);
  const inner = (
    <Card className="h-full transition hover:border-primary/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {format(date, "EEE MMM d")}
              </div>
              <div className="text-sm font-semibold leading-tight">
                {workout.title}
              </div>
            </div>
          </div>
          {log?.completed && <Badge variant="success">Logged</Badge>}
        </div>
        {!compact && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={intensityVariant(workout.intensity)}>
              {intensityLabel(workout.intensity)} ({workout.intensity}/10)
            </Badge>
            <Badge variant="outline">{workoutTypeLabel(workout.type)}</Badge>
            <span className="text-muted-foreground">
              {workout.durationMin} min
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}
