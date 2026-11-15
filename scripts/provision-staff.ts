// Create one staff account and its database role in the same Auth transaction.
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [role, rawEmail] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  const password = process.env.CLINIC_STAFF_PASSWORD;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if ((role !== "doctor" && role !== "secretary") || !email || !password || !url || !key) {
    console.error("Usage: pnpm staff:create doctor|secretary staff@example.com (set administrative credentials and CLINIC_STAFF_PASSWORD)");
    process.exitCode = 1;
    return;
  }
  if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
    console.error("Use a staff password with at least 12 characters and at most 72 UTF-8 bytes.");
    process.exitCode = 1;
    return;
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.admin.createUser({
    email, password, email_confirm: true, app_metadata: { clinic_role: role },
  });
  if (error) {
    console.error("Could not create staff account. Provider code:", error.code ?? "UNKNOWN");
    process.exitCode = 1;
    return;
  }
  console.log("Created a staff account with role:", role);
}

main().catch(() => {
  console.error("Staff provisioning could not connect to Supabase.");
  process.exitCode = 1;
});
