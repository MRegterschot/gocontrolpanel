import { Card } from "../ui/card";
import { DndListColumn } from "./dnd-list";
import DndListHeader from "./dnd-list-header";

interface DndListHeadersProps<TData extends { id: string | number }> {
  columns: DndListColumn<TData>[];
}

export default function DndListHeaders<TData extends { id: string | number }>({
  columns,
}: DndListHeadersProps<TData>) {
  return (
    <Card className="flex flex-row items-center p-2 gap-1">
      {columns
        .filter((c) => c.visibility !== false)
        .map((column) => (
          <DndListHeader column={column} key={column.id} />
        ))}
    </Card>
  );
}
