import { jwtVerify, SignJWT } from "jose";
import { SessionClaims, sessionClaimsSchema } from "../permissions";

export const WS_TICKET_ISSUER = "gcp-web";
export const WS_TICKET_AUDIENCE = "gcp-gbx-ws";
export const WS_TICKET_TTL_SECONDS = 60;

export interface VerifiedWsTicket {
  ticketId: string;
  expiresAt: number;
  claims: SessionClaims;
}

// Shortest accepted value for GBX_SERVICE_TOKEN and WS_TICKET_SECRET
export const MIN_SECRET_LENGTH = 32;

function encodeSecret(secret: string): Uint8Array {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`WS ticket secret must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  return new TextEncoder().encode(secret);
}

// Issued by the web app for an authenticated session; the browser passes it as ?ticket=
export async function signWsTicket(
  claims: SessionClaims,
  secret: string,
  ttlSeconds = WS_TICKET_TTL_SECONDS,
): Promise<string> {
  return new SignJWT({ claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(WS_TICKET_ISSUER)
    .setAudience(WS_TICKET_AUDIENCE)
    .setSubject(claims.id)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(encodeSecret(secret));
}

export async function verifyWsTicket(
  ticket: string,
  secret: string,
): Promise<VerifiedWsTicket> {
  const { payload } = await jwtVerify(ticket, encodeSecret(secret), {
    issuer: WS_TICKET_ISSUER,
    audience: WS_TICKET_AUDIENCE,
    algorithms: ["HS256"],
  });

  if (!payload.jti || !payload.exp) {
    throw new Error("WS ticket is missing jti or exp");
  }

  return {
    ticketId: payload.jti,
    expiresAt: payload.exp * 1000,
    claims: sessionClaimsSchema.parse(payload.claims),
  };
}
