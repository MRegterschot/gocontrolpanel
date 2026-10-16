import { hasRole, type CodriverRole, type CodriverTool } from "./types";

export interface AccessLevel {
  level: "read" | "partial" | "full";
  // Tools the role may use, how many of them change something, and every tool there is
  tools: number;
  changing: number;
  total: number;
}

// What a role may do through Codriver: read-only tools only, some changing tools, or all of them
export function accessLevel(
  role: CodriverRole,
  tools: Pick<CodriverTool, "minRole" | "readOnly">[],
): AccessLevel {
  const usable = tools.filter((tool) => hasRole(role, tool.minRole));
  const changing = usable.filter((tool) => !tool.readOnly).length;
  return {
    level:
      changing === 0
        ? "read"
        : usable.length === tools.length
          ? "full"
          : "partial",
    tools: usable.length,
    changing,
    total: tools.length,
  };
}
