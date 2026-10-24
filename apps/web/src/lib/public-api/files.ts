import type { FileEntry } from "@/types/filemanager";
import type { ApiFileEntry } from "@gcp/shared/public-api";
import "server-only";

// The API speaks paths relative to UserData; the file manager wants them absolute
export function userDataPath(path: string): string {
  return path ? `/UserData/${path}` : "/UserData";
}

// Listings give /UserData/..., created entries UserData/...
function relative(path: string): string {
  return path.replace(/^\/?UserData(\/|$)/, "");
}

export function toApiFileEntry(entry: FileEntry): ApiFileEntry {
  return {
    name: entry.name,
    path: relative(entry.path),
    isDir: entry.isDir,
    size: entry.size ?? null,
    lastModified: entry.lastModified
      ? new Date(entry.lastModified).toISOString()
      : null,
  };
}

// utf8 when the bytes are text, base64 for anything else
export function encodeFile(bytes: Buffer): {
  encoding: "utf8" | "base64";
  content: string;
} {
  if (!bytes.includes(0)) {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { encoding: "utf8", content: text };
    } catch {
      // Not valid UTF-8
    }
  }
  return { encoding: "base64", content: bytes.toString("base64") };
}
