/**
 * Single-user assumption lives here. Swap this function to integrate real auth
 * (Auth.js, Clerk, etc.) without touching feature code.
 */
export const ATHLETE_ID = "me";

export function getCurrentAthleteId(): string {
  return ATHLETE_ID;
}
