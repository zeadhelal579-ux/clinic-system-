// Frame the authentication screens with the clinic identity.
import type { ReactNode } from "react";
import { clinicName } from "@/i18n/messages";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="auth-shell">
      <div className="auth-frame">
        <header className="clinic-brand">
          <span className="clinic-mark" aria-hidden="true" />
          <span>{clinicName}</span>
        </header>
        <section className="auth-card" aria-labelledby="screen-title">{children}</section>
      </div>
    </main>
  );
}
