// Refresh the browser session before rendering protected pages.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requestOperation } from "@/backend/request";
import { backendCookies } from "@/backend/transport";
import { isProtectedPage, isPublicAuthPath } from "@/contracts/route-access";

const sessionSchema = z.object({ role: z.enum(["patient", "secretary", "doctor"]).nullable() }).nullable();

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookie = request.headers.get("cookie") ?? "";
  let redirectTo = isProtectedPage(pathname) && !cookie ? "/login" : undefined;
  let refreshed: ReturnType<typeof backendCookies> = [];

  if (cookie) {
    try {
      const upstream = await requestOperation("session", cookie);
      if (upstream.ok) {
        const session = sessionSchema.parse(await upstream.json());
        refreshed = backendCookies(upstream);
        for (const { name, value, maxAge } of refreshed) {
          if (maxAge === 0) request.cookies.delete(name);
          else request.cookies.set(name, value);
        }
        if (!session && isProtectedPage(pathname)) redirectTo = "/login";
        if (session && isPublicAuthPath(pathname)) redirectTo = "/";
      }
    } catch {
      // Protected renders independently enforce the session when the backend is reachable.
    }
  }

  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request: { headers: request.headers } });
  for (const entry of refreshed) response.cookies.set(entry);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/", "/login", "/register", "/patient/:path*", "/secretary/:path*", "/doctor/:path*"],
};
