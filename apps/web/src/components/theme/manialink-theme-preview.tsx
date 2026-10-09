import type { ManialinkTheme } from "@gcp/shared";
import Flag from "react-world-flags";

const css = (hex: string) => `#${hex}`;
// One manialink unit in pixels
const u = (units: number) => `${units * 5}px`;
const rows = [
  ["1", "Marijntje04", "12", "NL"],
  ["2", "Speedy", "9", "BE"],
  ["3", "Wirtual", "7", "NL"],
  ["4", "Scrapie", "4", "FR"],
];

// Mirrors the layout of the Live Ranking plugin widget
export default function ManialinkThemePreview({
  theme,
}: {
  theme: ManialinkTheme;
}) {
  return (
    <div
      aria-label="Theme preview"
      role="img"
      className="flex items-center justify-center overflow-hidden rounded-md bg-[linear-gradient(135deg,#4b6b8a,#1d2b3a)] p-6"
    >
      <div className="flex flex-col" style={{ width: u(55), gap: u(0.25) }}>
        <div
          className="flex items-center justify-center text-xs font-semibold text-white"
          style={{ height: u(5), backgroundColor: css(theme.quad.background) }}
        >
          Live Ranking
        </div>
        {rows.map(([rank, name, points, country]) => (
          <div key={rank} className="flex" style={{ height: u(5) }}>
            <div
              className="flex shrink-0 items-center justify-center text-xs font-semibold"
              style={{
                width: u(5),
                backgroundColor: css(theme.quad.background),
                color: css(theme.label.foreground),
              }}
            >
              {rank}
            </div>
            <div
              className="flex flex-1 items-center text-xs"
              style={{
                backgroundColor: css(theme.quad.foreground),
                color: css(theme.label.background),
                paddingLeft: u(1.25),
                paddingRight: u(2),
              }}
            >
              <Flag
                code={country}
                className="shrink-0 object-cover"
                style={{ width: u(4.5), height: u(3) }}
              />
              <span className="ml-3 flex-1 truncate">{name}</span>
              <span className="font-semibold">{points}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
