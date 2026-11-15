// Resolve the frontend landing path after login.
import type { Role } from "../types/shared";

const rolePrefix: Record<Role, string> = {
  patient: "/patient", secretary: "/secretary", doctor: "/doctor",
};
export function homeFor(role: Role, profileComplete = true): string {
  if (role === "patient") return profileComplete ? "/patient/home" : "/patient/complete-profile";
  return rolePrefix[role] + "/queue";
}
