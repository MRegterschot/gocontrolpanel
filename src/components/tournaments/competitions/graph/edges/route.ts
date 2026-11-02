import { XYPosition } from "@xyflow/react";

const towards = (from: XYPosition, to: XYPosition, distance: number) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: from.x + ((to.x - from.x) / length) * distance, y: from.y + ((to.y - from.y) / length) * distance };
};

// An orthogonal route with rounded corners.
export function roundedPath(points: XYPosition[], radius = 10) {
  return points.map((point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const next = points[i + 1];
    if (!next) return `L ${point.x} ${point.y}`;

    const r = Math.min(radius, Math.hypot(point.x - prev.x, point.y - prev.y) / 2, Math.hypot(next.x - point.x, next.y - point.y) / 2);
    const a = towards(point, prev, r);
    const b = towards(point, next, r);
    return `L ${a.x} ${a.y} Q ${point.x} ${point.y} ${b.x} ${b.y}`;
  }).join(" ");
}

// The point halfway along the route, where the settings button goes.
export function midpoint(points: XYPosition[]): XYPosition {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let left = lengths.reduce((sum, l) => sum + l, 0) / 2;
  for (const [i, length] of lengths.entries()) {
    if (left <= length) return towards(points[i], points[i + 1], left);
    left -= length;
  }
  return points[0];
}

// A route is only valid while both nodes are where the layout put them, positions are stored as f32.
export const samePlace = (a: XYPosition, b: XYPosition) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
