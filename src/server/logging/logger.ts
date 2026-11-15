// Emit only operational failure metadata.
import "server-only";
import type { AppErrorBody } from "../errors/app-error";

export function logOperationFailure(operation: string, error: AppErrorBody) {
  if (error.code === "INTERNAL" || error.code === "UNAVAILABLE") {
    console.error(JSON.stringify({ operation, code: error.code, requestId: error.requestId }));
  }
}
