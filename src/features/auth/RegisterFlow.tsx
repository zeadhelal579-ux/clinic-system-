// Move from registration to phone confirmation and route verified patients.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { homeFor } from "@/contracts/route-access";
import { OtpStep } from "./OtpStep";
import { RegisterForm, type PendingRegistration } from "./RegisterForm";

type Step = { kind: "register"; phone: string } | { kind: "verify"; registration: PendingRegistration };

export function RegisterFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "register", phone: "" });

  if (step.kind === "register") {
    return <RegisterForm phone={step.phone} onSent={(registration) => setStep({ kind: "verify", registration })} />;
  }

  return (
    <OtpStep
      registration={step.registration}
      onBack={() => setStep({ kind: "register", phone: step.registration.phone })}
      onVerified={({ needsProfile }) => {
        setStep({ kind: "register", phone: "" });
        router.replace(homeFor("patient", !needsProfile));
      }}
    />
  );
}
