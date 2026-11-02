"use client";
import { Button } from "@/components/ui/button";
import { CompetitionConnection } from "@/lib/server-manager/types";
import { IconSettings } from "@tabler/icons-react";
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getSimpleBezierPath, Position } from "@xyflow/react";
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
      {/* The label layer zooms with the graph, so the button doesn't re-render on every pan or zoom. */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute pointer-events-auto"
          style={{ transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px) scale(.5)` }}
        >
          <Button className={`text-white ${data && STATUS_COLORS[data.status.tag]}`} onClick={() => data && openEdgeSettings(data.id)}>
            <IconSettings />
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(DataEdge)
