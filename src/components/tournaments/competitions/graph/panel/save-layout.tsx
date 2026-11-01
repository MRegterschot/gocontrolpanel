"use client";

import { Button } from "@/components/ui/button";
import { toNodeHandle } from "@/lib/node-handle";
import { reducers } from "@/lib/server-manager";
import { getErrorMessage } from "@/lib/utils";
import { useReactFlow } from "@xyflow/react";
import { ComponentProps } from "react";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import { MasterNodeEnumType } from "../competition-graph";

export default function SaveLayoutButton({
  ...props
}: ComponentProps<"button">) {
  const updateNodePositions = useReducer(reducers.competitionNodePositionsUpdate);
  const { getNodes } = useReactFlow<MasterNodeEnumType>();

  const onSaveLayout = async () => {
    const positions = getNodes().map(({ id, position: { x, y } }) => ({
      node: toNodeHandle(id),
      position: { x, y },
    }));

    try {
      await updateNodePositions({ positions });
      toast.success("Layout successfully saved");
    } catch (error) {
      toast.error("Failed to save layout", { description: getErrorMessage(error) });
    }
  };

  return (
    <Button variant="outline" className="dark:bg-card hover:dark:bg-muted" onClick={onSaveLayout} {...props}>
      Save Layout
    </Button>
  );
}
