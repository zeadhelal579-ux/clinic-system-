// Keep the error reference stable throughout a single server request.
import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const requestContext = new AsyncLocalStorage<string>();

export function withRequestContext<T>(run: () => T): T {
  return requestContext.run(randomUUID(), run);
}

export function getRequestId() {
  return requestContext.getStore() ?? randomUUID();
}
