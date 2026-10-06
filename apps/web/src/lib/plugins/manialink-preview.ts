import {
  matchingAppearanceAttributes,
  type ManialinkElement,
  type ManialinkPageSnapshot,
  type PluginAppearance,
} from "@gcp/shared";

export function plainManialinkText(text: string): string {
  return text
    .replace(/\$\$/g, "\u0000")
    .replace(/\$[lhp](?:\[[^\]]*\])?/gi, "")
    .replace(/\$[\da-f]{3}/gi, "")
    .replace(/\$[a-z<>]/gi, "")
    .replace(/\u0000/g, "$");
}
export const elementLabel = (element: ManialinkElement) => {
  const text = plainManialinkText(element.attributes.text ?? "").trim();
  return text
    ? text.slice(0, 60)
    : element.attributes.id ||
        (element.attributes.hasImage
          ? "Image"
          : element.tag === "quad"
            ? "Background"
            : element.tag === "frame"
              ? "Group"
              : element.tag);
};
export function elementTarget(
  page: ManialinkPageSnapshot,
  element: ManialinkElement,
): Omit<PluginAppearance["rules"][number], "attributes"> {
  const id = element.attributes.id ?? "";
  const unique =
    id.length > 0 &&
    page.elements.filter((e) => e.attributes.id === id).length === 1;
  return {
    page: page.page,
    element: element.tag as PluginAppearance["rules"][number]["element"],
    id: unique ? id : "",
    className: "",
    ...(unique ? {} : { path: element.path }),
  };
}
export function updateElementAppearance(
  appearance: PluginAppearance,
  page: ManialinkPageSnapshot,
  element: ManialinkElement,
  attribute: string,
  value: string | undefined,
): PluginAppearance {
  const target = elementTarget(page, element);
  const rules = appearance.rules.map((r) => ({
    ...r,
    attributes: { ...r.attributes },
  }));
  const isTarget = (r: PluginAppearance["rules"][number]) =>
    r.page === target.page &&
    r.element === target.element &&
    r.id === target.id &&
    r.className === "" &&
    r.path === target.path;
  // Consolidate this target at the end so editing a control always wins over broad rules.
  const attributes = Object.assign(
    {},
    ...rules.filter(isTarget).map((r) => r.attributes),
  );
  if (value === undefined) delete attributes[attribute];
  else attributes[attribute] = value;
  const rest = rules.filter((r) => !isTarget(r));
  return {
    rules: Object.keys(attributes).length
      ? [...rest, { ...target, attributes }]
      : rest,
  };
}

type Matrix = [number, number, number, number, number, number];
const identity: Matrix = [1, 0, 0, 1, 0, 0];
const number = (raw: string | undefined, fallback: number) =>
  raw !== undefined && raw.trim() !== "" && Number.isFinite(Number(raw))
    ? Math.max(-10000, Math.min(10000, Number(raw)))
    : fallback;
const pair = (
  raw: string | undefined,
  fallback: [number, number],
): [number, number] => {
  const parts = raw?.trim().split(/\s+/);
  return parts?.length === 2
    ? [number(parts[0], fallback[0]), number(parts[1], fallback[1])]
    : fallback;
};
function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
export interface PreviewElement {
  element: ManialinkElement;
  attributes: Record<string, string>;
  matrix: Matrix;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  // Text sits inside the label box according to valign, like in the game
  textY: number;
  textBaseline: "hanging" | "central" | "text-after-edge";
  z: number;
  hidden: boolean;
  opacity: number;
}
export function layoutManialink(
  page: ManialinkPageSnapshot,
  appearance: PluginAppearance,
): PreviewElement[] {
  const parents = new Map<string, PreviewElement>();
  return page.elements
    .map((element) => {
      const attributes = {
        ...element.attributes,
        ...matchingAppearanceAttributes(page.page, element, appearance),
      };
      const parent = element.parentPath
        ? parents.get(element.parentPath)
        : undefined;
      const [px, py] = pair(attributes.pos, [0, 0]);
      const scale = Math.max(0, number(attributes.scale, 1));
      const angle = (-number(attributes.rot, 0) * Math.PI) / 180;
      const matrix = multiply(parent?.matrix ?? identity, [
        Math.cos(angle) * scale,
        Math.sin(angle) * scale,
        -Math.sin(angle) * scale,
        Math.cos(angle) * scale,
        px,
        -py,
      ]);
      const text = plainManialinkText(
        attributes.text ?? (element.tag === "entry" ? "Text input" : ""),
      );
      const fontSize = Math.max(
        0.1,
        number(attributes.textsize, 1) * 2.4 * number(attributes.textscale, 1),
      );
      const isGroup =
        element.tag === "frame" || element.tag === "frameinstance";
      const [width, height] = pair(
        attributes.size,
        isGroup
          ? [0, 0]
          : element.tag === "label"
            ? [
                Math.max(fontSize, text.length * fontSize * 0.55),
                fontSize * 1.3,
              ]
            : [10, 10],
      );
      const x =
        attributes.halign === "center"
          ? -width / 2
          : attributes.halign === "right"
            ? -width
            : 0;
      const y = ["center", "center2"].includes(attributes.valign)
        ? -height / 2
        : attributes.valign === "bottom"
          ? -height
          : 0;
      const vertical = ["center", "center2"].includes(attributes.valign)
        ? "center"
        : attributes.valign === "bottom"
          ? "bottom"
          : "top";
      const node: PreviewElement = {
        element,
        attributes,
        matrix,
        text,
        fontSize,
        textY:
          vertical === "center"
            ? y + height / 2
            : vertical === "bottom"
              ? y + height
              : y,
        textBaseline:
          vertical === "center"
            ? "central"
            : vertical === "bottom"
              ? "text-after-edge"
              : "hanging",
        x,
        y,
        width: Math.max(0, width),
        height: Math.max(0, height),
        z: (parent?.z ?? 0) + number(attributes["z-index"], 0),
        // Standard SDK widgets are revealed by their startup script.
        hidden:
          (parent?.hidden ?? false) ||
          (attributes.hidden === "1" &&
            !(
              element.tag === "frame" &&
              attributes.id === "widget" &&
              !Object.hasOwn(
                matchingAppearanceAttributes(page.page, element, appearance),
                "hidden",
              )
            )),
        opacity:
          (parent?.opacity ?? 1) *
          Math.max(0, Math.min(1, number(attributes.opacity, 1))),
      };
      parents.set(element.path, node);
      return node;
    })
    .sort((a, b) => a.z - b.z);
}
export function previewViewBox(nodes: PreviewElement[]): string {
  if (nodes.length === 0) return "-160 -90 320 180";
  const points = nodes.flatMap((n) =>
    [
      [n.x, n.y],
      [n.x + n.width, n.y],
      [n.x, n.y + n.height],
      [n.x + n.width, n.y + n.height],
    ].map(([x, y]) => [
      n.matrix[0] * x + n.matrix[2] * y + n.matrix[4],
      n.matrix[1] * x + n.matrix[3] * y + n.matrix[5],
    ]),
  );
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    width = Math.max(20, Math.max(...xs) - minX),
    height = Math.max(12, Math.max(...ys) - minY);
  return `${minX - 4} ${minY - 4} ${width + 8} ${height + 8}`;
}
