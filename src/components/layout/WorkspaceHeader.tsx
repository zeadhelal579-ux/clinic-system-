// Identify the active workspace and give authenticated users a way to sign out.
import { clinicName } from "@/i18n/messages";
import { LogoutButton } from "./LogoutButton";

export function WorkspaceHeader() {
  return (
    <header className="workspace-header">
      <div className="workspace-bar">
        <p className="clinic-brand"><span className="clinic-mark" aria-hidden="true" />{clinicName}</p>
        <LogoutButton />
      </div>
    </header>
  );
}
