-- Apply row ownership and least-privilege grants to the application tables.
revoke all on public.user_roles, public.patients, public.patient_medical_alerts,
  public.appointments, public.visits, public.prescriptions, public.doctor_private_notes,
  public.schedule_settings, public.working_hours, public.days_off, public.clinic_prices
  from public, anon, authenticated;

alter table public.user_roles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_medical_alerts enable row level security;
alter table public.appointments enable row level security;
alter table public.visits enable row level security;
alter table public.prescriptions enable row level security;
alter table public.doctor_private_notes enable row level security;
alter table public.schedule_settings enable row level security;
alter table public.working_hours enable row level security;
alter table public.days_off enable row level security;
alter table public.clinic_prices enable row level security;

grant select on public.patients, public.patient_medical_alerts,
  public.appointments, public.visits, public.prescriptions, public.doctor_private_notes,
  public.schedule_settings, public.working_hours, public.days_off, public.clinic_prices
  to authenticated;

grant insert (full_name, age, phone, address, created_by_role) on public.patients to authenticated;
grant update (full_name, age, address) on public.patients to authenticated;
grant insert (patient_id, has_allergy, allergy_text, has_chronic_disease, chronic_disease_text,
  takes_chronic_meds, chronic_meds_text) on public.patient_medical_alerts to authenticated;
grant update (has_allergy, allergy_text, has_chronic_disease, chronic_disease_text,
  takes_chronic_meds, chronic_meds_text) on public.patient_medical_alerts to authenticated;
grant insert (patient_id, slot_start, slot_end, visit_type, status) on public.appointments to authenticated;
grant update (slot_start, slot_end, status, secretary_seen_at) on public.appointments to authenticated;
grant update (price_new, price_follow_up) on public.clinic_prices to authenticated;

create policy patients_select_own_or_staff on public.patients for select to authenticated
using (
  ((select private.my_role()) = 'patient' and user_id = (select auth.uid()))
  or (select private.my_role()) in ('secretary', 'doctor')
);
create policy patients_insert_secretary on public.patients for insert to authenticated
with check ((select private.my_role()) = 'secretary' and user_id is null and created_by_role = 'secretary');
create policy patients_update_own on public.patients for update to authenticated
using ((select private.my_role()) = 'patient' and user_id = (select auth.uid()))
with check ((select private.my_role()) = 'patient' and user_id = (select auth.uid()));

create policy alerts_select_own_or_doctor on public.patient_medical_alerts for select to authenticated
using (patient_id = (select private.my_patient_id()) or (select private.my_role()) = 'doctor');
create policy alerts_insert_own_or_doctor on public.patient_medical_alerts for insert to authenticated
with check (patient_id = (select private.my_patient_id()) or (select private.my_role()) = 'doctor');
create policy alerts_update_own_or_doctor on public.patient_medical_alerts for update to authenticated
using (patient_id = (select private.my_patient_id()) or (select private.my_role()) = 'doctor')
with check (patient_id = (select private.my_patient_id()) or (select private.my_role()) = 'doctor');

create policy appointments_select on public.appointments for select to authenticated
using (patient_id = (select private.my_patient_id()) or (select private.my_role()) in ('secretary', 'doctor'));
create policy appointments_insert_patient on public.appointments for insert to authenticated
with check ((select private.my_role()) = 'patient' and patient_id = (select private.my_patient_id()) and status = 'booked');
create policy appointments_insert_secretary on public.appointments for insert to authenticated
with check ((select private.my_role()) = 'secretary' and status = 'booked');
create policy appointments_update_patient on public.appointments for update to authenticated
using ((select private.my_role()) = 'patient' and patient_id = (select private.my_patient_id()) and status = 'booked')
with check ((select private.my_role()) = 'patient' and patient_id = (select private.my_patient_id()) and status in ('booked', 'cancelled'));
create policy appointments_update_secretary on public.appointments for update to authenticated
using ((select private.my_role()) = 'secretary')
with check ((select private.my_role()) = 'secretary' and status in ('booked', 'arrived', 'cancelled'));

create policy visits_select on public.visits for select to authenticated
using (patient_id = (select private.my_patient_id()) or (select private.my_role()) = 'doctor');
create policy prescriptions_select on public.prescriptions for select to authenticated
using (exists (select 1 from public.visits where appointment_id = prescriptions.visit_id));
create policy private_notes_select_doctor on public.doctor_private_notes for select to authenticated
using ((select private.my_role()) = 'doctor');

create policy prices_select_doctor on public.clinic_prices for select to authenticated
using ((select private.my_role()) = 'doctor');
create policy prices_update_doctor on public.clinic_prices for update to authenticated
using ((select private.my_role()) = 'doctor')
with check ((select private.my_role()) = 'doctor');

create policy settings_select_authenticated on public.schedule_settings for select to authenticated
using ((select private.my_role()) is not null);
create policy hours_select_authenticated on public.working_hours for select to authenticated
using ((select private.my_role()) is not null);
create policy days_off_select_authenticated on public.days_off for select to authenticated
using ((select private.my_role()) is not null);
