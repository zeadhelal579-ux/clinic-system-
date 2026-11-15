-- Store one clinic's schedule, bookings, and price snapshots without interval overlap.
create table public.schedule_settings (
  id smallint primary key default 1 check (id = 1),
  slot_minutes smallint not null default 15 check (slot_minutes between 5 and 120),
  updated_at timestamptz not null default now()
);

create table public.working_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null default false,
  start_time time not null default '10:00',
  end_time time not null default '18:00',
  constraint working_hours_range check (not is_open or end_time > start_time)
);

create table public.days_off (
  day date primary key,
  note text check (char_length(note) <= 200)
);

create table public.clinic_prices (
  id smallint primary key default 1 check (id = 1),
  price_new numeric(10, 2) not null check (price_new between 0 and 100000),
  price_follow_up numeric(10, 2) not null check (price_follow_up between 0 and 100000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete restrict,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  visit_type public.visit_type not null,
  source public.appointment_source not null,
  status public.appointment_status not null default 'booked',
  arrived_at timestamptz,
  done_at timestamptz,
  cancelled_at timestamptz,
  price_charged numeric(10, 2) constraint appointments_price_nonneg check (price_charged >= 0),
  secretary_seen_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_id_patient_uidx unique (id, patient_id),
  constraint appointments_slot_range check (slot_end > slot_start),
  constraint appointments_arrived_consistency check ((status in ('arrived', 'done')) = (arrived_at is not null)),
  constraint appointments_done_consistency check ((status = 'done') = (done_at is not null) and (status = 'done') = (price_charged is not null)),
  constraint appointments_cancelled_consistency check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint appointments_active_slot_excl exclude using gist
    (tstzrange(slot_start, slot_end, '[)') with &&)
    where (status in ('booked', 'arrived', 'done'))
);

create index appointments_patient_slot_idx on public.appointments (patient_id, slot_start desc);
create index appointments_status_slot_idx on public.appointments (status, slot_start);
create index appointments_online_created_idx on public.appointments (created_at desc)
  where source = 'online' and status = 'booked';
create index appointments_done_at_idx on public.appointments (done_at) where status = 'done';

create trigger appointments_set_updated_at before update on public.appointments
for each row execute function private.set_updated_at();

create trigger schedule_settings_set_updated_at before update on public.schedule_settings
for each row execute function private.set_updated_at();

create function private.audit_clinic_prices()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger clinic_prices_audit before update on public.clinic_prices
for each row execute function private.audit_clinic_prices();

insert into public.schedule_settings default values;
insert into public.working_hours (weekday) select generate_series(0, 6);
insert into public.clinic_prices (price_new, price_follow_up) values (0, 0);
