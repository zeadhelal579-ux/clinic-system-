-- Keep medical alerts, signed visit records and private notes outside scheduling.
create table public.patient_medical_alerts (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  has_allergy boolean,
  allergy_text text check (char_length(btrim(allergy_text)) between 1 and 200),
  has_chronic_disease boolean,
  chronic_disease_text text check (char_length(btrim(chronic_disease_text)) between 1 and 200),
  takes_chronic_meds boolean,
  chronic_meds_text text check (char_length(btrim(chronic_meds_text)) between 1 and 300),
  updated_at timestamptz not null default now(),
  updated_by_role public.app_role check (updated_by_role in ('patient', 'doctor')),
  constraint alerts_allergy_consistency check ((has_allergy is true) = (allergy_text is not null)),
  constraint alerts_chronic_consistency check ((has_chronic_disease is true) = (chronic_disease_text is not null)),
  constraint alerts_meds_flag_consistency check (has_chronic_disease is true or takes_chronic_meds is null),
  constraint alerts_meds_text_consistency check ((takes_chronic_meds is true) = (chronic_meds_text is not null))
);

create function private.audit_medical_alerts()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by_role := private.my_role();
  return new;
end;
$$;

create trigger alerts_audit before insert or update on public.patient_medical_alerts
for each row execute function private.audit_medical_alerts();

create table public.visits (
  appointment_id uuid primary key,
  patient_id uuid not null,
  diagnosis text not null check (char_length(btrim(diagnosis)) between 1 and 2000),
  instructions text check (char_length(instructions) <= 2000),
  follow_up_date date,
  ended_at timestamptz not null default now(),
  constraint visits_appointment_patient_fk foreign key (appointment_id, patient_id)
    references public.appointments (id, patient_id) on delete restrict,
  constraint visits_follow_up_after_visit check (follow_up_date > private.clinic_date_of(ended_at))
);

create index visits_patient_ended_idx on public.visits (patient_id, ended_at desc);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (appointment_id) on delete cascade,
  drug_name text not null check (char_length(btrim(drug_name)) between 1 and 100),
  dose text not null check (char_length(btrim(dose)) between 1 and 100),
  duration text not null check (char_length(btrim(duration)) between 1 and 100),
  position smallint not null check (position between 1 and 20),
  unique (visit_id, position)
);

create table public.doctor_private_notes (
  visit_id uuid primary key references public.visits (appointment_id) on delete cascade,
  note text not null check (char_length(btrim(note)) between 1 and 5000)
);
