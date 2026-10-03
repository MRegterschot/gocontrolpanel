import { ServerError } from "@/types/responses";
import { MIN_SECRET_LENGTH } from "@gcp/shared";

interface GbxServiceSecrets {
  TOKEN: string;
  WS_TICKET_SECRET: string;
}

const CHECKED = [
  ["GBX_SERVICE_TOKEN", "TOKEN"],
  ["WS_TICKET_SECRET", "WS_TICKET_SECRET"],
] as const;

export function findGbxServiceConfigProblems(secrets: GbxServiceSecrets): string[] {
  return CHECKED.flatMap(([name, key]) => {
    const value = secrets[key];
    if (!value.trim()) return [`${name} is not set`];
    if (value.length < MIN_SECRET_LENGTH) {
      return [`${name} must be at least ${MIN_SECRET_LENGTH} characters`];
    }
    return [];
  });
}

// Without these every live socket and every action on a server fails later with an unrelated error
export function assertGbxServiceConfig(secrets: GbxServiceSecrets): void {
  const problems = findGbxServiceConfigProblems(secrets);
  if (problems.length === 0) return;

  throw new ServerError(
    [
      "Invalid GBX service configuration:",
      ...problems.map((problem) => `  ${problem}`),
      "Both values must be the same as in the GBX service. Set them in the repo root .env (see .env.example) or the environment.",
    ].join("\n"),
    "InvalidConfigError",
  );
}
