// Exercise Supabase OTP, database permissions and a concurrent booking using local fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { addClinicDays, clinicDateOf } from "../../src/lib/time/clinic-time.ts";

const url = readLocalUrl(process.env.SUPABASE_URL);
const anonymousKey = mustHave("SUPABASE_PUBLISHABLE_KEY");
const adminKey = mustHave("CLINIC_TEST_SUPABASE_ADMIN_KEY");
const serverUrl = process.env.CLINIC_TEST_APP_URL ? readLocalUrl(process.env.CLINIC_TEST_APP_URL) : null;
const fixturePhone = "+201000000001";
const authOptions = { persistSession: false, autoRefreshToken: false };
const uid = randomUUID();

const admin = createClient(url, adminKey, { auth: authOptions });
const { client: secretary, cookieHeader: secretaryCookie } = makeCookieClient();
const { client: patient, cookieHeader: patientCookie } = makeCookieClient();
const secretaryCredentials = { email: "secretary-" + uid + "@clinic.test", password: randomUUID() };

const existing = unwrap(await admin.auth.admin.listUsers({ page: 1, perPage: 100 }));
assert.equal(existing.users.length, 0, "Run the integration suite on a freshly reset local Supabase instance.");

unwrap(await admin.auth.admin.createUser({
  ...secretaryCredentials,
  email_confirm: true,
  app_metadata: { clinic_role: "secretary" },
}));
unwrap(await secretary.auth.signInWithPassword(secretaryCredentials));
assert.equal(unwrap(await secretary.rpc("get_my_role")), "secretary");

const walkIn = unwrap(await secretary.from("patients").insert({
  full_name: "Integration Fixture", age: 30, phone: fixturePhone, address: "Fixture Place", created_by_role: "secretary",
}).select("id").single());

const password = randomUUID();
const signup = unwrap(await patient.auth.signUp({ phone: fixturePhone, password }));
assert.equal(signup.session, null);
const verified = unwrap(await patient.auth.verifyOtp({ phone: fixturePhone, token: "123456", type: "sms" }));
assert.ok(verified.session);
assert.equal(unwrap(await patient.auth.getClaims()).claims.sub, verified.user.id);
assert.equal(unwrap(await patient.rpc("get_my_role")), "patient");
assert.equal(unwrap(await patient.rpc("link_my_patient_file")), walkIn.id);

assert.equal(unwrap(await patient.rpc("complete_my_profile", {
  p_full_name: "Integration Fixture", p_age: 30, p_address: "Fixture Place",
  p_has_allergy: false, p_allergy_text: null, p_has_chronic: false,
  p_chronic_text: null, p_takes_meds: null, p_meds_text: null,
})), walkIn.id);
assert.deepEqual(unwrap(await secretary.from("patient_medical_alerts").select("patient_id")), []);

const date = addClinicDays(clinicDateOf(new Date()), 1);
const workingHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday, isOpen: true, startTime: "10:00", endTime: "18:00",
}));
const saved = unwrap(await secretary.rpc("update_schedule", {
  p_slot_minutes: 15, p_working_hours: workingHours, p_days_off: [],
}));
assert.equal(saved.working_hours.length, 7);

const { slots } = unwrap(await patient.rpc("get_available_slots", { p_day: date }));
assert.ok(slots[0].available);
const appointment = {
  patient_id: walkIn.id, slot_start: slots[0].start, slot_end: slots[0].end, visit_type: "new",
};
const outcomes = await Promise.all([
  patient.from("appointments").insert(appointment).select("id").single(),
  secretary.from("appointments").insert(appointment).select("id").single(),
]);
assert.equal(outcomes.filter((entry) => !entry.error).length, 1);
assert.equal(outcomes.find((entry) => entry.error).error.code, "23P01");
const fresh = unwrap(await patient.rpc("get_available_slots", { p_day: date }));
assert.equal(fresh.slots[0].available, false);

if (serverUrl) {
  const slotsResponse = await fetch(new URL("/api/slots?date=" + date, serverUrl), {
    headers: { cookie: patientCookie() },
  });
  assert.equal(slotsResponse.status, 200);
  assert.equal(slotsResponse.headers.get("cache-control"), "private, no-store");
  assert.equal((await slotsResponse.json()).slots[0].available, false);
  const forbidden = await fetch(new URL("/api/queue", serverUrl), { headers: { cookie: patientCookie() } });
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).code, "FORBIDDEN");
  const staffHeaders = { cookie: secretaryCookie() };
  const queue = await fetch(new URL("/api/queue?date=" + date, serverUrl), { headers: staffHeaders });
  assert.equal(queue.status, 200);
  const queueData = await queue.json();
  assert.equal(queueData.counters.total, 1);
  assert.equal(queueData.items[0].patientId, walkIn.id);
  const search = await fetch(new URL("/api/patients/search?q=Integration", serverUrl), { headers: staffHeaders });
  assert.equal(search.status, 200);
  assert.equal((await search.json()).items[0].patientId, walkIn.id);
  const unseen = await fetch(new URL("/api/online-bookings/unseen-count", serverUrl), { headers: staffHeaders });
  assert.equal(unseen.status, 200);
  assert.equal((await unseen.json()).count, outcomes[0].error ? 0 : 1);
}

unwrap(await patient.auth.updateUser({ phone: "+201000000003" }));
const change = unwrap(await patient.auth.verifyOtp({ phone: "+201000000003", token: "345678", type: "phone_change" }));
assert.equal(change.user.id, verified.user.id);
assert.equal(unwrap(await patient.from("patients").select("phone").eq("id", walkIn.id).single()).phone, "+201000000003");
unwrap(await patient.auth.signOut({ scope: "global" }));

const resetPhone = "+201000000002";
const oldPassword = randomUUID();
const newPassword = randomUUID();
unwrap(await admin.auth.admin.createUser({ phone: resetPhone, password: oldPassword, phone_confirm: true }));
const { client: recovery } = makeCookieClient();
unwrap(await recovery.auth.signInWithOtp({ phone: resetPhone, options: { shouldCreateUser: false } }));
unwrap(await recovery.auth.verifyOtp({ phone: resetPhone, token: "234567", type: "sms" }));
assert.equal(unwrap(await recovery.rpc("get_my_role")), "patient");
unwrap(await recovery.auth.updateUser({ password: newPassword }));
unwrap(await recovery.auth.signOut({ scope: "global" }));
assert.equal((await recovery.auth.signInWithPassword({ phone: resetPhone, password: oldPassword })).error?.code, "invalid_credentials");
assert.ok(unwrap(await recovery.auth.signInWithPassword({ phone: resetPhone, password: newPassword })).session);
unwrap(await recovery.auth.signOut({ scope: "local" }));

console.log("Passed local OTP, walk-in linkage, phone change, password recovery, role isolation, and concurrent booking.");

function makeCookieClient() {
  const jar = new Map();
  const client = createServerClient(url, anonymousKey, {
    cookies: {
      getAll: () => [...jar.values()],
      setAll: (values) => values.forEach((cookie) => jar.set(cookie.name, cookie)),
    },
  });
  function cookieHeader() {
    return [...jar.values()].filter(({ value }) => value)
      .map(({ name, value }) => name + "=" + encodeURIComponent(value)).join("; ");
  }
  return { client, cookieHeader };
}

function unwrap(result) {
  if (result.error) throw new Error("Supabase fixture operation failed with code: " + (result.error.code ?? result.error.name), { cause: result.error });
  return result.data;
}

function mustHave(name) {
  const value = process.env[name];
  if (!value) throw new Error("Set " + name + " to the local Supabase value.");
  return value;
}

function readLocalUrl(raw) {
  if (!raw) throw new Error("The integration suite requires a local URL.");
  const value = new URL(raw);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(value.hostname), "Use an isolated local instance.");
  return value.href;
}
