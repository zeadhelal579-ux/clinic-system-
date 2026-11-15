-- Own account roles and the link from an authenticated user to a patient.
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null constraint patients_full_name_length check (char_length(btrim(full_name)) between 2 and 100),
  age smallint not null constraint patients_age_range check (age between 0 and 120),
  age_recorded_on date not null default private.clinic_today(),
  phone text not null unique constraint patients_phone_format check (phone ~ '^\+20(10|11|12|15)[0-9]{8}$'),
  address text not null constraint patients_address_length check (char_length(btrim(address)) between 3 and 300),
  created_by_role public.app_role not null check (created_by_role in ('patient', 'secretary')),
  search_name text generated always as (private.normalize_ar(full_name)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_search_name_trgm_idx
  on public.patients using gin (search_name extensions.gin_trgm_ops);

create function private.record_patient_age()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.age is distinct from old.age then
    new.age_recorded_on := private.clinic_today();
  end if;
  return new;
end;
$$;

create trigger patients_age_recorded_on before insert or update on public.patients
for each row execute function private.record_patient_age();

create trigger patients_set_updated_at before update on public.patients
for each row execute function private.set_updated_at();

create function private.my_role()
returns public.app_role language sql stable security definer set search_path = ''
return (select role from public.user_roles where user_id = (select auth.uid()));

create function private.my_patient_id()
returns uuid language sql stable security definer set search_path = ''
return (select id from public.patients where user_id = (select auth.uid()) and private.my_role() = 'patient');

grant execute on function private.my_role(), private.my_patient_id() to authenticated;

create function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if nullif(new.email, '') is not null and nullif(new.phone, '') is null
    and new.raw_app_meta_data->>'clinic_role' in ('secretary', 'doctor') then
    insert into public.user_roles(user_id, role)
    values (new.id, (new.raw_app_meta_data->>'clinic_role')::public.app_role)
    on conflict (user_id) do nothing;
  elsif nullif(new.email, '') is null and nullif(new.phone, '') is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'patient');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- GoTrue applies admin app metadata after inserting the new account.
create trigger on_auth_staff_role_assigned after update of raw_app_meta_data on auth.users
for each row when (
  (old.raw_app_meta_data->>'clinic_role') is distinct from (new.raw_app_meta_data->>'clinic_role')
  and (new.raw_app_meta_data->>'clinic_role') in ('secretary', 'doctor')
) execute function private.handle_new_auth_user();
