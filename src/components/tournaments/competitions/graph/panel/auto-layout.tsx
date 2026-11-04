"use client";

import { Button } from "@/components/ui/button";
import { useReactFlow } from "@xyflow/react";
import ELK, { ElkNode } from 'elkjs/lib/elk.bundled.js';
import { ComponentProps } from "react";
import { MasterNodeEnumType } from "../competition-graph";
import { DataEdgeType } from "../edges/data-edge";

const elk = new ELK();

// Elk has a *huge* amount of options to configure. To see everything you can
// tweak check out:
//
// - https://www.eclipse.org/elk/reference/algorithms.html
// - https://www.eclipse.org/elk/reference/options.html
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  // Edges are routed around the nodes, these keep them clear of each other and the nodes.
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.spacing.edgeNode': '30',
  'elk.spacing.edgeEdge': '15',
  'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '15',
};

export default function AutoLayoutButton({
  ...props
}: ComponentProps<"button">) {
  const { getNodes, setNodes, getEdges, setEdges, fitView } = useReactFlow<MasterNodeEnumType, DataEdgeType>();

  const onAutoLayout = async () => {
    const nodes = getNodes();
    const edges = getEdges();

    const graph: ElkNode = {
      id: 'root',
      layoutOptions: elkOptions,
      children: nodes.map((node) => {
        const width = node.measured?.width ?? 150;
        const height = node.measured?.height ?? 50;
        // Ports sit where the handles are, in the middle of the left and right side.
        return {
          id: node.id,
          width,
          height,
          layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
          ports: [
            { id: `${node.id}-in`, x: 0, y: height / 2, width: 0, height: 0 },
            { id: `${node.id}-out`, x: width, y: height / 2, width: 0, height: 0 },
          ],
        };
      }),
      edges: edges.map((edge => ({
        id: edge.id,
        sources: [`${edge.source}-out`],
        targets: [`${edge.target}-in`],
      }))),
    };

    try {
      const layoutedGraph = await elk
        .layout(graph);
      const updatedNodes = nodes.map((originalNode) => {
        const elkNode = layoutedGraph.children?.find((child) => child.id === originalNode.id);

        return {
          ...originalNode,
          targetPosition: 'left',
          sourcePosition: 'right',
          position: {
            x: elkNode?.x ?? 0,
            y: elkNode?.y ?? 0
          },
        } as MasterNodeEnumType;
      });

      setNodes(updatedNodes);
      // Only the bend points are kept, the ends follow the handles when the edge is drawn.
      const placed = new Map(updatedNodes.map((n) => [n.id, n.position]));
      const bends = new Map(layoutedGraph.edges?.map((e) => [e.id, e.sections?.[0]?.bendPoints ?? []]));
      setEdges(edges.map((edge) => {
        const source = placed.get(edge.source);
        const target = placed.get(edge.target);
        if (!edge.data || !source || !target) return edge;
        return { ...edge, data: { ...edge.data, route: { points: bends.get(edge.id) ?? [], source, target } } };
      }));

      fitView()
    } catch (error) {
      console.error("ELK Layout failed:", error);
    }
  };

  return (
    <Button
      variant="outline"
      className="dark:bg-card hover:dark:bg-muted"
      onClick={onAutoLayout}
      {...props}
    >
      Auto Layout
    </Button>
  );
}
