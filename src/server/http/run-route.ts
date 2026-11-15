// Apply private response caching and the shared HTTP error contract.
import "server-only";
import { HTTP_STATUS } from "../errors/app-error";
import { runAction } from "./run-action";

export async function runRoute<Result>(operation: string, run: () => Promise<Result>) {
  const result = await runAction(operation, run);
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (result.ok) return Response.json(result.data, { headers });
  return Response.json(result.error, {
    status: HTTP_STATUS[result.error.code],
    headers: { ...headers, "X-Request-Id": result.error.requestId },
  });
}
