// Request and confirm a change to the authenticated patient's phone number.
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TurnstileWidget, type TurnstileHandle } from "@/features/auth/TurnstileWidget";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useCountdown } from "@/hooks/useCountdown";
import { normalizeDigits } from "@/lib/format/digits";
import { confirmPhoneChange, requestPhoneChange } from "@/backend/commands";

export function PhoneChangeDialog() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const widget = useRef<TurnstileHandle>(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [sentAt, setSentAt] = useState<string>();
  const [saved, setSaved] = useState(false);
  const { run, isPending, formError, fieldErrors } = useActionMutation();

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const result = await run(() => requestPhoneChange({ newPhone: phone, captchaToken: token }), {
      after: () => widget.current?.reset(),
    });
    if (result?.ok) setSentAt(result.data.otpSentAt);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeDigits(String(new FormData(event.currentTarget).get("code") ?? ""));
    const result = await run(() => confirmPhoneChange({ newPhone: phone, code }), { otpField: "code" });
    if (result?.ok) {
      setSentAt(undefined);
      setPhone("");
      dialog.current?.close();
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <section className="workspace-panel">
      <Button variant="secondary" onClick={() => {
        setOpen(true);
        setToken("");
        setSaved(false);
        dialog.current?.showModal();
      }}>تغيير رقم الموبايل</Button>
      {saved && <p role="status">تم تأكيد الرقم الجديد.</p>}
      <dialog ref={dialog} className="auth-card" aria-labelledby="change-phone-title"
        onCancel={(event) => { if (isPending) event.preventDefault(); }}
        onClose={() => { setOpen(false); setToken(""); }}>
        <div className="form-stack">
          <h2 id="change-phone-title">تغيير رقم الموبايل</h2>
          {formError && <p role="alert" className="form-error">{formError}</p>}
          {open && (sentAt ? (
            <form onSubmit={confirm} className="form-stack">
              <p>لو الكود اتبعت، هيوصل إلى <bdi dir="ltr">{phone}</bdi>.</p>
              <FormField label="كود التأكيد" name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code"
                required minLength={6} maxLength={6} disabled={isPending} error={fieldErrors.code} />
              <Button type="submit" disabled={isPending}>تأكيد الرقم الجديد</Button>
              <ResendPhoneCode key={sentAt} sentAt={sentAt} onResend={() => setSentAt(undefined)} disabled={isPending} />
            </form>
          ) : (
            <form onSubmit={send} className="form-stack">
              <FormField label="رقم الموبايل الجديد" type="tel" dir="ltr" inputMode="tel" maxLength={32}
                value={phone} onChange={(event) => setPhone(event.target.value)} required
                disabled={isPending} error={fieldErrors.newPhone} />
              <TurnstileWidget action="phone_change" ref={widget} onToken={setToken} />
              <Button type="submit" disabled={isPending || !token}>إرسال الكود</Button>
            </form>
          ))}
          <Button variant="secondary" disabled={isPending} onClick={() => dialog.current?.close()}>إغلاق</Button>
        </div>
      </dialog>
    </section>
  );
}

function ResendPhoneCode({ sentAt, onResend, disabled }: {
  sentAt: string; onResend: () => void; disabled: boolean;
}) {
  const remaining = useCountdown(sentAt);
  return remaining ? <p className="muted">إعادة الإرسال بعد {remaining.toLocaleString("ar-EG")} ثانية</p> :
    <Button variant="text" onClick={onResend} disabled={disabled}>إعادة الإرسال أو تعديل الرقم</Button>;
}
