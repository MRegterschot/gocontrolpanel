"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SetStateAction } from "react";
import DndListRow from "./dnd-list-row";

export interface DndListColumn<TData> {
  id: string;
  cell?: React.ComponentType<{ data: TData; serverId?: string }>;
  visibility?: boolean;
}

interface DndListProps<TData extends { id: string | number }> {
  columns: DndListColumn<TData>[];
  data: TData[];
  setData: (value: SetStateAction<TData[]>) => void;
  serverId?: string;
}

export function DndList<TData extends { id: string | number }>({
  columns,
  data,
  setData,
  serverId,
}: DndListProps<TData>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setData((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over?.id);

        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  return (
    <main className="grid gap-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={data} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col flex-1 overflow-auto gap-2">
            {data.map((item) => (
              <DndListRow
                id={item.id}
                row={item}
                columns={columns.filter(
                  (column) => column.visibility !== false,
                )}
                key={item.id}
                serverId={serverId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}
