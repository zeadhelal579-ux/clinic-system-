// Load the patient's confirmed number and existing details for onboarding.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/features/profile/CompleteProfileForm";
import { requireRoleOrRedirect } from "@/backend/session";
import { getMyProfile } from "@/backend/reads";

export const metadata: Metadata = { title: "استكمال بياناتي" };

export default async function CompleteProfilePage() {
  await requireRoleOrRedirect("patient");
  const { patient, alerts, phone, profileComplete } = await getMyProfile();
  if (profileComplete) redirect("/patient/home");

  return (
    <main className="workspace-content workspace-content--narrow">
      <div className="screen-heading">
        <h1>استكمال بياناتي</h1>
        <p>كمّل بياناتك عشان تقدر تحجز موعد في العيادة.</p>
      </div>
      <CompleteProfileForm phone={phone} patient={patient} alerts={alerts} />
    </main>
  );
}
