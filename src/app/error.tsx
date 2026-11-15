// Give page-render failures a safe retry message.
"use client";

import { Button } from "@/components/ui/Button";

export default function AppErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-shell">
      <section className="auth-card screen-heading">
        <h1>تعذّر فتح الصفحة</h1>
        <p>جرّب تفتح الصفحة مرة تانية.</p>
        <Button onClick={reset}>حاول مرة أخرى</Button>
      </section>
    </main>
  );
}
