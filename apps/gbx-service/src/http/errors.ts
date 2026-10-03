import type { ApiErrorBody } from "@gcp/shared";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { AppError, errorMessage } from "../core/errors";

export function parse<T>(schema: ZodType<T, ZodTypeDef, unknown>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new AppError(
    "BadRequest",
    result.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; "),
  );
}

// Errors from the dedicated server (XML-RPC faults) surface as GbxCallFailed
export async function gbxOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GbxCallFailed", errorMessage(error), { cause: error });
  }
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let body: ApiErrorBody;
  let status: number;

  if (error instanceof AppError) {
    status = error.status;
    body = { error: { code: error.code, message: error.message } };
  } else if (error instanceof ZodError) {
    status = 400;
    body = { error: { code: "BadRequest", message: error.message } };
  } else if ("statusCode" in error && error.statusCode && error.statusCode < 500) {
    status = error.statusCode;
    body = { error: { code: status === 404 ? "NotFound" : "BadRequest", message: error.message } };
  } else {
    status = 500;
    body = { error: { code: "InternalError", message: "Internal server error" } };
  }

  // A fault from the dedicated server means it rejected the input, not that the service failed
  const serverRejected = error instanceof AppError && error.code === "GbxCallFailed";
  if (status >= 500 && !serverRejected) {
    request.log.error({ err: error }, "Request failed");
  } else {
    request.log.warn({ err: errorMessage(error), status }, "Request rejected");
  }

  return reply.status(status).send(body);
}
