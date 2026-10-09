// What a sandboxed plugin may do. Declared in the manifest, consented to by the admin at
// install time and enforced by the GBX service at runtime.

// Major version of the plugin API this panel runs. A plugin built for a newer one is refused.
export const PLUGIN_SDK_VERSION = 4;

export const STATIC_CAPABILITIES = [
  "ui",
  "chat:send",
  "storage",
  "records:read",
  "maps:read",
  "maps:write",
  "players:moderate",
  "mode:control",
  "notifications",
  "nadeo:read",
] as const;

export type StaticCapability = (typeof STATIC_CAPABILITIES)[number];
export type HttpCapability = `http:${string}`;
export type Capability = StaticCapability | HttpCapability;

export type CapabilityRisk = "low" | "medium" | "high";

export interface CapabilityInfo {
  label: string;
  description: string;
  risk: CapabilityRisk;
}

export const CAPABILITY_INFO: Record<StaticCapability, CapabilityInfo> = {
  ui: {
    label: "In-game interface",
    description:
      "Show widgets, windows and buttons to players. Their scripts run in the players' game and can open links.",
    risk: "medium",
  },
  "chat:send": {
    label: "Send chat messages",
    description: "Write chat messages to everyone or to single players.",
    risk: "low",
  },
  storage: {
    label: "Storage",
    description: "Keep its own data for this server.",
    risk: "low",
  },
  "records:read": {
    label: "Read records",
    description: "Read the local records stored by the panel.",
    risk: "low",
  },
  "maps:read": {
    label: "Read maps",
    description: "Read the map list and the maps stored by the panel.",
    risk: "low",
  },
  "maps:write": {
    label: "Change maps",
    description: "Add and remove maps, and skip, restart or jump to a map.",
    risk: "medium",
  },
  "players:moderate": {
    label: "Moderate players",
    description:
      "Kick, ban and force players to spectator, and edit the black list and guest list.",
    risk: "high",
  },
  "mode:control": {
    label: "Control the match",
    description:
      "Pause the match, change the mode script and its settings, and set points.",
    risk: "high",
  },
  notifications: {
    label: "Notify admins",
    description:
      "Send notifications to the admins of this server in the panel.",
    risk: "low",
  },
  "nadeo:read": {
    label: "Nadeo leaderboards",
    description:
      "Look up world records, personal bests and account names through the panel's Nadeo account.",
    risk: "low",
  },
};

// A hostname without scheme, port or path; "*." allows every subdomain. The top-level label
// must start with a letter, which keeps IP addresses out.
const HOST_LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const TOP_LABEL = "[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?";
const HTTP_CAPABILITY = new RegExp(
  `^http:(\\*\\.)?(${HOST_LABEL}\\.)+${TOP_LABEL}$`,
);

export function isHttpCapability(value: string): value is HttpCapability {
  return HTTP_CAPABILITY.test(value) && value.length <= 260;
}

export function isCapability(value: string): value is Capability {
  return (
    (STATIC_CAPABILITIES as readonly string[]).includes(value) ||
    isHttpCapability(value)
  );
}

export function describeCapability(capability: string): CapabilityInfo {
  if (isHttpCapability(capability)) {
    const host = capability.slice("http:".length);
    return {
      label: `Web requests to ${host}`,
      description: `Send HTTPS requests to ${host} and read the answers.`,
      risk: "medium",
    };
  }
  return (
    CAPABILITY_INFO[capability as StaticCapability] ?? {
      label: capability,
      description: "Unknown capability.",
      risk: "high",
    }
  );
}

export function httpHosts(capabilities: readonly string[]): string[] {
  return capabilities
    .filter(isHttpCapability)
    .map((capability) => capability.slice("http:".length));
}

// True when one of the http capabilities covers the host
export function isHostAllowed(
  host: string,
  capabilities: readonly string[],
): boolean {
  const target = host.toLowerCase();
  return httpHosts(capabilities).some((pattern) =>
    pattern.startsWith("*.")
      ? target.endsWith(pattern.slice(1)) && target.length > pattern.length - 1
      : target === pattern,
  );
}

// Capabilities in `next` the admin has not consented to yet
export function addedCapabilities(
  granted: readonly string[],
  next: readonly string[],
): string[] {
  const known = new Set(granted);
  return next.filter((capability) => !known.has(capability));
}
