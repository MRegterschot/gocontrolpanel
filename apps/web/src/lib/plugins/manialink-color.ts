// Manialink hex colors (3, 4, 6 or 8 digits, no #) as CSS colors
export function manialinkColor(
  value: string | undefined,
  fallback = "#ffffff",
): string {
  if (!value) return fallback;
  const hex = value.replace(/^#/, "");
  if (!/^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) return fallback;
  return `#${hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex}`;
}
