// Authenticate the frontend server and dispatch an allowlisted clinic operation.
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "@/server/errors/app-error";
import { clinicOperations } from "@/server/http/operations";
import { runRoute } from "@/server/http/run-route";

export async function POST(request: Request, context: RouteContext<"/api/internal/[operation]">) {
  return runRoute("clinicOperation", async () => {
    const token = process.env.CLINIC_INTERNAL_TOKEN;
    if (!token || token.length < 32) throw new AppError("UNAVAILABLE");

    const actual = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new AppError("FORBIDDEN");
    }

    const { operation } = await context.params;
    if (!Object.hasOwn(clinicOperations, operation)) throw new AppError("NOT_FOUND");

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 64 * 1024) throw new AppError("VALIDATION_FAILED");
    const payload: unknown = await request.json().catch(() => {
      throw new AppError("VALIDATION_FAILED");
    });
    const result = z.strictObject({ input: z.unknown().optional() }).safeParse(payload);
    if (!result.success) throw new AppError("VALIDATION_FAILED");
    return clinicOperations[operation as keyof typeof clinicOperations](result.data.input);
  });
}
