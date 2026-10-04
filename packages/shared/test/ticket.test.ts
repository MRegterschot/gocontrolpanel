import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signWsTicket, verifyWsTicket } from "../src/ws/ticket";
import { makeClaims } from "./fixtures";

const secret = "a".repeat(32);

describe("ws tickets", () => {
  it("round-trips claims", async () => {
    const claims = makeClaims({ admin: true });
    const ticket = await signWsTicket(claims, secret);
    const verified = await verifyWsTicket(ticket, secret);

    expect(verified.claims).toEqual(claims);
    expect(verified.ticketId).toMatch(/[0-9a-f-]{36}/);
    expect(verified.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects a ticket signed with another secret", async () => {
    const ticket = await signWsTicket(makeClaims(), "b".repeat(32));
    await expect(verifyWsTicket(ticket, secret)).rejects.toThrow();
  });

  it("rejects expired tickets", async () => {
    const ticket = await new SignJWT({ claims: makeClaims() })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("tmcp-web")
      .setAudience("tmcp-gbx-ws")
      .setJti("x")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(secret));
    await expect(verifyWsTicket(ticket, secret)).rejects.toThrow();
  });

  it("rejects tokens meant for another audience", async () => {
    const ticket = await new SignJWT({ claims: makeClaims() })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("tmcp-web")
      .setAudience("something-else")
      .setJti("x")
      .setExpirationTime("1m")
      .sign(new TextEncoder().encode(secret));
    await expect(verifyWsTicket(ticket, secret)).rejects.toThrow();
  });

  it("refuses short secrets", async () => {
    await expect(signWsTicket(makeClaims(), "short")).rejects.toThrow(/32/);
  });
});
