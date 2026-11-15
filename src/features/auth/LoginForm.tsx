// Sign in with an Egyptian mobile number or a staff email address.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { login } from "@/backend/commands";
import { AuthError } from "./AuthError";
import { PasswordField } from "./PasswordField";
import { ResetPasswordFlow } from "./ResetPasswordFlow";
import { TurnstileWidget, type TurnstileHandle } from "./TurnstileWidget";

export function LoginForm() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "reset">("login");
  const [captchaToken, setCaptchaToken] = useState("");
  const challenge = useRef<TurnstileHandle>(null);
  const { run, formError, fieldErrors, isPending } = useActionMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captchaToken) return;
    const form = new FormData(event.currentTarget);
    const input = { identifier: form.get("identifier"), password: form.get("password"), captchaToken };
    const result = await run(() => login(input), { after: () => challenge.current?.reset() });
    if (result?.ok) router.replace(result.data.redirectTo);
  }

  if (view === "reset") return <ResetPasswordFlow onBack={() => setView("login")} />;

  return (
    <>
      <div className="screen-heading">
        <h1 id="screen-title">تسجيل الدخول</h1>
        <p>ادخل برقم موبايلك أو بريد العمل.</p>
      </div>
      <form className="form-stack" onSubmit={submit} aria-busy={isPending}>
        <AuthError message={formError} />
        <fieldset disabled={isPending} className="form-stack">
          <FormField
            label="رقم الموبايل أو البريد الإلكتروني"
            name="identifier"
            placeholder="01XXXXXXXXX"
            dir="ltr"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            error={fieldErrors.identifier}
          />
          <PasswordField
            label="كلمة السر"
            name="password"
            autoComplete="current-password"
            required
            error={fieldErrors.password}
          />
          <Button variant="text" className="forgot-link" onClick={() => {
            setCaptchaToken("");
            setView("reset");
          }}>نسيت كلمة السر؟</Button>
        </fieldset>
        <TurnstileWidget ref={challenge} onToken={setCaptchaToken} />
        <Button type="submit" disabled={isPending || !captchaToken}>
          {isPending ? "جاري تسجيل الدخول…" : "دخول"}
        </Button>
      </form>
      <p className="auth-footer">مريض جديد؟ <Link href="/register">إنشاء حساب</Link></p>
    </>
  );
}
