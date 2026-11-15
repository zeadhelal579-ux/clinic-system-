// Verify Cairo calendar boundaries and Egyptian phone normalization.
import assert from "node:assert/strict";
import test from "node:test";
import { addClinicDays, clinicDateOf, clinicDayBounds } from "../../src/lib/time/clinic-time.ts";
import { fromAuthPhone, normalizeEgyptPhone } from "../../src/lib/phone/phone.ts";

test("late UTC events belong to the next Cairo calendar day", () => {
  assert.equal(clinicDateOf("2026-11-14T22:30:00Z"), "2026-11-15");
  assert.deepEqual(clinicDayBounds("2026-11-15"), {
    start: "2026-11-14T22:00:00.000Z", end: "2026-11-15T22:00:00.000Z",
  });
});

test("spring daylight saving creates a 23-hour Cairo day", () => {
  const bounds = clinicDayBounds("2026-04-24");
  assert.equal((Date.parse(bounds.end) - Date.parse(bounds.start)) / 3_600_000, 23);
});

test("calendar increments cross month and leap-day boundaries", () => {
  assert.equal(addClinicDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addClinicDays("2026-12-31", 1), "2027-01-01");
});

test("Egyptian mobile input and both Arabic digit sets normalize consistently", () => {
  for (const candidate of ["010 1234 5678", "٠١٠١٢٣٤٥٦٧٨", "۰۱۰۱۲۳۴۵۶۷۸", "+201012345678"]) {
    assert.equal(normalizeEgyptPhone(candidate), "+201012345678");
  }
  assert.equal(fromAuthPhone("201012345678"), "+201012345678");
  assert.equal(normalizeEgyptPhone("02 1234 5678"), null);
  assert.equal(normalizeEgyptPhone("call 01012345678"), null);
});
