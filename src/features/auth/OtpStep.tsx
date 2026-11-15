// Confirm the patient's six-digit code and offer time-limited resending.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useCountdown } from "@/hooks/useCountdown";
import { normalizeDigits } from "@/lib/format/digits";
import { registerPatient, verifyOtp } from "@/backend/commands";
import { AuthError } from "./AuthError";
import type { PendingRegistration } from "./RegisterForm";
import { TurnstileWidget, type TurnstileHandle } from "./TurnstileWidget";

type Props = {
  registration: PendingRegistration;
  onBack: () => void;
  onVerified: (result: { needsProfile: boolean }) => void;
};

export function OtpStep({ registration, onBack, onVerified }: Props) {
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState(registration.otpSentAt);
  const [captchaToken, setCaptchaToken] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const remaining = useCountdown(sentAt);
  const input = useRef<HTMLInputElement>(null);
  const challenge = useRef<TurnstileHandle>(null);
  const verification = useActionMutation();
  const resend = useActionMutation();

  useEffect(() => { input.current?.focus(); }, []);
  const isBusy = verification.isPending || resend.isPending;

  async function confirm(value: string) {
    if (value.length !== 6 || isBusy) return;
    const result = await verification.run(() => verifyOtp({ phone: registration.phone, code: value }), {
      otpField: "code",
    });
    if (result?.ok) onVerified(result.data);
    if (result?.ok === false && result.error.code === "OTP_INVALID") setCode("");
  }

  async function sendAgain() {
    if (!captchaToken || remaining > 0 || isBusy) return;
    const { phone, password } = registration;
    const result = await resend.run(() => registerPatient({ phone, password, captchaToken }), {
      after: () => challenge.current?.reset(),
    });
    if (result?.ok) {
      setSentAt(result.data.otpSentAt);
      setCode("");
      setIsResending(false);
      setAnnouncement("طلبنا إرسال كود جديد.");
    }
  }

  return (
    <>
      <div className="screen-heading">
        <h1 id="screen-title">تأكيد رقم الموبايل</h1>
        <p>اكتب الكود المرسل إلى <bdi dir="ltr">{registration.phone}</bdi>.</p>
      </div>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void confirm(code); }}>
        <AuthError message={verification.formError} />
        <FormField
          ref={input} label="كود التأكيد" name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code"
          value={code} maxLength={6} readOnly={isBusy} error={verification.fieldErrors.code}
          onChange={(event) => {
            const value = normalizeDigits(event.target.value).replace(/\D/g, "").slice(0, 6);
            setCode(value);
            if (value.length === 6) void confirm(value);
          }}
        />
        <Button type="submit" disabled={isBusy || code.length !== 6}>
          {verification.isPending ? "جاري التحقق…" : "تأكيد الرقم"}
        </Button>
      </form>
      <div className="otp-tools">
        <p className="muted" role="status">{announcement}</p>
        <AuthError message={resend.formError ?? Object.values(resend.fieldErrors)[0]} />
        {remaining > 0 ? <p className="muted">إعادة الإرسال بعد {remaining.toLocaleString("ar-EG")} ثانية</p> :
          !isResending && <Button variant="text" disabled={isBusy} onClick={() => {
            setAnnouncement("");
            setIsResending(true);
          }}>إعادة إرسال الكود</Button>}
        {isResending && (
          <>
            <TurnstileWidget ref={challenge} onToken={setCaptchaToken} />
            <Button variant="secondary" disabled={isBusy || !captchaToken} onClick={sendAgain}>
              {resend.isPending ? "جاري الإرسال…" : "إرسال كود جديد"}
            </Button>
          </>
        )}
        <Button variant="text" disabled={isBusy} onClick={onBack}>تعديل رقم الموبايل</Button>
      </div>
      {verification.fieldErrors.code && <p className="auth-footer">عندك حساب؟ <Link href="/login">تسجيل الدخول</Link></p>}
    </>
  );
}
