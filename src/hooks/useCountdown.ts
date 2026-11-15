// Track a resend deadline without losing time in background browser tabs.
"use client";

import { useEffect, useState } from "react";

const RESEND_DELAY_SECONDS = 60;

export function useCountdown(sentAt: string): number {
  const [remaining, setRemaining] = useState(RESEND_DELAY_SECONDS);

  useEffect(() => {
    const deadline = Date.parse(sentAt) + RESEND_DELAY_SECONDS * 1_000;
    function tick() {
      const seconds = Math.ceil((deadline - Date.now()) / 1_000);
      setRemaining(Math.max(0, Math.min(RESEND_DELAY_SECONDS, seconds)));
    }

    const interval = window.setInterval(tick, 1_000);
    tick();
    return () => window.clearInterval(interval);
  }, [sentAt]);

  return remaining;
}
