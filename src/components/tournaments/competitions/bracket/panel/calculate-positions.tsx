"use client";

import { Button } from "@/components/ui/button";
import { calculateDoubleEliminationBracketPositions } from "@/lib/spacetimedb/brackets/double-elimination";
import { useReactFlow } from "@xyflow/react";
import { ComponentProps } from "react";
import { MatchNodeType } from "../nodes/match-node";

export default function CalculatePositionsButton({
  ...props
}: ComponentProps<"button">) {
  const { getNodes, setNodes } = useReactFlow<MatchNodeType>();

  const onCalculatePositions = () => {
    const nodes = getNodes();

    const positionedNodes = calculateDoubleEliminationBracketPositions(nodes, {
      x: 450,
      y: 200,
    });

    setNodes(positionedNodes);
  };

  return (
    <Button
      variant="outline"
      className="dark:bg-card hover:dark:bg-muted"
      onClick={onCalculatePositions}
      {...props}
    >
      Calculate Positions
    </Button>
  );
}
