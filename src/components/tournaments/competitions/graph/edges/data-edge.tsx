"use client";
import { Button } from "@/components/ui/button";
import { CompetitionConnection } from "@/lib/server-manager/types";
import { IconSettings } from "@tabler/icons-react";
import { BaseEdge, Edge, EdgeProps, EdgeToolbar, getSimpleBezierPath, Position, useViewport } from "@xyflow/react";
import { memo } from "react";
import { useGraphActions } from "../graph-context";

export type DataEdgeType = Edge<CompetitionConnection>;

const STATUS_COLORS = {
  Configuring: "bg-red-500 hover:bg-red-700",
  Configured: "bg-yellow-500 hover:bg-yellow-700",
  Resolved: "bg-green-500 hover:bg-green-700",
} as const;

function DataEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<DataEdgeType>) {
  const { zoom } = useViewport();
  const { openEdgeSettings } = useGraphActions();

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

          <Button className={`nodrag nopan text-white ${data && STATUS_COLORS[data.status.tag]}`} onClick={() => data && openEdgeSettings(data.id)}>
            <IconSettings />
          </Button>
        </div>
      </EdgeToolbar>
    </>
  );
}

export default memo(DataEdge)
