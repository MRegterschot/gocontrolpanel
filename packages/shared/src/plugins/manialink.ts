import { MANIALINK_STYLE_ELEMENTS, type PluginAppearance } from "./appearance";

export interface ManialinkElement {
  path: string;
  parentPath: string | null;
  tag: string;
  attributes: Record<string, string>;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function decodeAttribute(value: string): string {
  return value.replace(
    /&(?:quot|apos|lt|gt|amp|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      const named: Record<string, string> = {
        "&quot;": '"',
        "&apos;": "'",
        "&lt;": "<",
        "&gt;": ">",
        "&amp;": "&",
      };
      if (named[entity]) return named[entity];
      const code = entity.startsWith("&#x")
        ? parseInt(entity.slice(3, -1), 16)
        : Number(entity.slice(2, -1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : entity;
    },
  );
}

function parseTag(tag: string) {
  const start = /^<([a-zA-Z][\w:-]*)\b/.exec(tag);
  if (!start) return null;
  const pattern = /\s+([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/y;
  const matches: RegExpExecArray[] = [];
  const attributes: Record<string, string> = Object.create(null);
  let offset = start[0].length;
  while (offset < tag.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(tag);
    if (!match) break;
    matches.push(match);
    attributes[match[1]] = decodeAttribute(match[2].slice(1, -1));
    offset = pattern.lastIndex;
  }
  if (!/^\s*\/?>$/.test(tag.slice(offset))) return null;
  return { name: start[1], attributes, matches, offset, start: start[0] };
}

// Linear lexical scanning, preserving scripts, comments and CDATA verbatim. Paths count
// XML elements, excluding script blocks; the inspector and runtime use exactly the same walk.
function mapTags(
  xml: string,
  visit: (tag: string, path: string, parentPath: string | null) => string,
): string {
  let cursor = 0;
  let rootCount = 0;
  const stack: { name: string; path: string; children: number }[] = [];
  const chunks: string[] = [];
  while (cursor < xml.length) {
    const opening = xml.indexOf("<", cursor);
    if (opening < 0) {
      chunks.push(xml.slice(cursor));
      break;
    }
    chunks.push(xml.slice(cursor, opening));
    let end: number;
    const delimiter = xml.startsWith("<!--", opening)
      ? "-->"
      : xml.startsWith("<![CDATA[", opening)
        ? "]]>"
        : null;
    if (delimiter) {
      const closing = xml.indexOf(
        delimiter,
        opening + (delimiter === "-->" ? 4 : 9),
      );
      end = closing < 0 ? xml.length : closing + delimiter.length;
      chunks.push(xml.slice(opening, end));
    } else {
      let quote = "";
      end = opening + 1;
      for (; end < xml.length; end++) {
        const c = xml[end];
        if (quote) {
          if (c === quote) quote = "";
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">") {
          end++;
          break;
        }
      }
      const tag = xml.slice(opening, end);
      if (/^<script\b/i.test(tag)) {
        if (!/\/\s*>$/.test(tag)) {
          const closing = /<\/script\s*>/gi;
          closing.lastIndex = end;
          const match = closing.exec(xml);
          end = match ? closing.lastIndex : xml.length;
        }
        chunks.push(xml.slice(opening, end));
      } else {
        const closing = /^<\/([\w:-]+)/.exec(tag);
        const name = /^<([a-zA-Z][\w:-]*)\b/.exec(tag)?.[1];
        if (closing) {
          if (stack.at(-1)?.name === closing[1]) stack.pop();
          chunks.push(tag);
        } else if (name) {
          const parent = stack.at(-1);
          const path = parent
            ? `${parent.path}.${parent.children++}`
            : String(rootCount++);
          chunks.push(visit(tag, path, parent?.path ?? null));
          if (!/\/\s*>$/.test(tag)) stack.push({ name, path, children: 0 });
        } else chunks.push(tag);
      }
    }
    cursor = end;
  }
  return chunks.join("");
}

export function matchingAppearanceAttributes(
  page: string,
  element: ManialinkElement,
  appearance: PluginAppearance,
): Record<string, string> {
  const overrides: Record<string, string> = Object.create(null);
  for (const rule of appearance.rules) {
    if (rule.page && rule.page !== page && `${rule.page}-update` !== page)
      continue;
    if (rule.element !== "*" && rule.element !== element.tag) continue;
    if (rule.id && rule.id !== element.attributes.id) continue;
    if (
      rule.className &&
      !(element.attributes.class ?? "").split(/\s+/).includes(rule.className)
    )
      continue;
    Object.assign(overrides, rule.attributes);
  }
  return overrides;
}

export function applyManialinkAppearance(
  xml: string,
  page: string,
  appearance: PluginAppearance,
): string {
  if (
    !appearance.rules.some(
      (rule) =>
        !rule.page || rule.page === page || `${rule.page}-update` === page,
    )
  )
    return xml;
  return mapTags(xml, (tag, path, parentPath) => {
    const parsed = parseTag(tag);
    if (
      !parsed ||
      !(MANIALINK_STYLE_ELEMENTS as readonly string[]).includes(parsed.name)
    )
      return tag;
    const overrides = matchingAppearanceAttributes(
      page,
      { path, parentPath, tag: parsed.name, attributes: parsed.attributes },
      appearance,
    );
    if (Object.keys(overrides).length === 0) return tag;
    let stripped = parsed.start;
    for (const match of parsed.matches)
      if (!Object.hasOwn(overrides, match[1])) stripped += match[0];
    stripped += tag.slice(parsed.offset);
    const attributes = Object.entries(overrides)
      .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
      .join("");
    return stripped.replace(
      /\s*(\/?>)$/,
      (_, close: string) => attributes + close,
    );
  });
}
