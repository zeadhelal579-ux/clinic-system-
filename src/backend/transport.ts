// Decode backend results and relay session cookies through Server Actions.
import "server-only";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, HTTP_STATUS, type ActionResult } from "@/contracts/app-error";
import type { OperationData } from "@/contracts/operations";
import { requestOperation } from "./request";

const errorSchema = z.object({
  code: z.enum(Object.keys(HTTP_STATUS) as [keyof typeof HTTP_STATUS, ...(keyof typeof HTTP_STATUS)[]]),
  messageKey: z.string(),
  requestId: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
  details: z.record(z.string(), z.string()).optional(),
});

export function backendCookies(response: Response) {
  return new NextResponse(null, { headers: response.headers }).cookies.getAll();
}

async function decode<Operation extends keyof OperationData>(
  response: Response,
): Promise<ActionResult<OperationData[Operation]>> {
  const payload: unknown = await response.json().catch(() => {
    throw new AppError("UNAVAILABLE");
  });
  if (response.ok) return { ok: true, data: payload as OperationData[Operation] };
  const error = errorSchema.safeParse(payload);
  if (!error.success) throw new AppError("UNAVAILABLE");
  return { ok: false, error: error.data };
}

export async function readClinic<Operation extends keyof OperationData>(operation: Operation, input?: unknown) {
  const cookie = (await headers()).get("cookie") ?? "";
  const response = await requestOperation(operation, cookie, input);
  const result = await decode<Operation>(response);
  if (!result.ok) throw new AppError(result.error.code, result.error);
  return result.data;
}

export async function callCommand<Operation extends keyof OperationData>(
  operation: Operation, input?: unknown,
): Promise<ActionResult<OperationData[Operation]>> {
  try {
    const cookie = (await headers()).get("cookie") ?? "";
    const response = await requestOperation(operation, cookie, input);
    const store = await cookies();
    for (const entry of backendCookies(response)) store.set(entry);
    return await decode<Operation>(response);
  } catch (cause) {
    const error = cause instanceof AppError ? cause : new AppError("INTERNAL");
    return { ok: false, error: error.toBody(randomUUID()) };
  }
}
