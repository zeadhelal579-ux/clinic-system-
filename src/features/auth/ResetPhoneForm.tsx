// Request a password recovery code without revealing whether a number is registered.
"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { requestPasswordReset } from "@/backend/commands";
import { AuthError } from "./AuthError";
import { TurnstileWidget, type TurnstileHandle } from "./TurnstileWidget";

type Props = { phone: string; onBack: () => void; onSent: (phone: string, sentAt: string) => void };

export function ResetPhoneForm({ phone, onBack, onSent }: Props) {
  const challenge = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const { run, formError, fieldErrors, isPending } = useActionMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captchaToken) return;
    const value = String(new FormData(event.currentTarget).get("phone") ?? "").trim();
    const result = await run(() => requestPasswordReset({ phone: value, captchaToken }), {
      after: () => challenge.current?.reset(),
    });
    if (result?.ok) onSent(value, result.data.otpSentAt);
  }

  return (
    <form className="form-stack" onSubmit={submit} aria-busy={isPending}>
      <AuthError message={formError} />
      <FormField
        label="رقم الموبايل" name="phone" type="tel" dir="ltr" autoComplete="tel"
        placeholder="01XXXXXXXXX" defaultValue={phone} required maxLength={32}
        disabled={isPending} error={fieldErrors.phone}
      />
      <TurnstileWidget ref={challenge} onToken={setCaptchaToken} />
      <Button type="submit" disabled={isPending || !captchaToken}>
        {isPending ? "جاري إرسال الكود…" : "إرسال كود الاسترجاع"}
      </Button>
      <Button variant="text" disabled={isPending} onClick={onBack}>الرجوع لتسجيل الدخول</Button>
    </form>
  );
}
