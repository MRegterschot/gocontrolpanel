"use client";
import { Button } from "@/components/ui/button";
import { CompetitionConnection } from "@/lib/server-manager/types";
import { IconSettings } from "@tabler/icons-react";
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getSimpleBezierPath, Position, useInternalNode, XYPosition } from "@xyflow/react";
import { memo } from "react";
import { useGraphActions } from "../graph-context";
import { midpoint, roundedPath, samePlace } from "./route";

// The bend points of the last auto layout, together with where both nodes were placed.
export type EdgeRoute = { points: XYPosition[]; source: XYPosition; target: XYPosition };
export type DataEdgeType = Edge<CompetitionConnection & { route?: EdgeRoute }>;

const STATUS_COLORS = {
  Configuring: "bg-red-500 hover:bg-red-700",
  Configured: "bg-yellow-500 hover:bg-yellow-700",
  Resolved: "bg-green-500 hover:bg-green-700",
} as const;

function DataEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<DataEdgeType>) {
  const { openEdgeSettings } = useGraphActions();

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const route = data?.route;
  // Once a node has moved the route would cut through things, so the edge is a curve again.
  const routed = route && sourceNode && targetNode
    && samePlace(route.source, sourceNode.internals.positionAbsolute)
    && samePlace(route.target, targetNode.internals.positionAbsolute);
  const points = routed ? [{ x: sourceX, y: sourceY }, ...route.points, { x: targetX, y: targetY }] : undefined;
  const center = points && midpoint(points);
  const [edgePath, centerX, centerY] = points && center ? [roundedPath(points), center.x, center.y] : getSimpleBezierPath({
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
