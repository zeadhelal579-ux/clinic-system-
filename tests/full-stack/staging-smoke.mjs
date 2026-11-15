// Check the public staging surface and anonymous access boundaries over HTTPS.
import assert from "node:assert/strict";

const rawOrigin = process.argv[2];
assert.ok(rawOrigin, "Usage: node back-end/tests/full-stack/staging-smoke.mjs https://staging.example.com");
const origin = new URL(rawOrigin);
assert.equal(origin.protocol, "https:", "Pass the staging HTTPS origin.");
assert.equal(origin.href, origin.origin + "/", "Pass an origin without a path, credentials or query.");

const protectedPages = [
  "/patient/home", "/patient/book", "/patient/complete-profile", "/patient/my-data", "/patient/record",
  "/secretary/queue", "/secretary/new-booking", "/secretary/online", "/secretary/patients", "/secretary/schedule", "/secretary/cashbox",
  "/doctor/queue", "/doctor/patients", "/doctor/cashbox",
];
const privateRoutes = ["/api/slots", "/api/queue", "/api/patients/search", "/api/online-bookings/unseen-count"];

for (const path of ["/login", "/register"]) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
  assert.equal(response.headers.get("x-frame-options"), "DENY", path);
  assert.match(response.headers.get("cache-control") ?? "", /\bno-store\b/, path);
  assert.match(await response.text(), /<html[^>]*\bdir=["']rtl["']/, path);
  console.log("PASS public staging page", path);
}

for (const path of protectedPages) {
  const response = await request(path);
  assert.ok([302, 303, 307, 308].includes(response.status), path);
  assert.equal(new URL(response.headers.get("location"), origin).href, new URL("/login", origin).href, path);
  console.log("PASS anonymous page guard", path);
}

for (const path of privateRoutes) {
  const response = await request(path);
  assert.equal(response.status, 401, path);
  assert.match(response.headers.get("cache-control") ?? "", /\bno-store\b/, path);
  const { code, requestId } = await response.json();
  assert.equal(code, "UNAUTHENTICATED", path);
  assert.ok(requestId && requestId === response.headers.get("x-request-id"), path);
  console.log("PASS anonymous API guard", path);
}

function request(path) {
  return fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(12_000) });
}
