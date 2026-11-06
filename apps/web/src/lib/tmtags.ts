// Trackmania formatting ($o, $f00, $l[...]) to HTML. Player-controlled text ends up here, so unlike
// the tmtags package every text token is escaped and links are limited to http(s).

export { stripTmTags } from "tmtags";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Returns the escaped URL, or null when it is not a plain http(s) link
export function safeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return escapeHtml(url.href);
}

const STYLES: Record<string, string> = {
  $o: "<span style='font-weight: bold'>",
  $i: "<span style='font-style: italic'>",
  $w: "<span style='font-stretch: expanded'>",
  $n: "<span style='font-stretch: condensed'>",
  $m: "<span style='font-stretch: normal'>",
  $t: "<span style='text-transform: uppercase'>",
  $s: "<span style='text-shadow: 1px 1px 1px #000'>",
  $g: "<span class='text-foreground'>",
  $z: "<span class='text-foreground' style='font-weight: normal; font-style: normal; font-stretch: normal; text-transform: none; text-shadow: none'>",
};

export function parseTmTags(input: string | null | undefined): string {
  const str = String(input ?? "");
  const tokens = str.split(
    /(\$[<>]|\$[0-9a-f]{1,3}|\$[oiwnmtsgz]|\$l\[.*?\])/gi,
  );
  const stack: { tag: string; level: number }[] = [];
  let level = 0;
  let result = "";

  const open = (openTag: string, closeTag: string) => {
    result += openTag;
    stack.push({ tag: closeTag, level });
  };

  for (const token of tokens) {
    if (!token) continue;
    const lower = token.toLowerCase();

    if (lower === "$<") {
      level++;
      open("<span>", "</span>");
    } else if (lower === "$>") {
      if (level > 0) {
        while (stack.length && stack[stack.length - 1].level === level) {
          result += stack.pop()!.tag;
        }
        level--;
      }
    } else if (STYLES[lower]) {
      open(STYLES[lower], "</span>");
    } else if (/^\$[0-9a-f]{1,3}$/i.test(token)) {
      const color = token.slice(1).padEnd(3, "0");
      open(`<span style='color: #${color}'>`, "</span>");
    } else if (lower.startsWith("$l[")) {
      const href = safeLinkUrl(token.slice(3, -1));
      if (href) {
        open(
          `<a href='${href}' target='_blank' rel='noopener noreferrer'>`,
          "</a>",
        );
      } else {
        open("<span>", "</span>");
      }
    } else {
      result += escapeHtml(token);
    }
  }

  stack.sort((a, b) => b.level - a.level);
  while (stack.length) result += stack.pop()!.tag;
  return result;
}
