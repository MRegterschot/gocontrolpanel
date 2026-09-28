"use client";

import { Button } from "@/components/ui/button";
import { useReactFlow } from "@xyflow/react";
import ELK from 'elkjs/lib/elk.bundled.js';
import { ComponentProps } from "react";
import { MasterNodeEnumType } from "../competition-graph";

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
};

export default function CalculatePositionsButton({
  ...props
}: ComponentProps<"button">) {
  const { getNodes, setNodes, getEdges, fitView } = useReactFlow<MasterNodeEnumType>();

  const onCalculatePositions = async () => {
    const nodes = getNodes();
    const edges = getEdges();

    const graph = {
      id: 'root',
      layoutOptions: elkOptions,
      children: nodes.map((node) => ({
        ...node,
        targetPosition: 'left',
        sourcePosition: 'right',

        width: node.measured?.width ?? 150,
        height: node.measured?.height ?? 50,
      })),
      edges: edges.map((edge => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
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

      fitView()
    } catch (error) {
      console.error("ELK Layout failed:", error);
    }
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
