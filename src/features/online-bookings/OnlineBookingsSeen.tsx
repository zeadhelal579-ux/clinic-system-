// Acknowledge the visible online bookings once after their list is opened.
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { markOnlineBookingsSeen } from "@/backend/commands";

export function OnlineBookingsSeen({ appointmentIds }: { appointmentIds: string[] }) {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const [isRetrying, setRetrying] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void markOnlineBookingsSeen({ appointmentIds }).then((result) => setFailed(!result.ok), () => setFailed(true));
  }, [appointmentIds]);

  async function retry() {
    setRetrying(true);
    try {
      const result = await markOnlineBookingsSeen({ appointmentIds });
      setFailed(!result.ok);
    } catch {
      setFailed(true);
    } finally {
      setRetrying(false);
    }
  }

  if (!failed) return null;
  return (
    <div className="workspace-panel">
      <p role="alert">تعذّر تحديث علامة الحجوزات الجديدة.</p>
      <Button variant="secondary" onClick={retry} disabled={isRetrying}>إعادة المحاولة</Button>
    </div>
  );
}
