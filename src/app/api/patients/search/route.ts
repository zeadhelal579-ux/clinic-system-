// Serve the patients/search endpoint with private caching and normalized errors.
import { runRoute } from "@/server/http/run-route";
import { searchPatients } from "@/server/services/patients.service";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return runRoute("searchPatients", () => searchPatients(Object.fromEntries(new URL(request.url).searchParams)));
}
