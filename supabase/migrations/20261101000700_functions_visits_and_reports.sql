-- Enforce booking rules and execute clinical, schedule, and reporting operations.
create function private.assert_schedule_slot(p_start timestamptz)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  caller_role public.app_role := private.my_role();
  booked_day date := private.clinic_date_of(p_start);
  slot_duration interval;
  hours public.working_hours%rowtype;
  opening timestamptz;
  closing timestamptz;
  slot_end timestamptz;
begin
  if caller_role is null or caller_role not in ('patient', 'secretary') then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  if caller_role = 'patient' and not exists (
    select 1 from public.patient_medical_alerts where patient_id = private.my_patient_id()
    and has_allergy is not null and has_chronic_disease is not null
  ) then
    raise exception 'errors.profile_incomplete' using errcode = 'CLP03';
  end if;

  select make_interval(mins => slot_minutes) into strict slot_duration
  from public.schedule_settings where id = 1 for share;
  select * into strict hours from public.working_hours where weekday = extract(dow from booked_day);
  opening := (booked_day + hours.start_time) at time zone 'Africa/Cairo';
  closing := (booked_day + hours.end_time) at time zone 'Africa/Cairo';
  slot_end := p_start + slot_duration;

  if not hours.is_open or exists (select 1 from public.days_off where day = booked_day)
    or p_start < opening or slot_end > closing
    or mod(extract(epoch from p_start - opening), extract(epoch from slot_duration)) <> 0
    or booked_day < private.clinic_today()
    or booked_day > private.clinic_today() + (case when caller_role = 'patient' then 14 else 366 end)
    or (caller_role = 'patient' and p_start < statement_timestamp())
    or (caller_role = 'secretary' and slot_end <= statement_timestamp()) then
    raise exception 'errors.slot_unavailable' using errcode = 'CLS22';
  end if;
  return slot_end;
end;
$$;

grant execute on function private.assert_schedule_slot(timestamptz) to authenticated;

create function private.guard_appointment()
returns trigger language plpgsql set search_path = '' as $$
declare
  caller_role public.app_role := private.my_role();
  slot_changed boolean;
  status_changed boolean;
begin
  if current_user <> 'authenticated' then return new; end if;

  if tg_op = 'INSERT' then
    if new.slot_end is distinct from private.assert_schedule_slot(new.slot_start) then
      raise exception 'errors.slot_unavailable' using errcode = 'CLS22';
    end if;
    new.source := case when caller_role = 'patient' then 'online' else 'clinic' end::public.appointment_source;
    new.created_by := auth.uid();
    return new;
  end if;

  slot_changed := (new.slot_start, new.slot_end) is distinct from (old.slot_start, old.slot_end);
  status_changed := new.status is distinct from old.status;
  if ((slot_changed or status_changed) and old.status <> 'booked')
    or (slot_changed and status_changed) then
    raise exception 'errors.invalid_state_transition' using errcode = 'CL409';
  end if;

  if slot_changed or (status_changed and new.status = 'cancelled') then
    if caller_role = 'secretary' and old.source <> 'online' then
      raise exception 'errors.forbidden' using errcode = '42501';
    end if;
    if slot_changed and new.slot_end is distinct from private.assert_schedule_slot(new.slot_start) then
      raise exception 'errors.slot_unavailable' using errcode = 'CLS22';
    end if;
  end if;

  if status_changed then
    if new.status = 'cancelled' then
      new.cancelled_at := now();
    elsif new.status = 'arrived' and caller_role = 'secretary'
      and private.clinic_date_of(old.slot_start) = private.clinic_today() then
      new.arrived_at := now();
    else
      raise exception 'errors.invalid_state_transition' using errcode = 'CL409';
    end if;
  end if;

  if new.secretary_seen_at is distinct from old.secretary_seen_at then
    if caller_role is distinct from 'secretary' or old.source <> 'online' or old.status <> 'booked'
      or old.secretary_seen_at is not null or new.secretary_seen_at is null
      or private.clinic_date_of(old.slot_start) < private.clinic_today() then
      raise exception 'errors.forbidden' using errcode = '42501';
    end if;
    new.secretary_seen_at := now();
  end if;
  return new;
end;
$$;

create trigger appointments_guard before insert or update on public.appointments
for each row execute function private.guard_appointment();

create function public.get_available_slots(p_day date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  caller_role public.app_role := private.my_role();
  today date := private.clinic_today();
  duration interval;
  hours public.working_hours%rowtype;
  opening timestamptz;
  closing timestamptz;
  slots jsonb;
begin
  if caller_role is null then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  if p_day is null or p_day not between today - 366 and today + 366 then
    raise exception 'validation.date_range' using errcode = 'CL422', hint = 'date';
  end if;

  select * into strict hours from public.working_hours where weekday = extract(dow from p_day);
  if not hours.is_open or exists (select 1 from public.days_off where day = p_day) then
    return jsonb_build_object('date', p_day, 'open', false, 'slots', '[]'::jsonb);
  end if;
  select make_interval(mins => slot_minutes) into strict duration from public.schedule_settings where id = 1;
  opening := (p_day + hours.start_time) at time zone 'Africa/Cairo';
  closing := (p_day + hours.end_time) at time zone 'Africa/Cairo';

  select coalesce(jsonb_agg(jsonb_build_object(
    'start', slot.start_time,
    'end', slot.start_time + duration,
    'available', p_day >= today
      and case when caller_role = 'patient' then p_day <= today + 14 and slot.start_time >= statement_timestamp()
          when caller_role = 'secretary' then slot.start_time + duration > statement_timestamp()
          else slot.start_time >= statement_timestamp() end
      and not exists (
        select 1 from public.appointments as a where a.status in ('booked', 'arrived', 'done')
        and tstzrange(a.slot_start, a.slot_end, '[)') && tstzrange(slot.start_time, slot.start_time + duration, '[)')
      )
  ) order by slot.start_time), '[]'::jsonb) into slots
  from generate_series(opening, closing - duration, duration) as slot(start_time);

  return jsonb_build_object('date', p_day, 'open', true, 'slots', slots);
end;
$$;
create function public.end_visit(
  p_appointment_id uuid, p_diagnosis text, p_instructions text,
  p_follow_up_date date, p_prescriptions jsonb, p_private_note text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  appointment public.appointments%rowtype;
  price numeric(10, 2);
  item jsonb;
begin
  if private.my_role() is distinct from 'doctor' then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  select * into appointment from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'errors.not_found' using errcode = 'CL404'; end if;
  if appointment.status <> 'arrived' then
    raise exception 'errors.invalid_state_transition' using errcode = 'CL409';
  end if;

  if p_diagnosis is null or char_length(btrim(p_diagnosis)) not between 1 and 2000 then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'diagnosis';
  end if;
  if char_length(p_instructions) > 2000 or char_length(p_private_note) > 5000 then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'instructions';
  end if;
  if p_follow_up_date <= private.clinic_today() then
    raise exception 'validation.follow_up_future' using errcode = 'CL422', hint = 'followUpDate';
  end if;
  if jsonb_typeof(p_prescriptions) is distinct from 'array' then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'prescriptions';
  end if;
  if jsonb_array_length(p_prescriptions) > 20 then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'prescriptions';
  end if;
  for item in select value from jsonb_array_elements(p_prescriptions) loop
    if jsonb_typeof(item->'drugName') is distinct from 'string'
      or jsonb_typeof(item->'dose') is distinct from 'string'
      or jsonb_typeof(item->'duration') is distinct from 'string'
      or char_length(btrim(item->>'drugName')) not between 1 and 100
      or char_length(btrim(item->>'dose')) not between 1 and 100
      or char_length(btrim(item->>'duration')) not between 1 and 100 then
      raise exception 'validation.invalid' using errcode = 'CL422', hint = 'prescriptions';
    end if;
  end loop;

  select case when appointment.visit_type = 'new' then price_new else price_follow_up end into strict price
  from public.clinic_prices where id = 1;

  insert into public.visits (appointment_id, patient_id, diagnosis, instructions, follow_up_date)
  values (appointment.id, appointment.patient_id, btrim(p_diagnosis), nullif(btrim(p_instructions), ''), p_follow_up_date);

  insert into public.prescriptions (visit_id, drug_name, dose, duration, position)
  select appointment.id, btrim(value->>'drugName'), btrim(value->>'dose'), btrim(value->>'duration'), ordinality
  from jsonb_array_elements(p_prescriptions) with ordinality;

  if nullif(btrim(p_private_note), '') is not null then
    insert into public.doctor_private_notes (visit_id, note) values (appointment.id, btrim(p_private_note));
  end if;
  update public.appointments set status = 'done', done_at = now(), price_charged = price where id = appointment.id;
  return jsonb_build_object('appointmentId', appointment.id, 'status', 'done', 'priceCharged', price);
end;
$$;

create function public.cashbox_summary()
returns table(period text, visit_count bigint, new_count bigint, follow_up_count bigint, revenue numeric)
language plpgsql stable security invoker set search_path = '' as $$
declare
  today date := private.clinic_today();
begin
  if private.my_role() is null or private.my_role() not in ('doctor', 'secretary') then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  return query
    select p.name, count(a.id), count(a.id) filter (where a.visit_type = 'new'),
      count(a.id) filter (where a.visit_type = 'follow_up'), coalesce(sum(a.price_charged), 0)
    from (values ('today', today), ('week', private.clinic_week_start(today)),
      ('month', date_trunc('month', today::timestamp)::date)) as p(name, first_day)
    left join public.appointments as a on a.status = 'done'
      and a.done_at >= (p.first_day::timestamp at time zone 'Africa/Cairo')
      and a.done_at < ((today + 1)::timestamp at time zone 'Africa/Cairo')
    group by p.name;
end;
$$;

create function public.cashbox_last_7_days()
returns table(day date, weekday integer, is_day_off boolean, visit_count bigint, new_count bigint,
  follow_up_count bigint, revenue numeric)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if private.my_role() is null or private.my_role() not in ('doctor', 'secretary') then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  return query
    select d.day, extract(dow from d.day)::integer, not wh.is_open or off.day is not null,
      count(a.id), count(a.id) filter (where a.visit_type = 'new'),
      count(a.id) filter (where a.visit_type = 'follow_up'), coalesce(sum(a.price_charged), 0)
    from (select private.clinic_today() - offset_days as day from generate_series(0, 6) as offset_days) as d
    join public.working_hours as wh on wh.weekday = extract(dow from d.day)
    left join public.days_off as off on off.day = d.day
    left join public.appointments as a on a.status = 'done'
      and a.done_at >= (d.day::timestamp at time zone 'Africa/Cairo')
      and a.done_at < ((d.day + 1)::timestamp at time zone 'Africa/Cairo')
    group by d.day, wh.is_open, off.day order by d.day desc;
end;
$$;

create function public.get_my_follow_up_date()
returns date language plpgsql stable security invoker set search_path = '' as $$
declare
  latest public.visits%rowtype;
begin
  if private.my_role() is distinct from 'patient' then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  select * into latest from public.visits
  where patient_id = private.my_patient_id()
  order by ended_at desc, appointment_id limit 1;

  if latest.follow_up_date is null or exists (
    select 1 from public.appointments where patient_id = latest.patient_id
      and visit_type = 'follow_up' and status in ('booked', 'arrived', 'done') and slot_start > latest.ended_at
  ) then return null; end if;
  return latest.follow_up_date;
end;
$$;

create function public.search_patients(p_q text, p_page integer, p_page_size integer, p_sort text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  query_text text := private.normalize_ar(coalesce(p_q, ''));
  digits text;
  result jsonb;
begin
  if private.my_role() is null or private.my_role() not in ('doctor', 'secretary') then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  if p_page is null or p_page not between 1 and 1000000 or p_page_size is null or p_page_size not between 1 and 50 then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'page';
  end if;
  if char_length(query_text) > 100 or p_sort is null or p_sort not in
    ('fullName', '-fullName', 'lastVisitAt', '-lastVisitAt', 'nextAppointmentAt', '-nextAppointmentAt') then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'sort';
  end if;

  digits := regexp_replace(query_text, '[[:space:]+()-]', '', 'g');
  with matches as materialized (
    select p.id as patient_id, p.full_name, p.age, p.phone,
      (select max(slot_start) from public.appointments where patient_id = p.id and status = 'done') as last_visit_at,
      (select min(slot_start) from public.appointments where patient_id = p.id
        and status in ('booked', 'arrived') and slot_end > now()) as next_appointment_at
    from public.patients as p
    where query_text = '' or case when digits ~ '^[0-9]{3,}$'
      then p.phone like '%' || regexp_replace(digits, '^0', '') || '%'
      else p.search_name ilike '%' || replace(replace(replace(query_text, chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%'
    end
  ), matched_page as (
    select *, row_number() over (order by
      case when p_sort = 'fullName' then full_name end asc nulls last,
      case when p_sort = '-fullName' then full_name end desc nulls last,
      case when p_sort = 'lastVisitAt' then last_visit_at end asc nulls last,
      case when p_sort = '-lastVisitAt' then last_visit_at end desc nulls last,
      case when p_sort = 'nextAppointmentAt' then next_appointment_at end asc nulls last,
      case when p_sort = '-nextAppointmentAt' then next_appointment_at end desc nulls last,
      full_name, patient_id) as row_number
    from matches
    order by row_number limit p_page_size offset (p_page - 1) * p_page_size
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(matched_page) - 'row_number' order by row_number) from matched_page), '[]'::jsonb),
    'total', (select count(*) from matches)
  ) into result;

  return result;
end;
$$;

create function public.get_schedule()
returns jsonb language sql stable security invoker set search_path = ''
return (
  select jsonb_build_object(
    'slot_minutes', settings.slot_minutes,
    'working_hours', (select jsonb_agg(to_jsonb(wh) order by wh.weekday) from public.working_hours as wh),
    'days_off', coalesce((select jsonb_agg(to_jsonb(off) order by off.day) from public.days_off as off), '[]'::jsonb)
  )
  from public.schedule_settings as settings where settings.id = 1
);

create function public.update_schedule(p_slot_minutes integer, p_working_hours jsonb, p_days_off jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() is distinct from 'secretary' then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  if p_slot_minutes is null or p_slot_minutes not between 5 and 120 then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'slotMinutes';
  end if;
  if jsonb_typeof(p_working_hours) is distinct from 'array' or jsonb_typeof(p_days_off) is distinct from 'array' then
    raise exception 'validation.invalid' using errcode = 'CL422';
  end if;
  if jsonb_array_length(p_working_hours) <> 7 or jsonb_array_length(p_days_off) > 366 then
    raise exception 'validation.invalid' using errcode = 'CL422';
  end if;

  if (select count(distinct weekday) from jsonb_to_recordset(p_working_hours) as hours(weekday integer)) <> 7
    or exists (
      select 1 from jsonb_to_recordset(p_working_hours) as hours(
        weekday integer, "isOpen" boolean, "startTime" time, "endTime" time)
      where weekday not between 0 and 6 or "isOpen" is null
        or "startTime" is null or "endTime" is null
        or extract(second from "startTime") <> 0 or extract(second from "endTime") <> 0
        or "startTime" >= '24:00'::time or "endTime" >= '24:00'::time
        or ("isOpen" and "endTime" - "startTime" < make_interval(mins => p_slot_minutes))
    ) then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'workingHours';
  end if;
  if (select count(distinct date) from jsonb_to_recordset(p_days_off) as days(date date))
    <> jsonb_array_length(p_days_off) then
    raise exception 'validation.invalid' using errcode = 'CL422', hint = 'daysOff';
  end if;

  perform 1 from public.schedule_settings where id = 1 for update;
  update public.schedule_settings set slot_minutes = p_slot_minutes where id = 1;

  update public.working_hours as saved set
    is_open = hours."isOpen", start_time = hours."startTime", end_time = hours."endTime"
  from jsonb_to_recordset(p_working_hours) as hours(weekday integer, "isOpen" boolean, "startTime" time, "endTime" time)
  where saved.weekday = hours.weekday;

  delete from public.days_off as saved
  where not exists (select 1 from jsonb_to_recordset(p_days_off) as days(date date) where days.date = saved.day);
  insert into public.days_off (day, note)
  select date, nullif(btrim(note), '') from jsonb_to_recordset(p_days_off) as days(date date, note text)
  on conflict (day) do update set note = excluded.note;
  return public.get_schedule();
end;
$$;

revoke all on function public.get_available_slots(date),
  public.end_visit(uuid, text, text, date, jsonb, text), public.cashbox_summary(), public.cashbox_last_7_days(),
  public.get_my_follow_up_date(), public.search_patients(text, integer, integer, text),
  public.get_schedule(), public.update_schedule(integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.get_available_slots(date),
  public.end_visit(uuid, text, text, date, jsonb, text), public.cashbox_summary(), public.cashbox_last_7_days(),
  public.get_my_follow_up_date(), public.search_patients(text, integer, integer, text),
  public.get_schedule(), public.update_schedule(integer, jsonb, jsonb) to authenticated;
