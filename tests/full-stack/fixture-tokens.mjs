// Sign short-lived tokens for the disposable, loopback-only database fixtures.
import { createHmac } from "node:crypto";

const role = process.argv[2];
if (!["anon", "service_role"].includes(role) || !process.env.GOTRUE_JWT_SECRET) {
  throw new Error("Set a disposable JWT secret and choose a fixture role.");
}
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const body = [
  encode({ alg: "HS256", typ: "JWT" }),
  encode({ role, exp: Math.floor(Date.now() / 1000) + 3600 }),
].join(".");
console.log(body + "." + createHmac("sha256", process.env.GOTRUE_JWT_SECRET).update(body).digest("base64url"));
