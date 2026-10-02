import { SortingState } from "@tanstack/react-table";
import { useState } from "react";

interface SortingHook {
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  field: string;
  order: "asc" | "desc";
}

export const useSorting = (
  initialField: string = "createdAt",
  initialOrder: "asc" | "desc" = "desc",
): SortingHook => {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: initialField,
      desc: initialOrder === "desc",
    },
  ]);

  return {
    sorting,
    setSorting,
    field: sorting[0]?.id || "createdAt",
    order: sorting[0]?.desc ? "desc" : "asc",
  };
};
