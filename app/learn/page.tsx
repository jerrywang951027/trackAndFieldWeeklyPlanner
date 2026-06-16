import { BookOpen, Lock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TOPICS = [
  {
    title: "Acceleration mechanics",
    blurb:
      "Why the first 30 metres matter most, and what good positions look like.",
  },
  {
    title: "Max velocity",
    blurb: "Stride length vs frequency, and how to develop ground contact.",
  },
  {
    title: "Speed endurance",
    blurb: "Pacing the 200 and 400, and lactate's role in sprint racing.",
  },
  {
    title: "Strength for sprinters",
    blurb: "How heavy is heavy enough, and when to peak.",
  },
  {
    title: "Recovery & sleep",
    blurb: "The hidden engine of every PR.",
  },
  {
    title: "Periodization",
    blurb: "Macro, meso, micro — and how to peak for a single meet.",
  },
];

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Learn</h1>
        <p className="text-muted-foreground">
          Bite-sized lessons on sprint training. Coming with the next release.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Coming soon
          </CardTitle>
          <CardDescription>
            The Learn library is on the roadmap. Full articles will land in v2.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <Card key={t.title} className="opacity-80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {t.title}
                  </span>
                </CardTitle>
                <Badge variant="outline">Soon</Badge>
              </div>
              <CardDescription>{t.blurb}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
