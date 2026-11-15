-- Establish the clinic types, private schema and normalization functions.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

create type public.app_role as enum ('patient', 'secretary', 'doctor');
create type public.visit_type as enum ('new', 'follow_up');
create type public.appointment_source as enum ('online', 'clinic');
create type public.appointment_status as enum ('booked', 'arrived', 'done', 'cancelled');

create function private.clinic_date_of(moment timestamptz)
returns date language sql immutable set search_path = ''
return (moment at time zone 'Africa/Cairo')::date;

create function private.clinic_today()
returns date language sql stable set search_path = ''
return private.clinic_date_of(now());

create function private.clinic_week_start(day date)
returns date language sql immutable set search_path = ''
return day - ((extract(dow from day)::integer + 1) % 7);

create function private.normalize_ar(value text)
returns text language sql immutable set search_path = ''
return btrim(regexp_replace(
  regexp_replace(translate(lower(value), 'أإآٱىة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'اااايه01234567890123456789'), '[ً-ٰٟـ]', '', 'g'),
  '[[:space:]]+', ' ', 'g'
));

create function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

grant execute on function private.clinic_date_of(timestamptz), private.clinic_today(),
  private.clinic_week_start(date), private.normalize_ar(text) to authenticated;
