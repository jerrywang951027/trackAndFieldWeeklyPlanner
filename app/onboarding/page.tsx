import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Sprint Coach
        </h1>
        <p className="mt-2 text-muted-foreground">
          Let&apos;s build your personalized training plan in under 2 minutes.
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
