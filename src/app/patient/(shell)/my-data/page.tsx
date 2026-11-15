// Load the patient's own editable profile and phone change controls.
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/features/profile/CompleteProfileForm";
import { PhoneChangeDialog } from "@/features/profile/PhoneChangeDialog";
import { requireRoleOrRedirect } from "@/backend/session";
import { getMyProfile } from "@/backend/reads";

export default async function MyDataPage() {
  await requireRoleOrRedirect("patient");
  const { patient, phone, alerts, profileComplete } = await getMyProfile();
  if (!profileComplete || !patient) redirect("/patient/complete-profile");
  return (
    <main className="workspace-content workspace-content--narrow">
      <div className="screen-heading"><Link href="/patient/home">الرئيسية</Link><h1>بياناتي</h1></div>
      <CompleteProfileForm mode="edit" phone={phone} patient={patient} alerts={alerts} />
      <PhoneChangeDialog />
    </main>
  );
}
