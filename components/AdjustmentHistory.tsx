import { format, formatDistanceToNow } from "date-fns";
import { History, MessageSquareQuote } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanAdjustment } from "@/db/schema";

export function AdjustmentHistory({
  adjustments,
}: {
  adjustments: PlanAdjustment[];
}) {
  if (adjustments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-primary" />
          Adjustments this week
        </CardTitle>
        <CardDescription>
          Every request you&apos;ve sent the AI coach for this week, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {adjustments.map((adj, i) => {
            const when = new Date(adj.appliedAt);
            return (
              <li
                key={adj.id}
                className="relative flex gap-3 rounded-md border border-border bg-background/40 p-3"
              >
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <MessageSquareQuote className="h-3.5 w-3.5" />
                  </span>
                  {i < adjustments.length - 1 && (
                    <span className="mt-1 h-full w-px bg-border/60" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      <time
                        dateTime={adj.appliedAt}
                        title={format(when, "PPpp")}
                      >
                        {formatDistanceToNow(when, { addSuffix: true })}
                      </time>
                      {" · "}
                      {format(when, "MMM d, h:mm a")}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {adj.model}
                    </Badge>
                  </div>
                  <blockquote className="border-l-2 border-primary/40 pl-3 text-sm leading-snug text-foreground/90">
                    {adj.note}
                  </blockquote>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
