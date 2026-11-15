// Render the doctor's revenue and rate settings.
import { CashboxView } from "@/features/cashbox/CashboxView";
import { PricesCard } from "@/features/cashbox/PricesCard";
import { requireRoleOrRedirect } from "@/backend/session";
import { getPrices } from "@/backend/reads";

export default async function DoctorCashboxPage() {
  await requireRoleOrRedirect("doctor");
  const { priceNew, priceFollowUp } = await getPrices();
  return <CashboxView returnTo="/doctor/queue"><PricesCard priceNew={priceNew} priceFollowUp={priceFollowUp} /></CashboxView>;
}
