// Semantic versions (MAJOR.MINOR.PATCH with an optional pre-release) for plugin packages

const CORE_VERSION = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/;
const PRERELEASE_IDENTIFIER = /^[0-9A-Za-z-]+$/;
const NUMERIC_IDENTIFIER = /^\d+$/;

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

export function parseVersion(version: string): ParsedVersion | null {
  if (version.length > 64) return null;
  const separator = version.indexOf("-");
  const core = separator === -1 ? version : version.slice(0, separator);
  const prerelease =
    separator === -1 ? [] : version.slice(separator + 1).split(".");
  const match = CORE_VERSION.exec(core);
  if (
    !match ||
    prerelease.some(
      (identifier) =>
        !PRERELEASE_IDENTIFIER.test(identifier) ||
        (NUMERIC_IDENTIFIER.test(identifier) &&
          identifier.length > 1 &&
          identifier.startsWith("0")),
    )
  )
    return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
  };
}

export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}

function compareIdentifiers(a: string, b: string): number {
  const aNum = /^\d+$/.test(a);
  const bNum = /^\d+$/.test(b);
  if (aNum && bNum) return Number(a) - Number(b);
  if (aNum) return -1;
  if (bNum) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// Negative when a < b, positive when a > b. Invalid versions sort first.
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return pa ? 1 : pb ? -1 : 0;

  for (const key of ["major", "minor", "patch"] as const) {
    if (pa[key] !== pb[key]) return pa[key] - pb[key];
  }

  // A pre-release sorts before the release it precedes
  if (pa.prerelease.length === 0 || pb.prerelease.length === 0) {
    return pb.prerelease.length - pa.prerelease.length;
  }
  for (
    let i = 0;
    i < Math.max(pa.prerelease.length, pb.prerelease.length);
    i++
  ) {
    if (pa.prerelease[i] === undefined) return -1;
    if (pb.prerelease[i] === undefined) return 1;
    const diff = compareIdentifiers(pa.prerelease[i], pb.prerelease[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isPrerelease(version: string): boolean {
  return (parseVersion(version)?.prerelease.length ?? 0) > 0;
}
