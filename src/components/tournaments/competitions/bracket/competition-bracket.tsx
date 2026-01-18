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
  Panel,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Infer } from "spacetimedb";
import "./bracket.css";
import MatchEdge, { MatchEdgeType } from "./edges/match-edge";
import MatchNode, { type MatchNodeType } from "./nodes/match-node";
import AddMatchButton from "./panel/add-match";
import SaveLayoutButton from "./panel/save-layout";
import SelectedMatchPanel from "./panel/selected-match";

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

  const [selectedNode, setSelectedNode] = useState<MatchNodeType | null>(null);

  useEffect(() => {
    const rawNodes: MatchNodeType[] = bracket.nodes.map((n) => ({
      id: n.id.toString(),
      type: "match",
      data: { label: n.name, defaultPosition: n.position },
      position: n.position,
    }));

    const rawEdges: MatchEdgeType[] = bracket.edges.map((e) => ({
      id: `edge-${e.from}-${e.to}`,
      source: e.from.toString(),
      target: e.to.toString(),
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

  const onNodeClick = useCallback((_: MouseEvent, node: MatchNodeType) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const onEdgeClick = useCallback((_: MouseEvent, edge: MatchEdgeType) => {
    if (edge.selected) return;
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
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        snapGrid={[10, 10]}
        snapToGrid={true}
        minZoom={0.25}
        fitView
        colorMode={theme as ColorMode}
        style={{
          borderRadius: "calc(var(--radius) + 4px)",
        }}
      >
        <Background />
        <Panel position="top-left">
          {selectedNode && (
            <SelectedMatchPanel
              match={selectedNode}
              clearSelection={() => setSelectedNode(null)}
            />
          )}
        </Panel>
        <Panel position="top-right" className="flex flex-col gap-2">
          <SaveLayoutButton />
          <AddMatchButton competitionId={competition.id} />
        </Panel>
      </ReactFlow>
    </Card>
  );
}
