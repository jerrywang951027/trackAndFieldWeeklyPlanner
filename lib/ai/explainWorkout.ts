import { anthropic, ANTHROPIC_MODEL } from "@/lib/anthropic";
import type { Workout } from "@/db/schema";

/**
 * Lazy "why" explanation for an existing workout. Used when the stored
 * whyExplanation is missing — normally the planner produces this up-front.
 */
export async function explainWorkout(
  workout: Workout,
  context: { athleteName: string; goals: string[]; recentFatigueBand?: string }
): Promise<string> {
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 400,
    temperature: 0.7,
    system:
      "You are a sprints coach explaining a single workout to your athlete in 2-3 sentences. Tone: confident, motivating, educational. No bullet lists. No markdown. Plain prose only.",
    messages: [
      {
        role: "user",
        content: `Athlete: ${context.athleteName}
Goals: ${context.goals.join(", ") || "(none specified)"}
Recent fatigue level: ${context.recentFatigueBand ?? "unknown"}

Workout:
- Title: ${workout.title}
- Type: ${workout.type}
- Intensity: ${workout.intensity}/10
- Duration: ${workout.durationMin} min
- Coaching notes: ${workout.coachingNotes ?? "(none)"}

Explain WHY this workout is in the plan today.`,
      },
    ],
  });
  const textBlock = resp.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
}
