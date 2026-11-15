// Reveal medical detail fields only when the patient's answers require them.
"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { YesNoField } from "@/components/ui/YesNoField";
import type { MedicalAlerts } from "@/contracts/clinic";

export function MedicalAlertsFields({ alerts, errors }: {
  alerts: MedicalAlerts;
  errors: Readonly<Record<string, string>>;
}) {
  const [hasAllergy, setAllergy] = useState(alerts.hasAllergy);
  const [hasDisease, setDisease] = useState(alerts.hasChronicDisease);
  const [takesMeds, setMeds] = useState(alerts.takesChronicMeds);

  return (
    <div className="form-stack">
      <h2>التنبيهات الطبية</h2>
      <YesNoField name="hasAllergy" label="هل عندك حساسية من أي شيء؟" value={hasAllergy} onChange={setAllergy} />
      {hasAllergy && <FormField name="allergyText" label="نوع الحساسية" defaultValue={alerts.allergyText ?? ""}
        required maxLength={200} error={errors.allergyText} />}
      <YesNoField name="hasChronicDisease" label="هل عندك أمراض مزمنة؟" value={hasDisease} onChange={setDisease} />
      {hasDisease && (
        <>
          <FormField name="chronicDiseaseText" label="المرض المزمن" defaultValue={alerts.chronicDiseaseText ?? ""}
            required maxLength={200} error={errors.chronicDiseaseText} />
          <YesNoField name="takesChronicMeds" label="هل بتاخد أدوية للمرض المزمن؟" value={takesMeds} onChange={setMeds} />
          {takesMeds && <FormField name="chronicMedsText" label="الأدوية اللي بتاخدها"
            defaultValue={alerts.chronicMedsText ?? ""} required maxLength={300} error={errors.chronicMedsText} />}
        </>
      )}
    </div>
  );
}
