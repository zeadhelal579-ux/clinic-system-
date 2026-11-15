// Serve the queue endpoint with private caching and normalized errors.
import { runRoute } from "@/server/http/run-route";
import { getQueue } from "@/server/services/queue.service";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return runRoute("getQueue", () => getQueue(Object.fromEntries(new URL(request.url).searchParams)));
}
