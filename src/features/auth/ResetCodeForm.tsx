// Set a new password after the backend verifies the recovery code.
"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { errorMessage } from "@/i18n/messages";
import { normalizeDigits } from "@/lib/format/digits";
import { confirmPasswordReset } from "@/backend/commands";
import { AuthError } from "./AuthError";
import { PasswordField } from "./PasswordField";

type Props = { phone: string; onDone: () => void; children: ReactNode };

export function ResetCodeForm({ phone, onDone, children }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { run, formError, fieldErrors, setFieldErrors, isPending } = useActionMutation();
  useEffect(() => { input.current?.focus(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = form.get("newPassword");
    if (newPassword !== form.get("confirmPassword")) {
      setFieldErrors({ confirmPassword: errorMessage("validation.password_mismatch") });
      return;
    }

    const code = normalizeDigits(String(form.get("code") ?? ""));
    const result = await run(() => confirmPasswordReset({ phone, code, newPassword }), { otpField: "code" });
    if (result?.ok) onDone();
  }

  return (
    <form className="form-stack" onSubmit={submit} aria-busy={isPending}>
      <AuthError message={formError} />
      <fieldset className="form-stack" disabled={isPending}>
        <FormField
          ref={input} label="كود التأكيد" name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code"
          required minLength={6} maxLength={6} error={fieldErrors.code}
        />
        <PasswordField
          label="كلمة السر الجديدة" name="newPassword" autoComplete="new-password"
          required minLength={8} hint="٨ أحرف على الأقل" error={fieldErrors.newPassword}
        />
        <PasswordField
          label="تأكيد كلمة السر" name="confirmPassword" autoComplete="new-password"
          required minLength={8} error={fieldErrors.confirmPassword}
        />
        <Button type="submit">{isPending ? "جاري الحفظ…" : "حفظ كلمة السر الجديدة"}</Button>
        <div className="otp-tools">{children}</div>
      </fieldset>
    </form>
  );
}
