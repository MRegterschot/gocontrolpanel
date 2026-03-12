import { TBreadcrumb } from "@/components/shell/breadcrumbs";
import { routes } from "@/routes";
import { SpectatorStatus } from "@/types/gbx/player";
import { Player } from "@/types/gbx/scores";
import { clsx, type ClassValue } from "clsx";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(time?: number): string {
  if (!time || time <= 0) {
    return "--:--.---";
  }

  if (time < 60000) {
    return (time / 1000).toFixed(3).padStart(6, "0");
  }

  const minutes = Math.floor(time / 60000);
  const seconds = (time % 60000) / 1000;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

export function getErrorMessage(error: unknown): string {
  let message = "Something went wrong";

  // Handle Error or ServerError (with .message)
  if (error instanceof Error) {
    message = error.message;
  }

  // Handle HetznerApiError structure
  if (typeof error === "object" && error !== null && "message" in error) {
    const errMsg = (error as any).message;
    if (typeof errMsg === "string") {
      message = capitalize(errMsg);
    }
  }

  // Optionally extract from XML-RPC fault
  const match = message.match(/Error: XML-RPC fault:\s*(.*)/);
  return match ? match[1] : message;
}

export function generatePath(
  path: string,
  params: Record<string, string | number>,
): string {
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(`:${key}`, String(value));
  }, path);
}

export function getDivergingList<T extends Record<string, any>>(
  list1: T[],
  list2: T[],
  key: string,
): [T[], T[]] {
  const minLength = Math.min(list1.length, list2.length);
  let divergenceIndex = minLength;

  for (let i = 0; i < minLength; i++) {
    if (list1[i][key] !== list2[i][key]) {
      divergenceIndex = i;
      break;
    }
  }

  return [list1.slice(divergenceIndex), list2.slice(divergenceIndex)];
}

export function toReadableTitle(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Utility: Convert route pattern to RegExp
function pathToRegex(path: string) {
  return new RegExp("^" + path.replace(/:[^/]+/g, "([^/]+)") + "$");
}

export function getCurrentId(pathname: string): string | null {
  for (const route of Object.values(routes.servers)) {
    const regex = pathToRegex(route);
    const match = pathname?.match(regex);
    if (match) {
      return match[1]; // Assuming the server UUID is the first captured group
    }
  }

  return null;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = "Operation timed out",
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), ms),
  );
  return Promise.race([promise, timeout]);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  i = Math.min(Math.max(i, 0), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatTimeToAgo(date: Date): string {
  const now = new Date();
  const diff = (date.getTime() - now.getTime()) / 1000; // in seconds

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const ranges: { [K: string]: number } = {
    year: 60 * 60 * 24 * 365, // 365 days
    month: 60 * 60 * 24 * 30, // 30 days
    week: 60 * 60 * 24 * 7, // 7 days
    day: 60 * 60 * 24, // 24 hours
    hour: 60 * 60, // 60 minutes
    minute: 60, // 60 seconds
    second: 1, // 1 second
  };

  for (const [unit, secondsInUnit] of Object.entries(ranges)) {
    const delta = diff / secondsInUnit;
    if (Math.abs(delta) >= 1 || unit === "second") {
      return rtf.format(Math.round(delta), unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return "just now";
}

export function pathToBreadcrumbs(path?: string): TBreadcrumb[] {
  if (!path) {
    return [];
  }

  const segments = path.split("/").filter(Boolean);
  const crumbs: TBreadcrumb[] = [];
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    currentPath += "/" + segments[i];
    crumbs.push({
      label: segments[i],
      path: currentPath,
    });
  }

  return crumbs;
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export function getList<T>(list: any): T[] {
  if (Array.isArray(list)) {
    return list as T[];
  } else if (typeof list === "string") {
    return [list as T];
  } else if (typeof list === "object" && list !== null) {
    return Object.keys(list) as T[];
  }
  return [];
}

export function removePrefix(str: string, prefix: string): string {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length);
  }
  return str;
}

export function initGbxWebsocketClient(
  path: string,
  params?: Record<string, string | string[]>,
): WebSocket {
  const searchParams = new URLSearchParams();

  if (params) {
    for (const key in params) {
      const value = params[key];
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    }
  }

  return new WebSocket(`${path}?${searchParams.toString()}`);
}

export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

export function isValidHetznerServerName(name: string): boolean {
  const maxLength = 253;

  const hostnameRegex =
    /^(?!-)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

  return name.length <= maxLength && hostnameRegex.test(name);
}

export function generateRandomString(length = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function isFinalist(matchPoints: number, pointsLimit?: number): boolean {
  if (pointsLimit === undefined) {
    return false;
  }

  return matchPoints == pointsLimit;
}

export function isLastChance(matchPoints: number): boolean {
  return -2000 < matchPoints && matchPoints <= -1000; // -1999 to -1000
}

export function isEliminated(matchPoints: number): boolean {
  return -10000 < matchPoints && matchPoints <= -2000; // -9999 to -2000
}

export function isWinner(matchPoints: number, pointsLimit?: number): boolean {
  if (pointsLimit === undefined) {
    return false;
  }

  return matchPoints > pointsLimit;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatMessage(
  format: string,
  login: string,
  nickName: string,
  message: string,
): string {
  const msg = format
    .replaceAll("{login}", login)
    .replaceAll("{nickName}", nickName)
    .replaceAll("{message}", message);
  return msg.trim();
}

export const permissions: string[] = [
  "users:view",
  "users:edit",
  "users:delete",
  "groups:view",
  "groups:create",
  "groups:edit",
  "groups:delete",
  "roles:view",
  "roles:create",
  "roles:edit",
  "roles:delete",
  "servers:view",
  "servers:create",
  "servers:edit",
  "servers:delete",
  "hetzner:view",
  "hetzner:create",
  "hetzner:edit",
  "hetzner:delete",
  "hetzner:servers:view",
  "hetzner:servers:create",
  "hetzner:servers:delete",
  "audit-logs:view",
  "audit-logs:delete",
] as const;

export function hasPermissionSync(
  session: Session | null,
  permissions?: string[],
  id = "",
): boolean {
  if (!session) return false;

  return hasPermissionsJWTSync(session.user, permissions, id);
}

export function hasPermissionsJWTSync(
  jwt: JWT,
  permissions?: string[],
  id = "",
): boolean {
  if (jwt.admin) return true;
  if (!permissions || permissions.length === 0) return true;

  const userPermissions = jwt.permissions;

  jwt.groups.forEach((group) => {
    const role = group.role.toLowerCase();
    userPermissions.push(`groups::${role}`);
    userPermissions.push(`groups:${group.id}:${role}`);
    group.servers.forEach((server) => {
      userPermissions.push(`group:servers::${role}`);
      userPermissions.push(`group:servers:${server.id}:${role}`);
    });
  });

  jwt.projects.forEach((project) => {
    const role = project.role.toLowerCase();
    userPermissions.push(`hetzner::${role}`);
    userPermissions.push(`hetzner:${project.id}:${role}`);
  });

  jwt.servers.forEach((server) => {
    const role = server.role.toLowerCase();
    userPermissions.push(`servers::${role}`);
    userPermissions.push(`servers:${server.id}:${role}`);
  });

  permissions = permissions.map((permission) =>
    permission.replace(":id", `:${id}`),
  );

  return permissions.some((permission) => userPermissions.includes(permission));
}

export function getCurrencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "GBP":
      return "£";
    case "JPY":
    case "CNY":
      return "¥";
    case "INR":
      return "₹";
    case "AUD":
      return "A$";
    case "CAD":
      return "C$";
    case "CHF":
      return "Fr.";
    case "KRW":
      return "₩";
    case "RUB":
      return "₽";
    case "BRL":
      return "R$";
    case "ZAR":
      return "R";
    case "HKD":
      return "HK$";
    case "NZD":
      return "NZ$";
    case "SEK":
    case "NOK":
      return "kr";
    case "SGD":
      return "S$";
    case "MXN":
      return "Mex$";
    case "TRY":
      return "₺";
    default:
      return currency;
  }
}

export function monthNumberToName(monthNum: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // monthNum should be 1–12
  return months[monthNum - 1] || "Invalid month";
}

export function weekDayNumberToName(dayNum: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // dayNum should be 0–6
  return days[dayNum] || "Invalid day";
}

export function getSpectatorStatus(spectatorStatus: number): SpectatorStatus {
  return {
    spectator: spectatorStatus % 10 === 1,
    temporarySpectator: Math.floor(spectatorStatus / 10) % 10 === 1,
    pureSpectator: Math.floor(spectatorStatus / 100) % 10 === 1,
    autoTarget: Math.floor(spectatorStatus / 1000) % 10 === 1,
    currentTargetId: Math.floor(spectatorStatus / 10000),
  };
}

export function rankPlayers(
  players: Player[],
  ta?: boolean,
): (Player & { position: number })[] {
  return [...players]
    .sort((a, b) => {
      const racetimeA = ta ? a.bestracetime : a.prevracetime;
      const racetimeB = ta ? b.bestracetime : b.prevracetime;

      if (racetimeA === -1 && racetimeB === -1) return 0; // order doesn't matter
      if (racetimeA === -1) return 1; // a goes last
      if (racetimeB === -1) return -1; // b goes last

      // 1️⃣ Compare total prevracetime
      if (racetimeA !== racetimeB) return racetimeA - racetimeB;

      // 2️⃣ Tie-break: compare checkpoints from last to first (excluding first checkpoint if needed)
      const cpA = ta ? a.bestracecheckpoints : a.prevracecheckpoints;
      const cpB = ta ? b.bestracecheckpoints : b.prevracecheckpoints;
      const len = Math.min(cpA.length, cpB.length);

      for (let i = len - 1; i >= 0; i--) {
        if (cpA[i] !== cpB[i]) return cpA[i] - cpB[i];
      }

      // 3️⃣ Fully equal
      return 0;
    })
    .map((player, index) => ({
      ...player,
      position: index + 1,
    }));
}
