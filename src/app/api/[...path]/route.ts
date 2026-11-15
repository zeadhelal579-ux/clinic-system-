// Preserve the browser's same-origin clinic read endpoints.
import { randomUUID } from "node:crypto";
import { requestBackend } from "@/backend/request";
import { AppError } from "@/contracts/app-error";

const routes = new Set(["slots", "queue", "patients/search", "online-bookings/unseen-count"]);

export async function GET(request: Request, context: RouteContext<"/api/[...path]">) {
  const route = (await context.params).path.join("/");
  const headers = new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie" });
  if (!routes.has(route)) return Response.json(new AppError("NOT_FOUND").toBody(randomUUID()), {
    status: 404, headers,
  });

  try {
    const query = new URL(request.url).search;
    const upstream = await requestBackend(`/api/${route}${query}`, request.headers.get("cookie") ?? "");
    for (const name of ["Content-Type", "X-Request-Id"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json(new AppError("UNAVAILABLE").toBody(randomUUID()), { status: 503, headers });
  }
}
