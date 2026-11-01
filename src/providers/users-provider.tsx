"use client";

import { tables } from "@/lib/server-manager";
import { UserV1 } from "@/lib/server-manager/types";
import { createContext, useContext, useMemo } from "react";
import { useTable } from "spacetimedb/react";

const UsersContext = createContext<ReadonlyMap<number, UserV1>>(new Map());

// The user table is global, so it is subscribed to once for the whole session.
export default function UsersProvider({ children }: { children: React.ReactNode }) {
  const [rows] = useTable(tables.tabUser);
  const users = useMemo(() => new Map(rows.map((u) => [u.id, u])), [rows]);

  return <UsersContext.Provider value={users}>{children}</UsersContext.Provider>;
}

export const useUsers = () => useContext(UsersContext);
