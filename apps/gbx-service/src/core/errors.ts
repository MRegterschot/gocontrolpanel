import type { ErrorCode } from "@tmcp/shared";

const statusByCode: Partial<Record<ErrorCode, number>> = {
  BadRequest: 400,
  Unauthorized: 401,
  NotFound: 404,
  ServerNotFound: 404,
  PlayerNotFound: 404,
  MethodNotAllowed: 403,
  ServerNotConnected: 409,
  RemoveLastMapError: 409,
  GbxCallFailed: 502,
  AddMapListError: 502,
  RemoveMapListError: 502,
  ReorderMapListError: 502,
  UpstreamError: 502,
  InternalError: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.status = statusByCode[code] ?? 500;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
