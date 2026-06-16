import { format } from "date-fns";

export type ConsistencyDay = {
  date: string;
  status: "rest" | "planned" | "logged" | "missed" | "future";
};

const COLOR: Record<ConsistencyDay["status"], string> = {
  logged: "bg-primary",
  planned: "bg-primary/30",
  missed: "bg-destructive/30",
  rest: "bg-secondary",
  future: "bg-secondary/40",
};

export function ConsistencyHeatmap({ days }: { days: ConsistencyDay[] }) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Once you have a few weeks of training, this will show your consistency
        pattern.
      </p>
    );
  }
  const weeks: ConsistencyDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${format(new Date(d.date), "EEE MMM d")} — ${d.status}`}
            className={`h-7 rounded-sm ${COLOR[d.status]}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <Legend label="Logged" cls={COLOR.logged} />
        <Legend label="Planned" cls={COLOR.planned} />
        <Legend label="Missed" cls={COLOR.missed} />
        <Legend label="Rest" cls={COLOR.rest} />
      </div>
    </div>
  );
}

function Legend({ label, cls }: { label: string; cls: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded-sm ${cls}`} />
      {label}
    </span>
  );
}
