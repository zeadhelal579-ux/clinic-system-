// Serve the slots endpoint with private caching and normalized errors.
import { runRoute } from "@/server/http/run-route";
import { getSlots } from "@/server/services/slots.service";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return runRoute("getSlots", () => getSlots(Object.fromEntries(new URL(request.url).searchParams)));
}
