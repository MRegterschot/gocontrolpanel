import { createServer, type Server } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TIMEOUT_MS,
  LONG_TIMEOUT_MS,
  serviceRequest,
} from "../src/lib/service-request";

let server: Server;
let baseUrl: string;
const sockets = new Set<Socket>();

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const json = (status: number, body: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
      };

      switch (req.url) {
        case "/echo":
          return json(200, {
            data: {
              method: req.method,
              authorization: req.headers.authorization,
              contentType: req.headers["content-type"] ?? null,
              body: Buffer.concat(chunks).toString() || null,
            },
          });
        case "/api-error":
          return json(409, {
            error: { code: "RemoveLastMapError", message: "Cannot remove the last map from the server" },
          });
        case "/plain-error":
          res.writeHead(502, { "Content-Type": "text/plain" });
          return res.end("Bad gateway");
        case "/hang":
          return; // never answers
        case "/stall-body":
          res.writeHead(200, { "Content-Type": "application/json" });
          return void res.write('{"data":'); // the rest never comes
      }
    });
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  sockets.forEach((socket) => socket.destroy());
  await new Promise((resolve) => server.close(resolve));
});

const options = (extra = {}) => ({ baseUrl, token: "secret-token", timeoutMs: 200, ...extra });

describe("serviceRequest", () => {
  it("sends the token and a JSON body, and unwraps the data", async () => {
    const data = await serviceRequest("POST", "/echo", { a: 1 }, options());

    expect(data).toEqual({
      method: "POST",
      authorization: "Bearer secret-token",
      contentType: "application/json",
      body: '{"a":1}',
    });
  });

  it("sends no content type without a body", async () => {
    const data = await serviceRequest<{ contentType: string | null }>("GET", "/echo", undefined, options());
    expect(data.contentType).toBeNull();
  });

  it("keeps the code and message of an error from the service", async () => {
    await expect(serviceRequest("POST", "/api-error", {}, options())).rejects.toMatchObject({
      name: "RemoveLastMapError",
      message: "Cannot remove the last map from the server",
    });
  });

  it("falls back to the status for an error without a JSON body", async () => {
    await expect(serviceRequest("GET", "/plain-error", undefined, options())).rejects.toMatchObject({
      name: "GbxServiceError",
      message: "GBX service responded with 502",
    });
  });
});

describe("a service that does not answer", () => {
  it("gives up after the timeout and reports the service as unavailable", async () => {
    const log = { error: vi.fn() };
    const started = Date.now();

    await expect(
      serviceRequest("GET", "/hang", undefined, options({ log })),
    ).rejects.toMatchObject({
      name: "GbxServiceUnavailable",
      message: "GBX service did not respond within 1 s",
    });

    expect(Date.now() - started).toBeLessThan(2000);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/hang", timedOut: true }),
      "GBX service timed out",
    );
  });

  it("also cuts off a response whose body stalls half way", async () => {
    await expect(serviceRequest("GET", "/stall-body", undefined, options())).rejects.toMatchObject({
      name: "GbxServiceUnavailable",
      message: expect.stringContaining("did not respond"),
    });
  });

  it("does not time out a response that arrives in time", async () => {
    await expect(serviceRequest("GET", "/echo", undefined, options({ timeoutMs: 5000 }))).resolves.toBeTruthy();
  });
});

describe("a service that cannot be reached", () => {
  it("fails at once with the same error code, not as a timeout", async () => {
    const log = { error: vi.fn() };
    const started = Date.now();

    await expect(
      serviceRequest("GET", "/echo", undefined, { baseUrl: "http://127.0.0.1:1", token: "t", log }),
    ).rejects.toMatchObject({ name: "GbxServiceUnavailable", message: "GBX service is unavailable" });

    expect(Date.now() - started).toBeLessThan(2000);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ timedOut: false }),
      "GBX service is unreachable",
    );
  });
});

describe("limits", () => {
  it("lets long operations take longer than ordinary calls", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
    expect(LONG_TIMEOUT_MS).toBeGreaterThan(DEFAULT_TIMEOUT_MS);
  });
});
