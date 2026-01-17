"use client";
import { Card } from "@/components/ui/card";
import { useCompetitionBracket } from "@/hooks/tournaments/competitions/use-competition-bracket";
import { CompetitionV1 } from "@/lib/tourney-manager";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ColorMode,
  Edge,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Infer } from "spacetimedb";
import MatchEdge from "./edges/match-edge";
import MatchNode, { type MatchNodeType } from "./nodes/match-node";

const nodeTypes = {
  match: MatchNode,
};

const edgeTypes = {
  matchEdge: MatchEdge,
};

interface CompetitionBracketProps {
  competition: Infer<typeof CompetitionV1>;
}

export default function CompetitionBracket({
  competition,
}: CompetitionBracketProps) {
  const { theme } = useTheme();

  const bracket = useCompetitionBracket(competition);

  console.log("bracket", bracket);

  const [nodes, setNodes] = useState<MatchNodeType[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const newNodes: MatchNodeType[] = bracket.nodes.map((node, i) => ({
      id: `match-${node.id}`,
      position: { x: i * 200, y: 0 },
      data: { label: `Match ${node.id}` },
      type: "match",
    }));

    setNodes(newNodes);
  }, [bracket.nodes]);

  useEffect(() => {
    const newEdges: Edge[] = bracket.edges.map((edge) => ({
      id: `edge-${edge.from}-to-${edge.to}`,
      source: `match-${edge.from}`,
      target: `match-${edge.to}`,
      type: "matchEdge",
    }));

    setEdges(newEdges);
  }, [bracket.edges]);

  const onNodesChange: OnNodesChange<MatchNodeType> = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (params) =>
      setEdges((edgesSnapshot) =>
        addEdge(
          {
            ...params,
            type: "matchEdge",
          },
          edgesSnapshot,
        ),
      ),
    [setEdges],
  );

  return (
    <Card className="w-full h-[50vh]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        colorMode={theme as ColorMode}
        style={{
          borderRadius: "calc(var(--radius) + 4px)",
        }}
      >
        <Background />
      </ReactFlow>
    </Card>
  );
}
