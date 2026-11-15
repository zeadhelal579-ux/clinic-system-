// Recover a patient password through a phone challenge and a one-time code.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCountdown } from "@/hooks/useCountdown";
import { ResetCodeForm } from "./ResetCodeForm";
import { ResetPhoneForm } from "./ResetPhoneForm";

type Step = { kind: "phone"; phone: string } | { kind: "code"; phone: string; sentAt: string } | { kind: "done" };

export function ResetPasswordFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "phone", phone: "" });

  return (
    <>
      <div className="screen-heading">
        <h1 id="screen-title">{step.kind === "done" ? "تم تغيير كلمة السر" : "استرجاع كلمة السر"}</h1>
        {step.kind === "phone" && <p>اكتب رقم الموبايل المرتبط بحساب المريض.</p>}
        {step.kind === "code" && <p>لو الرقم <bdi dir="ltr">{step.phone}</bdi> مسجّل، هيوصلك كود التأكيد.</p>}
        {step.kind === "done" && <p role="status">تقدر تسجّل الدخول بكلمة السر الجديدة.</p>}
      </div>
      {step.kind === "phone" && <ResetPhoneForm phone={step.phone} onBack={onBack} onSent={(phone, sentAt) => {
        setStep({ kind: "code", phone, sentAt });
      }} />}
      {step.kind === "code" && <ResetCodeStep
        phone={step.phone}
        sentAt={step.sentAt}
        onResend={() => setStep({ kind: "phone", phone: step.phone })}
        onDone={() => setStep({ kind: "done" })}
      />}
      {step.kind === "done" && <Button className="full-width" onClick={onBack}>الرجوع لتسجيل الدخول</Button>}
    </>
  );
}

type CodeStepProps = { phone: string; sentAt: string; onResend: () => void; onDone: () => void };

function ResetCodeStep({ phone, sentAt, onResend, onDone }: CodeStepProps) {
  const remaining = useCountdown(sentAt);

  return (
    <ResetCodeForm phone={phone} onDone={onDone}>
      {remaining > 0 ? <p className="muted">إعادة الإرسال بعد {remaining.toLocaleString("ar-EG")} ثانية</p> :
        <Button variant="text" onClick={onResend}>إعادة إرسال الكود أو تعديل الرقم</Button>}
    </ResetCodeForm>
  );
}
