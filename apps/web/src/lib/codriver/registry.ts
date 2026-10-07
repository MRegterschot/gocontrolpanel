import "server-only";
import { infoTools } from "./tools/info";
import { mapTools } from "./tools/maps";
import { modeTools } from "./tools/mode";
import type { CodriverTool } from "./types";

export const codriverTools: CodriverTool[] = [
  ...infoTools,
  ...mapTools,
  ...modeTools,
];
