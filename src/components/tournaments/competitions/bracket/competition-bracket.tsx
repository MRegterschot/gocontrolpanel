"use client";
import Modal from "@/components/modals/modal";
import CreateConnectionModal from "@/components/modals/tournaments/competition/create-connection";
import { Card } from "@/components/ui/card";
import { useCompetitionBracket } from "@/hooks/tournaments/competitions/use-competition-bracket";
import { CompetitionV1 } from "@/lib/server-manager/types";
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
import "./bracket.css";
import MatchEdge, { MatchEdgeType } from "./edges/match-edge";
import MatchNode, { type MatchNodeType } from "./nodes/match-node";
import AddMatchButton from "./panel/add-match";
import CalculatePositionsButton from "./panel/calculate-positions";
import SaveLayoutButton from "./panel/save-layout";
import SelectedMatchPanel from "./panel/selected-match";
import ToggleWaitingEdgesButton from "./panel/toggle-waiting-edges";

const nodeTypes = {
  match: MatchNode,
};

const edgeTypes = {
  matchEdge: MatchEdge,
};

interface CompetitionBracketProps {
  competition: CompetitionV1;
}

export default function CompetitionBracket({
  competition,
}: CompetitionBracketProps) {
  const { theme } = useTheme();

  const bracket = useCompetitionBracket(competition);

  const [nodes, setNodes] = useState<MatchNodeType[]>([]);
  const [edges, setEdges] = useState<MatchEdgeType[]>([]);

  const [selectedNode, setSelectedNode] = useState<MatchNodeType | null>(null);

  const [createdEdge, setCreatedEdge] = useState<{
    from: number;
    to: number;
  } | null>(null);

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
    (params) => {
      setCreatedEdge({
        from: parseInt(params.target),
        to: parseInt(params.source),
      });

      setEdges((edgesSnapshot) =>
        addEdge(
          {
            ...params,
            type: "matchEdge",
          },
          edgesSnapshot,
        ),
      );
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: MouseEvent, node: MatchNodeType) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const onEdgeClick = useCallback((_: MouseEvent, edge: MatchEdgeType) => {
    if (edge.selected) return;
    console.log("edge clicked", edge);
  }, []);

  const onCreateConnectionCallback = useCallback(() => {
    setCreatedEdge(null);
  }, []);

  return (
    <>
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
            {selectedNode && <SelectedMatchPanel match={selectedNode} />}
          </Panel>
          <Panel position="bottom-left">
            <ToggleWaitingEdgesButton />
          </Panel>
          <Panel position="top-right" className="flex flex-col gap-2">
            <SaveLayoutButton />
            <CalculatePositionsButton />
            <AddMatchButton competitionId={competition.id} />
          </Panel>
        </ReactFlow>
      </Card>

      <Modal
        isOpen={createdEdge !== null}
        setIsOpen={() => setCreatedEdge(null)}
      >
        <CreateConnectionModal
          data={{
            originId: createdEdge?.from || 0,
            targetId: createdEdge?.to || 0,
          }}
          closeModal={() => setCreatedEdge(null)}
        />
      </Modal>
    </>
  );
}
