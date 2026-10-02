import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { AppError } from "../core/errors";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Internal routes are only for the web app, authenticated with a shared bearer token
export function requireServiceToken(token: string) {
  return async (request: FastifyRequest) => {
    const header = request.headers.authorization ?? "";
    const [scheme, value] = header.split(" ");
    if (scheme !== "Bearer" || !value || !safeEqual(value, token)) {
      throw new AppError("Unauthorized", "Missing or invalid service token");
    }
  };
}
