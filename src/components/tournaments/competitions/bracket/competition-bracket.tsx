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
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Infer } from "spacetimedb";
import "./bracket.css";
import MatchEdge, { MatchEdgeType } from "./edges/match-edge";
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

  const [nodes, setNodes] = useState<MatchNodeType[]>([]);
  const [edges, setEdges] = useState<MatchEdgeType[]>([]);

  useEffect(() => {
    const rawNodes: MatchNodeType[] = bracket.nodes.map((n) => ({
      id: `match-${n.id}`,
      type: "match",
      data: { label: `Match ${n.id}` },
      position: { x: 0, y: 0 },
    }));

    const rawEdges: MatchEdgeType[] = bracket.edges.map((e) => ({
      id: `edge-${e.from}-${e.to}`,
      source: `match-${e.from}`,
      target: `match-${e.to}`,
      type: "matchEdge",
      className: `${e.type.toLowerCase()}-edge`,
      data: {
        type: e.type,
      },
    }));

    setNodes(rawNodes);
    setEdges(rawEdges);
  }, [bracket.nodes, bracket.edges]);

  const onNodesChange: OnNodesChange<MatchNodeType> = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange<MatchEdgeType> = useCallback(
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

  const onEdgeClick = useCallback((_: MouseEvent, edge: MatchEdgeType) => {
    console.log("edge clicked", edge);
  }, []);

  return (
    <Card className="w-full h-[50vh]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
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
