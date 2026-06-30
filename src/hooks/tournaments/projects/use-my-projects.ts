"use client";

import { tables } from "@/lib/server-manager";
import { useTable } from "spacetimedb/react";

export function useMyProjects() {
  const [tournaments, isReady] = useTable(tables.my_projects);

  return { tournaments, isReady };
}
