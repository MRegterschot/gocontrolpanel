"use client";

import { Button } from "@/components/ui/button";
import { useReactFlow } from "@xyflow/react";
import { ComponentProps, useEffect, useState } from "react";
import { MatchEdgeType } from "../edges/match-edge";
import { MatchNodeType } from "../nodes/match-node";

export default function ToggleWaitingEdgesButton({
  ...props
}: ComponentProps<"button">) {
  const { getEdges, setEdges } = useReactFlow<MatchNodeType, MatchEdgeType>();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const edges = getEdges();

    const updatedEdges = edges.map((edge) => {
      if (edge.data?.type === "Wait") {
        return {
          ...edge,
          hidden: !isVisible,
        };
      }
      return edge;
    });

    setEdges(updatedEdges);
  }, [isVisible, getEdges, setEdges]);

  return (
    <Button
      variant="outline"
      className="dark:bg-card hover:dark:bg-muted"
      onClick={() => setIsVisible((prev) => !prev)}
      {...props}
    >
      {isVisible ? "Hide Waiting Edges" : "Show Waiting Edges"}
    </Button>
  );
}
