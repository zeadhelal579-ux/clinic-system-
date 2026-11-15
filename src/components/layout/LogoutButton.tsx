// End the active session and replace the current history entry with sign-in.
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { logout } from "@/backend/commands";

export function LogoutButton() {
  const router = useRouter();
  const { run, isPending, formError } = useActionMutation();

  async function signOut() {
    const result = await run(logout);
    if (result?.ok) router.replace("/login");
  }

  return (
    <div>
      <Button variant="secondary" onClick={signOut} disabled={isPending}>
        {isPending ? "جاري تسجيل الخروج…" : "تسجيل الخروج"}
      </Button>
      {formError && <small className="field-error" role="alert">{formError}</small>}
    </div>
  );
}
