import { notFound } from "next/navigation";
import {
  getLogForWorkout,
  getWorkoutById,
} from "@/lib/queries";
import { LogForm } from "./LogForm";

export const dynamic = "force-dynamic";

export default async function LogWorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const id = Number(workoutId);
  if (!Number.isFinite(id)) notFound();
  const workout = await getWorkoutById(id);
  if (!workout) notFound();
  const existing = await getLogForWorkout(id);
  return <LogForm workout={workout} existing={existing} />;
}
