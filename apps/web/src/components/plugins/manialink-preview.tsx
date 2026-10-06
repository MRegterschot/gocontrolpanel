"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { manialinkColor } from "@/lib/plugins/manialink-color";
import {
  elementLabel,
  layoutManialink,
  previewViewBox,
} from "@/lib/plugins/manialink-preview";
import type { ManialinkPageSnapshot, PluginAppearance } from "@gcp/shared";
import { useId, useMemo, useState } from "react";

export function ManialinkPreview({
  page,
  appearance,
  selected,
  onSelect,
}: {
  page: ManialinkPageSnapshot;
  appearance: PluginAppearance;
  selected: string;
  onSelect: (path: string) => void;
}) {
  const [fit, setFit] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const unique = useId().replace(/:/g, "");
  const nodes = useMemo(
    () => layoutManialink(page, appearance),
    [page, appearance],
  );
  const visible = nodes.filter((n) => !n.hidden || showHidden);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Preview</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={showHidden}
              onCheckedChange={(value) => setShowHidden(value === true)}
            />
            Show hidden
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setFit(!fit)}
          >
            {fit ? "Full screen" : "Fit to content"}
          </Button>
        </div>
      </div>
      <svg
        aria-label="Manialink appearance preview"
        role="group"
        viewBox={fit ? previewViewBox(visible) : "-160 -90 320 180"}
        className="h-80 w-full rounded-lg border bg-slate-950 lg:h-[420px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id={`${unique}-grid`}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#334155"
              strokeWidth="0.12"
            />
          </pattern>
        </defs>
        <rect
          x="-100000"
          y="-100000"
          width="200000"
          height="200000"
          fill={`url(#${unique}-grid)`}
        />
        {visible.map((node) => {
          const { element, attributes: a, x, y, width, height } = node;
          const active = selected === element.path;
          const group =
            element.tag === "frame" || element.tag === "frameinstance";
          const label = element.tag === "label" || element.tag === "entry";
          const clipId = `${unique}-${element.path.replace(/\./g, "-")}`;
          return (
            <g
              key={element.path}
              transform={`matrix(${node.matrix.join(" ")})`}
              opacity={node.opacity * (node.hidden ? 0.3 : 1)}
              role="button"
              tabIndex={0}
              aria-label={`Select ${elementLabel(element)}`}
              aria-pressed={active}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(element.path);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(element.path);
                }
              }}
              className="cursor-pointer outline-none focus:drop-shadow-[0_0_2px_#38bdf8]"
            >
              <title>{elementLabel(element)}</title>
              <defs>
                <clipPath id={clipId}>
                  <rect x={x} y={y} width={width} height={height} />
                </clipPath>
              </defs>
              <rect
                x={x}
                y={y}
                width={Math.max(width, group ? 2 : 0)}
                height={Math.max(height, group ? 2 : 0)}
                fill={
                  group || label
                    ? "transparent"
                    : manialinkColor(
                        a.bgcolor,
                        a.style || a.hasImage ? "#475569" : "#64748b",
                      )
                }
                stroke={active ? "#38bdf8" : group ? "#64748b" : "none"}
                strokeWidth={active ? 0.55 : 0.2}
                strokeDasharray={group && !active ? "1 1" : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {label && (
                <text
                  clipPath={`url(#${clipId})`}
                  x={
                    a.halign === "center"
                      ? x + width / 2
                      : a.halign === "right"
                        ? x + width
                        : x
                  }
                  y={node.textY}
                  dominantBaseline={node.textBaseline}
                  fill={manialinkColor(a.textcolor ?? a.color)}
                  fontSize={node.fontSize}
                  fontFamily={
                    /mono/i.test(a.textfont ?? "") ? "monospace" : "sans-serif"
                  }
                  fontWeight={/bold/i.test(a.textfont ?? "") ? 700 : 400}
                  textAnchor={
                    a.halign === "center"
                      ? "middle"
                      : a.halign === "right"
                        ? "end"
                        : "start"
                  }
                >
                  {node.text}
                </text>
              )}
              {a.hasImage && (
                <text
                  x={x + width / 2}
                  y={y + height / 2}
                  fontSize={Math.min(2, height / 2)}
                  fill="#cbd5e1"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  Image
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground">
        Click an element to edit it. Approximate preview: game fonts, skins,
        images and animations may differ. Changes reach players only after
        saving.
      </p>
    </div>
  );
}
