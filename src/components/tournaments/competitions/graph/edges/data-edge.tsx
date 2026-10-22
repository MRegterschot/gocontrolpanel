"use client";
import { Button } from "@/components/ui/button";
import { CompetitionConnection } from "@/lib/server-manager/types";
import { IconSettings } from "@tabler/icons-react";
import { BaseEdge, Edge, EdgeToolbar, getSimpleBezierPath, Position, useViewport } from "@xyflow/react";
import { memo } from "react";

export type DataEdgeType = Edge<CompetitionConnection>;

interface DataEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

function DataEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: DataEdgeProps) {
  const { zoom } = useViewport();

  const [edgePath, centerX, centerY] = getSimpleBezierPath({
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
      <EdgeToolbar edgeId={id} x={centerX} y={centerY} isVisible>
        <div style={{ scale: .5 * zoom }}>

          <Button>
            <IconSettings />
          </Button>
        </div>
      </EdgeToolbar>
    </>
  );
}

export default memo(DataEdge)