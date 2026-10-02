import { SessionClaims, sessionClaimsSchema } from "../src/permissions";

export function makeClaims(overrides: Partial<SessionClaims> = {}): SessionClaims {
  return sessionClaimsSchema.parse({
    id: "user-1",
    login: "login-1",
    displayName: "User One",
    admin: false,
    permissions: [],
    servers: [],
    groups: [],
    adminGroups: [],
    projects: [],
    ...overrides,
  });
}
