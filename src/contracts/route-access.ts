// Identify the public entry points and role landing paths.
import type { Role } from "./clinic";

const rolePrefix: Record<Role, string> = {
  patient: "/patient", secretary: "/secretary", doctor: "/doctor",
};
export const isPublicAuthPath = (pathname: string) => pathname === "/login" || pathname === "/register";
export const isProtectedPage = (pathname: string) => Object.values(rolePrefix).some(
  (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
);

export function homeFor(role: Role, profileComplete = true): string {
  if (role === "patient") return profileComplete ? "/patient/home" : "/patient/complete-profile";
  return rolePrefix[role] + "/queue";
}
