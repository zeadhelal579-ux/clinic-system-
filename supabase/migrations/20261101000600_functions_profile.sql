-- Link verified phone identities and persist the patient profile atomically.
create function public.get_my_role()
returns public.app_role language sql stable security invoker set search_path = ''
return private.my_role();

create function private.confirmed_patient_phone(p_user_id uuid)
returns text language sql stable security definer set search_path = ''
return (
  select '+' || ltrim(phone, '+')
  from auth.users
  where id = p_user_id and phone_confirmed_at is not null and nullif(phone, '') is not null
);

create function private.link_walk_in_file(p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  linked_id uuid;
  confirmed_phone text;
begin
  perform 1 from auth.users where id = p_user_id for update;
  select id into linked_id from public.patients where user_id = p_user_id;
  if found then return linked_id; end if;

  confirmed_phone := private.confirmed_patient_phone(p_user_id);
  if confirmed_phone is null then return null; end if;

  update public.patients set user_id = p_user_id
  where phone = confirmed_phone and user_id is null
  returning id into linked_id;
  return linked_id;
end;
$$;

create function public.link_my_patient_file()
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() is distinct from 'patient' then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  return private.link_walk_in_file(auth.uid());
end;
$$;

create function public.complete_my_profile(
  p_full_name text,
  p_age integer,
  p_address text,
  p_has_allergy boolean,
  p_allergy_text text,
  p_has_chronic boolean,
  p_chronic_text text,
  p_takes_meds boolean,
  p_meds_text text,
  p_require_existing boolean default false
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  target_patient_id uuid;
  confirmed_phone text;
begin
  if private.my_role() is distinct from 'patient' then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;
  if p_has_allergy is null or p_has_chronic is null
    or (p_has_chronic and p_takes_meds is null) then
    raise exception 'validation.required' using errcode = 'CL422';
  end if;

  perform 1 from auth.users where id = caller_id for update;
  confirmed_phone := private.confirmed_patient_phone(caller_id);
  if confirmed_phone is null then
    raise exception 'errors.forbidden' using errcode = '42501';
  end if;

  if p_require_existing then
    target_patient_id := private.my_patient_id();
    if not exists (
      select 1 from public.patient_medical_alerts as alerts
      where alerts.patient_id = target_patient_id
        and alerts.has_allergy is not null and alerts.has_chronic_disease is not null
    ) then
      raise exception 'errors.profile_incomplete' using errcode = 'CLP03';
    end if;
  else
    target_patient_id := private.link_walk_in_file(caller_id);
  end if;

  if target_patient_id is null then
    insert into public.patients (user_id, full_name, age, phone, address, created_by_role)
    values (caller_id, btrim(p_full_name), p_age, confirmed_phone, btrim(p_address), 'patient')
    returning id into target_patient_id;
  else
    update public.patients set full_name = btrim(p_full_name), age = p_age, address = btrim(p_address)
    where id = target_patient_id;
  end if;

  insert into public.patient_medical_alerts (
    patient_id, has_allergy, allergy_text, has_chronic_disease, chronic_disease_text,
    takes_chronic_meds, chronic_meds_text
  ) values (
    target_patient_id, p_has_allergy, case when p_has_allergy then btrim(p_allergy_text) end,
    p_has_chronic, case when p_has_chronic then btrim(p_chronic_text) end,
    case when p_has_chronic then p_takes_meds end,
    case when p_has_chronic and p_takes_meds then btrim(p_meds_text) end
  ) on conflict on constraint patient_medical_alerts_pkey do update set
    has_allergy = excluded.has_allergy, allergy_text = excluded.allergy_text,
    has_chronic_disease = excluded.has_chronic_disease, chronic_disease_text = excluded.chronic_disease_text,
    takes_chronic_meds = excluded.takes_chronic_meds, chronic_meds_text = excluded.chronic_meds_text;

  return target_patient_id;
end;
$$;

create function private.sync_confirmed_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  confirmed_phone text := '+' || ltrim(new.phone, '+');
begin
  if new.phone is not distinct from old.phone or new.phone_confirmed_at is null
    or not exists (select 1 from public.user_roles where user_id = new.id and role = 'patient') then
    return new;
  end if;

  if exists (select 1 from public.patients where phone = confirmed_phone and user_id is distinct from new.id) then
    raise exception 'errors.phone_unavailable' using errcode = '23505';
  end if;

  update public.patients set phone = confirmed_phone where user_id = new.id;
  return new;
end;
$$;

create trigger on_confirmed_phone_change after update of phone on auth.users
for each row execute function private.sync_confirmed_phone();

revoke all on function public.get_my_role(), public.link_my_patient_file(),
  public.complete_my_profile(text, integer, text, boolean, text, boolean, text, boolean, text, boolean)
  from public, anon, authenticated;
grant execute on function public.get_my_role(), public.link_my_patient_file(),
  public.complete_my_profile(text, integer, text, boolean, text, boolean, text, boolean, text, boolean)
  to authenticated;
