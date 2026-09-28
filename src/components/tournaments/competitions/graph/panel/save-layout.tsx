"use client";

import { Button } from "@/components/ui/button";
import { reducers } from "@/lib/server-manager";
import { useReactFlow } from "@xyflow/react";
import { ComponentProps } from "react";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import { MasterNodeEnumType } from "../competition-graph";

export default function SaveLayoutButton({
  ...props
}: ComponentProps<"button">) {
  const updateNodePosition = useReducer(reducers.competitionNodePositionUpdate);
  const { getNodes } = useReactFlow<MasterNodeEnumType>();

  const onSaveLayout = () => {
    const nodes = getNodes();

    nodes.forEach((node) => {
      if (
        !node.id ||
        (node.position.x === node.position.x &&
          node.position.y === node.position.y)
      )
        return;

      const nodeId = parseInt(node.id, 10);
      updateNodePosition({
        node: { tag: "MatchV1", value: nodeId },
        position: { x: node.position.x, y: node.position.y },
      });
    });

    toast.success("Layout successfully saved");
  };

  return (
    <Button variant="outline" className="dark:bg-card hover:dark:bg-muted" onClick={onSaveLayout} {...props}>
      Save Layout
    </Button>
  );
}
