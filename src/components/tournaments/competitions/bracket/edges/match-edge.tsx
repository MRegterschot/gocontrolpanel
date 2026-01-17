"use client";
import { Button } from "@/components/ui/button";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSimpleBezierPath,
  Position,
  useReactFlow,
} from "@xyflow/react";

interface MatchEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export default function MatchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: MatchEdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getSimpleBezierPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <Button
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onClick={() => deleteElements({ edges: [{ id }] })}
        >
          Delete
        </Button>
      </EdgeLabelRenderer>
    </>
  );
}
