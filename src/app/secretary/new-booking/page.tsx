// Select or register a patient and reserve a slot on behalf of reception.
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/features/booking/BookingFlow";
import { DayStrip } from "@/features/booking/DayStrip";
import { PatientPicker } from "@/features/patients/PatientPicker";
import { WalkInForm } from "@/features/patients/WalkInForm";
import { getBookingCalendar } from "@/lib/time/booking-calendar";
import { addClinicDays, clinicDateOf } from "@/lib/time/clinic-time";
import { requireRoleOrRedirect } from "@/backend/session";
import { QUEUE_DATE_RANGE_DAYS } from "@/contracts/input";
import { AppError } from "@/contracts/app-error";
import { dateSchema, uuidSchema } from "@/contracts/input";
import { getOnlineBookingForEdit } from "@/backend/reads";
import { getPatientSummary, searchPatients } from "@/backend/reads";
import { getSlots } from "@/backend/reads";

type Params = Record<string, string | string[] | undefined>;

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireRoleOrRedirect("secretary");
  const query = await searchParams;
  if (query.patientId === undefined && query.appointmentId === undefined) return <ChoosePatient query={query} />;

  const booking = query.appointmentId === undefined ? undefined :
    await getOnlineBookingForEdit({ appointmentId: readId(query.appointmentId) }).catch(handleNotFound);
  const patientId = booking?.patientId ?? readId(query.patientId);
  const { today, timestamp } = getBookingCalendar();
  const lastDay = addClinicDays(today, QUEUE_DATE_RANGE_DAYS);
  const requested = dateSchema.safeParse(query.date ?? (booking && clinicDateOf(booking.slotStart)));
  const day = requested.success && requested.data >= today && requested.data <= lastDay ? requested.data : today;
  const [summary, availability] = await Promise.all([
    getPatientSummary({ patientId }).catch(handleNotFound), getSlots({ date: day }),
  ]);
  const slots = availability.slots.filter((slot) => slot.available && Date.parse(slot.end) > timestamp);
  const visitType = booking?.visitType ?? "new";

  return (
    <main className="workspace-content workspace-content--narrow">
      <div className="screen-heading">
        <Link href={booking ? "/secretary/online" : "/secretary/new-booking"}>
          {booking ? "الحجوزات الأونلاين" : "اختيار مريض تاني"}
        </Link>
        <h1>{booking ? "تعديل حجز أونلاين" : "حجز موعد للمريض"}</h1>
        <p><bdi>{summary.patient.fullName}</bdi> · <bdi dir="ltr">{summary.patient.phone}</bdi></p>
      </div>
      <DayStrip day={day} days={[]} appointmentId={booking?.id} visitType={visitType}
        staff={{ patientId: booking ? undefined : patientId, min: today, max: lastDay }}>
        {slots.length > 0 ? <BookingFlow key={`${day}:${booking?.id ?? patientId}`} slots={slots}
          appointmentId={booking?.id} patientId={patientId} initialVisitType={visitType}
          returnTo={booking ? "/secretary/online" : "/secretary/queue"} /> :
          <p className="workspace-panel">{availability.open ? "مفيش مواعيد متاحة في اليوم ده." : "العيادة مغلقة في اليوم ده."}</p>}
      </DayStrip>
    </main>
  );
}

async function ChoosePatient({ query }: { query: Params }) {
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const page = typeof query.page === "string" && /^\d{1,6}$/.test(query.page) ? Math.max(1, Number(query.page)) : 1;
  const patients = await searchPatients({ q, page });
  return (
    <main className="workspace-content workspace-content--narrow">
      <div className="screen-heading"><Link href="/secretary/queue">طابور اليوم</Link><h1>حجز جديد</h1></div>
      <PatientPicker patients={patients} q={q} />
      <WalkInForm />
    </main>
  );
}

function readId(raw: unknown) {
  const id = uuidSchema.safeParse(raw);
  if (!id.success) notFound();
  return id.data;
}

function handleNotFound(error: unknown): never {
  if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
  throw error;
}
