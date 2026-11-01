"use client";
import { Button } from "@/components/ui/button";
import { CompetitionConnection } from "@/lib/server-manager/types";
import { IconSettings } from "@tabler/icons-react";
import { BaseEdge, Edge, EdgeProps, EdgeToolbar, getSimpleBezierPath, Position, useViewport } from "@xyflow/react";
import { memo } from "react";
import { useGraphActions } from "../graph-context";

export type DataEdgeType = Edge<CompetitionConnection>;

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

          <Button className="nodrag nopan" onClick={() => data && openEdgeSettings(data.id)}>
            <IconSettings />
          </Button>
        </div>
      </EdgeToolbar>
    </>
  );
}

export default memo(DataEdge)
