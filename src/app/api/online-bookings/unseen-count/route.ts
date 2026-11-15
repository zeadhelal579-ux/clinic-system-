// Serve the online-bookings/unseen-count endpoint with private caching and normalized errors.
import { runRoute } from "@/server/http/run-route";
import { getUnseenOnlineCount } from "@/server/services/appointments.service";

export const dynamic = "force-dynamic";

export function GET() {
  return runRoute("getUnseenOnlineCount", () => getUnseenOnlineCount());
}
