"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SPRINT_EVENTS, ALL_EVENT_CATEGORIES } from "@/lib/sprintDomain";
import { completeOnboarding, type OnboardingInput } from "./actions";

const STEPS = [
  "Event",
  "Profile",
  "Goals",
  "Availability",
  "Competitions",
  "Recovery",
] as const;

type Meet = { name: string; date: string; priority: "A" | "B" | "C" };
type Injury = {
  area: string;
  severity: "minor" | "moderate" | "severe";
  active: boolean;
  notes?: string;
};

const GOAL_OPTIONS: { value: OnboardingInput["goalKinds"][number]; label: string }[] = [
  { value: "acceleration", label: "Improve acceleration" },
  { value: "top_speed", label: "Increase top speed" },
  { value: "speed_endurance", label: "Improve speed endurance" },
  { value: "strength", label: "Build strength" },
  { value: "peak_for_meet", label: "Peak for a championship" },
  { value: "break_time", label: "Break a target time" },
  { value: "general_fitness", label: "General fitness" },
];

const EQUIPMENT_OPTIONS = [
  "Barbell + plates",
  "Dumbbells",
  "Med ball",
  "Plyo box",
  "Hurdles",
  "Sled",
  "Resistance bands",
];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [experienceYears, setExperienceYears] = useState<string>("");
  const [level, setLevel] = useState<OnboardingInput["level"] | "">("");

  const [primaryEvent, setPrimaryEvent] =
    useState<OnboardingInput["primaryEvent"]>("sprints_100m");
  const [secondaryEvents, setSecondaryEvents] = useState<
    OnboardingInput["secondaryEvents"]
  >([]);
  const [prSeconds, setPrSeconds] = useState<string>("");

  const [goalKinds, setGoalKinds] = useState<OnboardingInput["goalKinds"]>([
    "top_speed",
  ]);
  const [goalNotes, setGoalNotes] = useState("");

  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [sessionMinutes, setSessionMinutes] = useState<number>(75);
  const [hasTrack, setHasTrack] = useState(true);
  const [hasGym, setHasGym] = useState(true);
  const [equipment, setEquipment] = useState<string[]>([]);

  const [meetsList, setMeetsList] = useState<Meet[]>([]);
  const [newMeet, setNewMeet] = useState<Meet>({
    name: "",
    date: "",
    priority: "B",
  });

  const [injuriesList, setInjuriesList] = useState<Injury[]>([]);
  const [newInjury, setNewInjury] = useState<Injury>({
    area: "",
    severity: "minor",
    active: false,
    notes: "",
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = (() => {
    if (step === 0) return !!primaryEvent;
    if (step === 1) return name.trim().length > 0;
    if (step === 3) return daysPerWeek >= 1 && sessionMinutes >= 20;
    return true;
  })();

  function next() {
    setError(null);
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function prev() {
    setError(null);
    if (step > 0) setStep(step - 1);
  }

  function submit() {
    setError(null);
    const payload: OnboardingInput = {
      name: name.trim(),
      age: age ? Number(age) : undefined,
      sex: sex || undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      experienceYears: experienceYears ? Number(experienceYears) : undefined,
      level: level || undefined,
      primaryEvent,
      secondaryEvents,
      prSeconds: prSeconds ? Number(prSeconds) : undefined,
      goalKinds,
      goalNotes: goalNotes || undefined,
      daysPerWeek,
      sessionMinutes,
      hasTrack,
      hasGym,
      equipment,
      meets: meetsList,
      injuries: injuriesList,
    };

    startTransition(async () => {
      const res = await completeOnboarding(payload);
      if (res && "ok" in res && !res.ok) {
        setError(res.error);
      }
    });
  }

  function toggleSecondary(code: OnboardingInput["primaryEvent"]) {
    setSecondaryEvents((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function toggleGoal(kind: OnboardingInput["goalKinds"][number]) {
    setGoalKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
    );
  }

  function toggleEquipment(item: string) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function addMeet() {
    if (!newMeet.name || !newMeet.date) return;
    setMeetsList((p) => [...p, newMeet]);
    setNewMeet({ name: "", date: "", priority: "B" });
  }

  function addInjury() {
    if (!newInjury.area) return;
    setInjuriesList((p) => [...p, newInjury]);
    setNewInjury({ area: "", severity: "minor", active: false, notes: "" });
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={progress} />
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <CardTitle>Pick your event category</CardTitle>
            <CardDescription>
              Sprint Coach v1 supports the sprints. Other categories are coming
              soon.
            </CardDescription>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ALL_EVENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  type="button"
                  disabled={!cat.supported}
                  className={`group flex flex-col items-start rounded-lg border p-3 text-left transition ${
                    cat.supported
                      ? "border-primary bg-primary/10"
                      : "cursor-not-allowed border-border/60 opacity-50"
                  }`}
                >
                  <span className="text-sm font-medium">{cat.label}</span>
                  {!cat.supported && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      Coming soon
                    </Badge>
                  )}
                  {cat.supported && (
                    <Badge variant="success" className="mt-2 text-[10px]">
                      Selected
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <Label>Primary event</Label>
              <div className="grid grid-cols-4 gap-2">
                {SPRINT_EVENTS.map((e) => (
                  <button
                    key={e.code}
                    type="button"
                    onClick={() => setPrimaryEvent(e.code)}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      primaryEvent === e.code
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Secondary events (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {SPRINT_EVENTS.filter((e) => e.code !== primaryEvent).map(
                  (e) => (
                    <button
                      key={e.code}
                      type="button"
                      onClick={() => toggleSecondary(e.code)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        secondaryEvents.includes(e.code)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {e.label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr">
                Current PR for{" "}
                {SPRINT_EVENTS.find((e) => e.code === primaryEvent)?.label}{" "}
                (seconds, optional)
              </Label>
              <Input
                id="pr"
                type="number"
                step="0.01"
                placeholder="e.g. 11.42"
                value={prSeconds}
                onChange={(e) => setPrSeconds(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <CardTitle>About you</CardTitle>
            <CardDescription>
              Only name is required — the rest helps the AI dial in your plan.
            </CardDescription>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <select
                  id="sex"
                  value={sex}
                  onChange={(e) =>
                    setSex(e.target.value as typeof sex)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp">Years training</Label>
                <Input
                  id="exp"
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <select
                  id="level"
                  value={level}
                  onChange={(e) =>
                    setLevel(e.target.value as typeof level)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-</option>
                  <option value="high_school">High school</option>
                  <option value="collegiate">Collegiate</option>
                  <option value="club">Club</option>
                  <option value="amateur">Amateur</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <CardTitle>What are you working toward?</CardTitle>
            <CardDescription>Pick one or more goals.</CardDescription>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => toggleGoal(g.value)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                    goalKinds.includes(g.value)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span>{g.label}</span>
                  {goalKinds.includes(g.value) && (
                    <Badge variant="success" className="text-[10px]">
                      On
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goalNotes">Anything else? (optional)</Label>
              <Textarea
                id="goalNotes"
                value={goalNotes}
                onChange={(e) => setGoalNotes(e.target.value)}
                placeholder="e.g. I want to break 11s in the 100m this season."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <CardTitle>Training availability</CardTitle>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Training days per week</Label>
                <span className="font-semibold text-primary">{daysPerWeek}</span>
              </div>
              <Slider
                min={1}
                max={7}
                step={1}
                value={[daysPerWeek]}
                onValueChange={(v) => setDaysPerWeek(v[0])}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Average session length</Label>
                <span className="font-semibold text-primary">
                  {sessionMinutes} min
                </span>
              </div>
              <Slider
                min={20}
                max={180}
                step={5}
                value={[sessionMinutes]}
                onValueChange={(v) => setSessionMinutes(v[0])}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="track"
                  checked={hasTrack}
                  onCheckedChange={(v) => setHasTrack(!!v)}
                />
                <Label htmlFor="track">Track access</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="gym"
                  checked={hasGym}
                  onCheckedChange={(v) => setHasGym(!!v)}
                />
                <Label htmlFor="gym">Gym access</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Equipment available</Label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      equipment.includes(item)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <CardTitle>Upcoming meets</CardTitle>
            <CardDescription>
              Add the meets you&apos;re training for. Mark championships as
              priority A.
            </CardDescription>
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_100px_auto]">
              <Input
                placeholder="Meet name"
                value={newMeet.name}
                onChange={(e) =>
                  setNewMeet((m) => ({ ...m, name: e.target.value }))
                }
              />
              <Input
                type="date"
                value={newMeet.date}
                onChange={(e) =>
                  setNewMeet((m) => ({ ...m, date: e.target.value }))
                }
              />
              <select
                value={newMeet.priority}
                onChange={(e) =>
                  setNewMeet((m) => ({
                    ...m,
                    priority: e.target.value as Meet["priority"],
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
              <Button type="button" variant="outline" onClick={addMeet}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2">
              {meetsList.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{m.name}</strong>{" "}
                    <span className="text-muted-foreground">— {m.date}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={m.priority === "A" ? "default" : "outline"}
                    >
                      {m.priority}
                    </Badge>
                    <button
                      type="button"
                      onClick={() =>
                        setMeetsList(meetsList.filter((_, j) => j !== i))
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {meetsList.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No meets yet — that&apos;s fine, you can add them later.
                </p>
              )}
            </ul>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <CardTitle>Injury history</CardTitle>
            <CardDescription>
              Optional — helps the AI avoid risky workloads.
            </CardDescription>

            <div className="grid gap-2 sm:grid-cols-[1fr_140px_100px_auto]">
              <Input
                placeholder="Body area (e.g. hamstring)"
                value={newInjury.area}
                onChange={(e) =>
                  setNewInjury((i) => ({ ...i, area: e.target.value }))
                }
              />
              <select
                value={newInjury.severity}
                onChange={(e) =>
                  setNewInjury((i) => ({
                    ...i,
                    severity: e.target.value as Injury["severity"],
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={newInjury.active}
                  onCheckedChange={(v) =>
                    setNewInjury((i) => ({ ...i, active: !!v }))
                  }
                />
                Active
              </label>
              <Button type="button" variant="outline" onClick={addInjury}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2">
              {injuriesList.map((inj, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{inj.area}</strong>{" "}
                    <span className="text-muted-foreground">
                      ({inj.severity})
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {inj.active && <Badge variant="warning">Active</Badge>}
                    <button
                      type="button"
                      onClick={() =>
                        setInjuriesList(
                          injuriesList.filter((_, j) => j !== i)
                        )
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {injuriesList.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nothing to report — even better.
                </p>
              )}
            </ul>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={prev}
            disabled={step === 0 || submitting}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} disabled={!canNext}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Finish & generate plan
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
