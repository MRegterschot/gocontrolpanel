"use client";
import { BaseEdge, getSimpleBezierPath, Position } from "@xyflow/react";

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
  const [edgePath] = getSimpleBezierPath({
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
    </>
  );
}
