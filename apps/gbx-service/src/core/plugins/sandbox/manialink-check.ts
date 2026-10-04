// Pages rendered by a sandboxed plugin are sent to every player, so they may only contain the
// plugin's own manialink: one <manialink> element whose id is the namespaced page id. Without
// this a plugin could replace another plugin's widgets on the players' clients.
export function checkManialink(xml: unknown, expectedId: string, maxBytes: number): string | null {
  if (typeof xml !== "string") return "A page must be a string";
  if (Buffer.byteLength(xml, "utf8") > maxBytes) {
    return `A page may be at most ${Math.round(maxBytes / 1024)} KB`;
  }

  const lower = xml.toLowerCase();
  if (lower.includes("<manialinks") || lower.includes("</manialinks")) {
    return "A page may not contain <manialinks>";
  }
  if (count(lower, "<manialink") !== 1 || count(lower, "</manialink") !== 1) {
    return "A page must contain exactly one <manialink> element";
  }

  const match = /<manialink\b[^>]*?\sid="([^"]*)"/i.exec(xml);
  if (!match || match[1] !== expectedId) {
    return `The manialink id must be "${expectedId}"`;
  }
  return null;
}

function count(text: string, needle: string): number {
  let total = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    total++;
    index = text.indexOf(needle, index + needle.length);
  }
  return total;
}
