// Serialize form submissions and expose localized action and field errors.
"use client";

import { useRef, useState } from "react";
import { errorMessage } from "@/i18n/messages";
import type { ActionResult, AppErrorBody } from "@/contracts/app-error";

export function useActionMutation() {
  const lock = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearErrors() {
    setFormError(undefined);
    setFieldErrors({});
  }

  function applyError(error: AppErrorBody, otpField?: string) {
    const keys = error.code === "OTP_INVALID" && otpField ? { [otpField]: error.messageKey } : error.fields;
    const fields = Object.fromEntries(Object.entries(keys ?? {}).map(([name, key]) => [
      name, errorMessage(key, errorMessage("validation.invalid")),
    ]));
    setFieldErrors(fields);
    if (Object.keys(fields).length === 0 || fields._form) {
      setFormError(fields._form ?? errorMessage(error.messageKey));
    }
  }

  async function run<T>(action: () => Promise<ActionResult<T>>, options: {
    otpField?: string;
    after?: () => void;
  } = {}): Promise<ActionResult<T> | undefined> {
    if (lock.current) return;
    lock.current = true;
    setIsPending(true);
    clearErrors();

    try {
      const result = await action();
      if (!result.ok) applyError(result.error, options.otpField);
      return result;
    } catch {
      setFormError(errorMessage("errors.unavailable"));
    } finally {
      lock.current = false;
      setIsPending(false);
      options.after?.();
    }
  }

  return { run, formError, fieldErrors, setFieldErrors, isPending };
}
