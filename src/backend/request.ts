// Send clinic requests from the frontend server with the caller's session.
import "server-only";
import { AppError } from "@/contracts/app-error";

export async function requestBackend(path: string, cookie: string, options: RequestInit = {}) {
  const origin = process.env.CLINIC_BACKEND_URL;
  const token = process.env.CLINIC_INTERNAL_TOKEN;
  if (!origin || !token || token.length < 32) throw new AppError("UNAVAILABLE");

  try {
    const endpoint = new URL(origin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    if (endpoint.protocol !== "https:" && !(local && endpoint.protocol === "http:")) {
      throw new AppError("UNAVAILABLE");
    }
    const headers = new Headers(options.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (cookie) headers.set("cookie", cookie);
    return await fetch(new URL(path, endpoint), {
      ...options,
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppError("UNAVAILABLE");
  }
}

export function requestOperation(operation: string, cookie: string, input?: unknown) {
  return requestBackend(`/api/internal/${operation}`, cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
  });
}
