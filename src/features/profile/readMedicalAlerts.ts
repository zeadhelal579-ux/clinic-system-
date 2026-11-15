// Build the medical-alert payload from the visible form fields.
export function readMedicalAlerts(form: FormData) {
  const hasChronicDisease = form.get("hasChronicDisease") === "yes";
  const text = (field: string) => {
    const value = form.get(field);
    return typeof value === "string" ? value : null;
  };
  return {
    hasAllergy: form.get("hasAllergy") === "yes", allergyText: text("allergyText"),
    hasChronicDisease, chronicDiseaseText: text("chronicDiseaseText"),
    takesChronicMeds: hasChronicDisease ? form.get("takesChronicMeds") === "yes" : null,
    chronicMedsText: text("chronicMedsText"),
  };
}
