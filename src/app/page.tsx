// Direct each authenticated role to its clinic workspace.
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { homeFor } from "@/contracts/route-access";
import { getSessionContext } from "@/backend/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  if (session.role) redirect(homeFor(session.role));

  return (
    <main className="auth-shell">
      <section className="auth-card screen-heading">
        <h1>الحساب غير مفعّل</h1>
        <p>تواصل مع العيادة لتفعيل صلاحية الدخول.</p>
        <LogoutButton />
      </section>
    </main>
  );
}
