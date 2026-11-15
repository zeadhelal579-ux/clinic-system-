// Fail closed when PostgREST rejects a query.
import "server-only";
import { mapDbError } from "../errors/map-db-error";
import { AppError } from "../errors/app-error";

type Result<T> = { data: T | null; error: { message: string; code?: string; hint?: string | null } | null };
export function optionalResult<T>(result: Result<T>): T | null {
  if (result.error) throw mapDbError(result.error);
  return result.data;
}
export function requiredResult<T>(result: Result<T>): T {
  const value = optionalResult(result);
  if (value === null) throw new AppError("INTERNAL");
  return value;
}
