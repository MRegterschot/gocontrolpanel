// Trackmania formatting: $ followed by a colour (1-3 hex digits), a style letter or a link
const formatting = /\$(?:[0-9a-f]{1,3}|[lh]\[[^\]]*\]|[wnoitsgzmlhp<>])/gi;

export function stripFormatting(text: string): string {
  return text
    .replace(/\$\$/g, "\u0000")
    .replace(formatting, "")
    .replace(/\u0000/g, "$");
}

// For chat replies: no formatting injected by map or player names, bounded length
export function chatSafe(text: string, max = 200): string {
  const plain = stripFormatting(text)
    .replace(/\$/g, "$$$$")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

export function normalize(text: string): string {
  return stripFormatting(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type FuzzyResult<T> =
  | { kind: "match"; item: T }
  | { kind: "ambiguous"; items: T[] }
  | { kind: "none" };

function score(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (candidate === query) return 1;
  if (candidate.startsWith(query)) return 0.9;
  const words = query.split(" ");
  const candidateWords = candidate.split(" ");
  const matched = words.filter((word) =>
    candidateWords.some((cw) => cw.startsWith(word)),
  ).length;
  if (matched === words.length) return 0.8;
  if (candidate.includes(query)) return 0.7;
  return (0.6 * matched) / words.length;
}

// Picks one item when it clearly matches best; otherwise returns up to 5 candidates
export function fuzzyFind<T>(
  query: string,
  items: T[],
  label: (item: T) => string,
): FuzzyResult<T> {
  const q = normalize(query);
  const scored = items
    .map((item) => ({ item, score: score(q, normalize(label(item))) }))
    .filter((entry) => entry.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { kind: "none" };
  const [best, second] = scored;
  if (!second || best.score === 1 || best.score - second.score >= 0.15) {
    return { kind: "match", item: best.item };
  }
  return {
    kind: "ambiguous",
    items: scored
      .filter((entry) => best.score - entry.score < 0.15)
      .slice(0, 5)
      .map((entry) => entry.item),
  };
}
