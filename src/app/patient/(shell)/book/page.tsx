// Read current appointment availability for the selected Cairo calendar day.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingFlow } from "@/features/booking/BookingFlow";
import { DayStrip } from "@/features/booking/DayStrip";
import { getBookingCalendar } from "@/lib/time/booking-calendar";
import { requireRoleOrRedirect } from "@/backend/session";
import { dateSchema, uuidSchema } from "@/contracts/input";
import { listMyAppointments } from "@/backend/reads";
import { getMyProfile } from "@/backend/reads";
import { getSlots } from "@/backend/reads";

export const metadata: Metadata = { title: "حجز موعد" };

export default async function BookingPage({ searchParams }: {
  searchParams: Promise<{ date?: string | string[]; appointmentId?: string | string[]; type?: string | string[] }>;
}) {
  await requireRoleOrRedirect("patient");
  if (!(await getMyProfile()).profileComplete) redirect("/patient/complete-profile");

  const { today, lastDay, days, timestamp } = getBookingCalendar();
  const query = await searchParams;
  const appointment = query.appointmentId === undefined ? undefined : await findEditableAppointment(query.appointmentId);
  const visitType = appointment?.visitType ?? (query.type === "follow_up" ? "follow_up" : "new");
  const requested = dateSchema.safeParse(query.date);
  const day = requested.success && requested.data >= today && requested.data <= lastDay ? requested.data : today;
  const { slots, open } = await getSlots({ date: day });
  const availableSlots = slots.filter((slot) => slot.available && Date.parse(slot.start) >= timestamp);

  return (
    <main className="workspace-content workspace-content--narrow">
      <div className="screen-heading">
        <Link href="/patient/home">الرجوع للرئيسية</Link>
        <h1>{appointment ? "تعديل الموعد" : "حجز موعد"}</h1>
      </div>
      <DayStrip days={days} day={day} appointmentId={appointment?.id} visitType={visitType}>
        {availableSlots.length > 0 ? <BookingFlow key={`${day}-${appointment?.id ?? visitType}`}
          slots={availableSlots} appointmentId={appointment?.id} initialVisitType={visitType} /> : (
          <section className="workspace-panel">
            <h2>{open ? "مفيش مواعيد متاحة في اليوم ده" : "العيادة مغلقة في اليوم ده"}</h2>
            <p className="muted">اختار يوم تاني من القائمة.</p>
          </section>
        )}
      </DayStrip>
    </main>
  );
}

async function findEditableAppointment(raw: unknown) {
  const id = uuidSchema.safeParse(raw);
  if (!id.success) notFound();
  const { next, upcoming } = await listMyAppointments();
  const appointment = [next, ...upcoming].find((item) => item?.id === id.data && item.status === "booked");
  if (!appointment) notFound();
  return appointment;
}
