import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/core/errors";
import { errorHandler } from "../../src/http/errors";

function handle(error: Error) {
  const log = { error: vi.fn(), warn: vi.fn() };
  const reply = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() };
  errorHandler(error, { log } as unknown as FastifyRequest, reply as unknown as FastifyReply);
  return { log, status: reply.status.mock.calls[0][0], body: reply.send.mock.calls[0][0] };
}

describe("errorHandler", () => {
  it("logs a dedicated server fault as a rejected request, not a service failure", () => {
    const { log, status, body } = handle(new AppError("GbxCallFailed", "Map unknown."));
    expect(status).toBe(502);
    expect(body).toEqual({ error: { code: "GbxCallFailed", message: "Map unknown." } });
    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith({ err: "Map unknown.", status: 502 }, "Request rejected");
  });

  it("still logs unexpected errors as failures without leaking them", () => {
    const { log, status, body } = handle(new Error("boom"));
    expect(status).toBe(500);
    expect(body).toEqual({ error: { code: "InternalError", message: "Internal server error" } });
    expect(log.error).toHaveBeenCalled();
  });
});
