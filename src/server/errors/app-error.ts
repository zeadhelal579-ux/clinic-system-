// Represent safe, stable errors in both server actions and HTTP responses.
export const HTTP_STATUS = {
  VALIDATION_FAILED: 400,
  CAPTCHA_FAILED: 400,
  OTP_INVALID: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  PROFILE_INCOMPLETE: 403,
  NOT_FOUND: 404,
  SLOT_TAKEN: 409,
  INVALID_STATE_TRANSITION: 409,
  PHONE_ALREADY_REGISTERED: 409,
  SLOT_UNAVAILABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof HTTP_STATUS;
type ErrorFields = {
  messageKey?: string;
  fields?: Record<string, string>;
  details?: Record<string, string>;
};
export type AppErrorBody = Required<Pick<ErrorFields, "messageKey">> &
  Omit<ErrorFields, "messageKey"> & { code: ErrorCode; requestId: string };

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: AppErrorBody };

export class AppError extends Error {
  constructor(readonly code: ErrorCode, private readonly fields: ErrorFields = {}) {
    super(fields.messageKey ?? "errors." + code.toLowerCase());
    this.name = "AppError";
  }

  toBody(requestId: string): AppErrorBody {
    return { ...this.fields, messageKey: this.message, code: this.code, requestId };
  }
}
