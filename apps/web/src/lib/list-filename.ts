import { ServerError } from "@/types/responses";

// Dedicated-server list operations accept relative .txt/.xml files, never absolute/traversing paths.
export function validateListFilename(value: string): string {
  if (
    typeof value !== "string" ||
    value.length > 255 ||
    !/^[\w .\/-]+\.(txt|xml)$/i.test(value) ||
    value.startsWith("/") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new ServerError(
      "Use a relative .txt or .xml filename without dot segments",
      "ValidationError",
    );
  }
  return value;
}
