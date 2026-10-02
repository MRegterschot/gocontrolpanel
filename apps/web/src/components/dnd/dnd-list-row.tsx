import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createElement } from "react";
import { Card } from "../ui/card";
import { DndListColumn } from "./dnd-list";

interface DndListRowProps<TData> {
  id: string | number;
  row: TData;
  columns: DndListColumn<TData>[];
  serverId?: string;
}

export default function DndListRow<TData>({
  id,
  row,
  columns,
  serverId,
}: DndListRowProps<TData>) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCursorGrabbing = attributes["aria-pressed"];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      key={id}
      className="flex flex-row items-center p-2 gap-1 bg-background"
    >
      {columns.map((column) => (
        <div
          key={column.id}
          className={cn(
            "text-sm overflow-hidden overflow-ellipsis min-h-full flex items-center",
            column.id !== "actions"
              ? `${isCursorGrabbing ? "cursor-grabbing" : "cursor-grab"} flex-1`
              : "flex-shrink-0 w-auto",
          )}
          {...(column.id !== "actions" ? attributes : {})}
          {...(column.id !== "actions" ? listeners : {})}
          aria-describedby=""
        >
          {column.cell ? (
            createElement(column.cell, { data: row, serverId })
          ) : (
            <span className="truncate text-sm">
              {row[column.id as keyof TData] as string}
            </span>
          )}
        </div>
      ))}
    </Card>
  );
}
