// Render the patient registration and mobile number verification journey.
import type { Metadata } from "next";
import { RegisterFlow } from "@/features/auth/RegisterFlow";

export const metadata: Metadata = { title: "إنشاء حساب مريض" };

export default function RegisterPage() {
  return <RegisterFlow />;
}
