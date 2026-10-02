import { DndListColumn } from "./dnd-list";
import DndListHeader from "./dnd-list-header";

interface DndListHeadersProps<TData extends { id: string | number }> {
  columns: DndListColumn<TData>[];
}

export default function DndListHeaders<TData extends { id: string | number }>({
  columns,
}: DndListHeadersProps<TData>) {
  return (
    <div className="flex items-center p-2 gap-1 border rounded-xl">
      {columns
        .filter((c) => c.visibility !== false)
        .map((column) => (
          <DndListHeader column={column} key={column.id} />
        ))}
    </div>
  );
}
