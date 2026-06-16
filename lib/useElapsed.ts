"use client";

import { useEffect, useState } from "react";

/**
 * Returns elapsed seconds since `active` flipped to true. Resets to 0 when
 * `active` becomes false. Useful for live "Generating… 47s" labels so slow
 * AI calls don't look frozen.
 */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    setSeconds(0);
    const handle = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(handle);
  }, [active]);

  return seconds;
}

export function formatElapsed(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}
