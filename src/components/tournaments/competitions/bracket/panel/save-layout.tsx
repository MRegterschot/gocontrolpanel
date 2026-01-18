"use client";

import { Button } from "@/components/ui/button";
import { reducers } from "@/lib/tourney-manager";
import { useReactFlow } from "@xyflow/react";
import { ComponentProps } from "react";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import { MatchNodeType } from "../nodes/match-node";

export default function SaveLayoutButton({
  ...props
}: ComponentProps<"button">) {
  const updateNodePosition = useReducer(reducers.competitionNodePositionUpdate);
  const { getNodes } = useReactFlow<MatchNodeType>();

  const onSaveLayout = () => {
    const nodes = getNodes();

    nodes.forEach((node) => {
      if (
        !node.id ||
        (node.data.defaultPosition.x === node.position.x &&
          node.data.defaultPosition.y === node.position.y)
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
