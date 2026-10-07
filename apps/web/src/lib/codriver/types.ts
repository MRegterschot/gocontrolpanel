import type { Actor } from "@/lib/actor";
import type { z } from "zod/v4";

export type CodriverRole = "guest" | "member" | "moderator" | "admin";

export const roleRank: Record<CodriverRole, number> = {
  guest: 0,
  member: 1,
  moderator: 2,
  admin: 3,
};

export function hasRole(role: CodriverRole, minimum: CodriverRole): boolean {
  return roleRank[role] >= roleRank[minimum];
}

// Keyword routing sends the model only the categories a request touches
export type ToolCategory = "info" | "maps" | "mode";

export interface ToolContext {
  serverId: string;
  actor: Actor;
  // The caller's role on this server
  role: CodriverRole;
}

export interface ToolResult {
  // Shown to the caller; templated, never model-written
  reply: string;
}

export interface CodriverTool<S extends z.ZodType = z.ZodType> {
  name: string;
  // One line; sent to the model
  description: string;
  category: ToolCategory;
  minRole: CodriverRole;
  input: S;
  // Disruptive calls are shown to the caller first and run after they confirm
  confirm?: (
    ctx: ToolContext,
    input: z.output<S>,
  ) => Promise<string | null> | string | null;
  run(ctx: ToolContext, input: z.output<S>): Promise<ToolResult>;
}

// Keeps the input type of each tool while storing them in one list
export function defineTool<S extends z.ZodType>(
  tool: CodriverTool<S>,
): CodriverTool {
  return tool as unknown as CodriverTool;
}

// A validated tool call, ready to run
export interface PlannedCall {
  tool: string;
  input: unknown;
}

// An error whose message is safe to show the caller
export class CodriverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodriverError";
  }
}
