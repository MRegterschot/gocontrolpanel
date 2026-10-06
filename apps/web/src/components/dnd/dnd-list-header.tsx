import { cn, toReadableTitle } from "@/lib/utils";
import { DndListColumn } from "./dnd-list";

interface DndListHeaderProps<TData extends { id: string | number }> {
  column: DndListColumn<TData>;
  title?: string;
}

export default function DndListHeader<TData extends { id: string | number }>({
  column,
  title,
}: DndListHeaderProps<TData>) {
  return (
    <div
      key={column.id}
      className={cn(
        "text-sm font-medium text-muted-foreground min-h-full min-w-0 flex items-center",
        column.id !== "actions" ? "flex-1" : "flex-shrink-0 w-[32px]",
      )}
    >
      {column.id !== "actions" && toReadableTitle(title ?? column.id)}
    </div>
  );
}
