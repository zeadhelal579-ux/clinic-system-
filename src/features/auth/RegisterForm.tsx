// Request a patient verification code using the registration action.
"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { registerPatient } from "@/backend/commands";
import { AuthError } from "./AuthError";
import { PasswordField } from "./PasswordField";
import { TurnstileWidget, type TurnstileHandle } from "./TurnstileWidget";

export type PendingRegistration = { phone: string; password: string; otpSentAt: string };

export function RegisterForm({ phone, onSent }: {
  phone: string;
  onSent: (registration: PendingRegistration) => void;
}) {
  const challenge = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const { run, formError, fieldErrors, isPending } = useActionMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captchaToken) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const input = { phone: form.get("phone"), password, captchaToken };
    const result = await run(() => registerPatient(input), { after: () => challenge.current?.reset() });
    if (result?.ok) onSent({ ...result.data, password });
  }

  return (
    <>
      <div className="screen-heading">
        <h1 id="screen-title">إنشاء حساب مريض</h1>
        <p>هنبعت كود على موبايلك لتأكيد الرقم.</p>
      </div>
      <form className="form-stack" onSubmit={submit} aria-busy={isPending}>
        <AuthError message={formError} />
        <fieldset className="form-stack" disabled={isPending}>
          <FormField
            label="رقم الموبايل" name="phone" type="tel" dir="ltr" autoComplete="tel"
            defaultValue={phone} placeholder="01XXXXXXXXX" required maxLength={32} error={fieldErrors.phone}
          />
          <PasswordField
            label="كلمة السر" name="password" autoComplete="new-password" required
            hint="٨ أحرف على الأقل" minLength={8} error={fieldErrors.password}
          />
        </fieldset>
        <TurnstileWidget ref={challenge} onToken={setCaptchaToken} />
        <Button type="submit" disabled={isPending || !captchaToken}>
          {isPending ? "جاري إرسال الكود…" : "إرسال الكود"}
        </Button>
      </form>
      <p className="auth-footer">عندك حساب؟ <Link href="/login">تسجيل الدخول</Link></p>
    </>
  );
}
