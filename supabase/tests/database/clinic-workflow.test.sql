-- Verify the published database contract across patient, secretary and doctor roles.
begin;
\echo 1..10

insert into auth.users (id, email, phone, phone_confirmed_at, raw_app_meta_data) values
  ('f0000000-0000-4000-8000-000000000001', null, '201000000001', now(), '{}'::jsonb),
  ('f0000000-0000-4000-8000-000000000002', null, '201000000002', null, '{}'::jsonb),
  ('f0000000-0000-4000-8000-000000000003', 'secretary@clinic.test', null, null, '{"clinic_role":"secretary"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000004', 'doctor@clinic.test', null, null, '{"clinic_role":"doctor"}'::jsonb);

insert into public.patients (id, full_name, age, phone, address, created_by_role) values
  ('a0000000-0000-4000-8000-000000000001', 'Fixture One', 40, '+201000000001', 'Fixture Place', 'secretary'),
  ('a0000000-0000-4000-8000-000000000002', 'Fixture Two', 32, '+201000000002', 'Fixture Place', 'secretary');
update public.working_hours set is_open = true;
update public.schedule_settings set slot_minutes = 20;

set local role authenticated;
set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000002';
do $$
begin
  if public.link_my_patient_file() is not null then raise exception 'Unverified phone linked'; end if;
  if (select count(*) from public.patients) <> 0 then raise exception 'Unlinked account saw a record'; end if;
end;
$$;
\echo ok 1 - Unverified phone cannot link or read a walk-in record

set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000001';
do $$
begin
  if public.link_my_patient_file() is distinct from 'a0000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'Verified phone did not link to the correct existing file';
  end if;
  if (select count(*) from public.patients) <> 1 then raise exception 'Patient crossed its RLS boundary'; end if;
  perform public.complete_my_profile('Fixture One', 40, 'Fixture Place', false, null, false, null, null, null);
  begin
    perform public.complete_my_profile('Partial Write', 44, 'Fixture Place', true, null, false, null, null, null, true);
    raise exception 'Invalid alerts were accepted';
  exception when check_violation then null;
  end;
  if (select full_name from public.patients) <> 'Fixture One' then raise exception 'Profile save was partially applied'; end if;
end;
$$;
\echo ok 2 - Verified account links one file and invalid profile updates roll back

do $$
declare
  start_time timestamptz := ((private.clinic_today() + 1) + time '10:00') at time zone 'Africa/Cairo';
begin
  insert into public.appointments (id, patient_id, slot_start, slot_end, visit_type)
  values (gen_random_uuid(), 'a0000000-0000-4000-8000-000000000001', start_time, start_time + interval '20 minutes', 'new');
exception when insufficient_privilege then
  -- The caller cannot write the id column; the normal insert path is exercised below.
  insert into public.appointments (patient_id, slot_start, slot_end, visit_type)
  values ('a0000000-0000-4000-8000-000000000001', start_time, start_time + interval '20 minutes', 'new');
end;
$$;
reset role;
update public.schedule_settings set slot_minutes = 15;
set local role authenticated;
set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000003';
do $$
declare
  opening timestamptz := ((private.clinic_today() + 1) + time '10:00') at time zone 'Africa/Cairo';
begin
  begin
    insert into public.appointments (patient_id, slot_start, slot_end, visit_type)
    values ('a0000000-0000-4000-8000-000000000002', opening + interval '15 minutes', opening + interval '30 minutes', 'new');
    raise exception 'An overlapping start was accepted';
  exception when exclusion_violation then null;
  end;
  begin
    insert into public.appointments (patient_id, slot_start, slot_end, visit_type)
    values ('a0000000-0000-4000-8000-000000000002', opening + interval '23 minutes', opening + interval '38 minutes', 'new');
    raise exception 'An off-grid start was accepted';
  exception when sqlstate 'CLS22' then null;
  end;
  insert into public.appointments (patient_id, slot_start, slot_end, visit_type)
  values ('a0000000-0000-4000-8000-000000000002', opening + interval '30 minutes', opening + interval '45 minutes', 'follow_up');
end;
$$;
\echo ok 3 - Duration changes cannot create overlapping or off-grid appointments

set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000001';
do $$
declare slots jsonb := public.get_available_slots(private.clinic_today() + 1)->'slots';
begin
  if (select count(*) from public.appointments) <> 1 then raise exception 'Another patient booking leaked'; end if;
  if slots->2->>'available' <> 'false' then raise exception 'Another patient booking did not block its slot'; end if;
  if (select count(*) from jsonb_object_keys(slots->2)) <> 3 then raise exception 'Unexpected availability fields'; end if;
end;
$$;
\echo ok 4 - A patient sees occupied capacity without other appointment records

set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000003';
do $$
declare hours jsonb;
begin
  if (select count(*) from public.patient_medical_alerts) <> 0 then raise exception 'Secretary received medical alerts'; end if;
  begin
    update public.appointments set status = 'cancelled' where source = 'clinic';
    raise exception 'Secretary cancelled a non-online appointment';
  exception when insufficient_privilege then null;
  end;
  select jsonb_agg(jsonb_build_object('weekday', weekday, 'isOpen', is_open,
      'startTime', start_time, 'endTime', end_time) order by weekday)
    into hours from public.working_hours;
  perform public.update_schedule(15, hours, jsonb_build_array(jsonb_build_object('date', private.clinic_today() + 1)));
  if (select count(*) from public.appointments where status = 'booked') <> 2 then
    raise exception 'Closing a day removed a booking';
  end if;
  if public.get_available_slots(private.clinic_today() + 1)->>'open' <> 'false' then
    raise exception 'Closure did not remove new availability';
  end if;
  if public.get_schedule()->'days_off'->0->>'day' <> (private.clinic_today() + 1)::text then
    raise exception 'Schedule snapshot did not reflect the closure';
  end if;
end;
$$;
\echo ok 5 - Secretary permissions and schedule closure preserve existing appointments

reset role;
insert into public.appointments (id, patient_id, slot_start, slot_end, visit_type, source)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
  (private.clinic_today() + time '09:00') at time zone 'Africa/Cairo',
  (private.clinic_today() + time '09:15') at time zone 'Africa/Cairo', 'new', 'clinic');
set local role authenticated;
set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000003';
update public.appointments set status = 'arrived' where id = 'b0000000-0000-4000-8000-000000000001';

set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000004';
update public.clinic_prices set price_new = 125.50;
do $$
declare
  appt uuid := 'b0000000-0000-4000-8000-000000000001';
  receipt jsonb;
begin
  begin
    perform public.end_visit(appt, 'Fixture diagnosis', null, null, '[{"drugName":"Example"}]', 'Fixture note');
    raise exception 'Invalid prescription accepted';
  exception when sqlstate 'CL422' then null;
  end;
  if exists (select 1 from public.visits) then raise exception 'Invalid visit left a partial row'; end if;
  receipt := public.end_visit(appt, 'Fixture diagnosis', 'Fixture instructions', private.clinic_today() + 2,
    '[{"drugName":"Example","dose":"Test","duration":"Test"}]', 'Fixture note');
  if receipt->>'status' <> 'done' or (receipt->>'priceCharged')::numeric <> 125.50 then raise exception 'Invalid receipt'; end if;
  begin
    perform public.end_visit(appt, 'Duplicate', null, null, '[]', null);
    raise exception 'Repeated visit completion accepted';
  exception when sqlstate 'CL409' then null;
  end;
end;
$$;
update public.clinic_prices set price_new = 200;
\echo ok 6 - Visit finalization is atomic and one-time

set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000003';
do $$
begin
  if (select count(*) from public.visits) <> 0 or (select count(*) from public.doctor_private_notes) <> 0 then
    raise exception 'Secretary received a medical record';
  end if;
  if (select revenue from public.cashbox_summary() where period = 'today') <> 125.50 then raise exception 'Revenue changed with list price'; end if;
  if (select count(*) from public.cashbox_last_7_days()) <> 7 then raise exception 'Cashbox days missing'; end if;
  if (public.search_patients('', 2, 2, 'fullName')->>'total')::int <> 2 then
    raise exception 'Paging beyond the last row lost total';
  end if;
end;
$$;
\echo ok 7 - Staff revenue uses the locked price and paginated search preserves totals

set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from public.visits) <> 1 or (select count(*) from public.prescriptions) <> 1 then
    raise exception 'Completed visit failed to reach its patient';
  end if;
  if (select count(*) from public.doctor_private_notes) <> 0 then raise exception 'Patient received private note'; end if;
  if public.get_my_follow_up_date() is distinct from private.clinic_today() + 2 then raise exception 'Missing follow-up date'; end if;
end;
$$;
\echo ok 8 - Patient receives own visit and follow-up without private notes

reset role;
do $$
begin
  begin
    update auth.users set phone = '201000000002' where id = 'f0000000-0000-4000-8000-000000000001';
    raise exception 'A reused phone was accepted';
  exception when unique_violation then null;
  end;
end;
$$;
update auth.users set phone = '201000000009' where id = 'f0000000-0000-4000-8000-000000000001';
do $$
begin
  if (select phone from public.patients where id = 'a0000000-0000-4000-8000-000000000001') <> '+201000000009' then
    raise exception 'Changed phone was not synchronized';
  end if;
end;
$$;
\echo ok 9 - Confirmed phone change keeps the patient identity synchronized

delete from public.user_roles where user_id = 'f0000000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claim.sub" = 'f0000000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from public.patients) <> 0
    or (select count(*) from public.visits) <> 0
    or (select count(*) from public.appointments) <> 0 then
    raise exception 'Revoked account retained access through an existing token';
  end if;
end;
$$;
\echo ok 10 - Data access ends as soon as the application role is removed

rollback;
