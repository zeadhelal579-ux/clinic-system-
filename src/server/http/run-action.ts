// Validate action arguments and serialize stable errors at the transport.
import "server-only";
import type { ZodType } from "zod";
import { AppError, type ActionResult } from "../errors/app-error";
import { logOperationFailure } from "../logging/logger";
import { getRequestId, withRequestContext } from "./request-context";

export function parseInput<Input>(schema: ZodType<Input>, raw: unknown): Input {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const fields = Object.fromEntries(parsed.error.issues.map((issue) => [
    issue.path.join(".") || "_form",
    issue.message.startsWith("validation.") ? issue.message : "validation.invalid",
  ]));
  throw new AppError("VALIDATION_FAILED", { fields });
}

export function runAction<Result>(operation: string, run: () => Promise<Result>): Promise<ActionResult<Result>> {
  return withRequestContext(async (): Promise<ActionResult<Result>> => {
    try {
      return { ok: true, data: await run() };
    } catch (cause) {
      const error = cause instanceof AppError ? cause : new AppError("INTERNAL");
      const body = error.toBody(getRequestId());
      logOperationFailure(operation, body);
      return { ok: false, error: body };
    }
  });
}
