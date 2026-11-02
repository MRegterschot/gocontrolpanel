"use client";
import Modal from "@/components/modals/modal";
import CreateConnectionModal from "@/components/modals/tournaments/competition/create-connection";
import EdgeSettingsModal from "@/components/modals/tournaments/competition/edge-settings";
import NodeSettingsModal from "@/components/modals/tournaments/competition/node-settings";
import { Card } from "@/components/ui/card";
import { useCompetitionGraph as useCompetitionGraph } from "@/hooks/tournaments/competitions/use-competition-graph";
import { toNodeHandle } from "@/lib/node-handle";
import { CompetitionV1, NodeHandle } from "@/lib/server-manager/types";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ColorMode,
  ConnectionLineType,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import "./graph.css";
import DataEdge, { DataEdgeType } from "./edges/data-edge";
import MatchNode, { type MatchV1NodeType } from "./nodes/match-node";
import AutoLayoutButton from "./panel/auto-layout";
import SaveLayoutButton from "./panel/save-layout";
import ToggleWaitingEdgesButton from "./panel/toggle-waiting-edges";
import CompetitionV1Node, { CompetitionV1NodeType } from "./nodes/competition-node";
import LeaderboardV2Node, { LeaderboardV2NodeType } from "./nodes/leaderboard-node";
import OutputV1Node, { OutputV1NodeType } from "./nodes/output-node";
import RegistrationV1Node, { RegistrationV1NodeType } from "./nodes/registration-node";
import InputV1Node, { InputV1NodeType } from "./nodes/input-node";
import ServerV1Node, { ServerV1NodeType } from "./nodes/server-node";
import { GraphActionsContext } from "./graph-context";
import ContextMenu from "./graph-context-menu";

const nodeTypes = {
  MatchV1: MatchNode,
  CompetitionV1: CompetitionV1Node,
  LeaderboardV2: LeaderboardV2Node,
  InputV1: InputV1Node,
  OutputV1: OutputV1Node,
  RegistrationV1: RegistrationV1Node,
  ServerV1: ServerV1Node,
};

export type MasterNodeEnumType = (MatchV1NodeType | CompetitionV1NodeType | InputV1NodeType | OutputV1NodeType | LeaderboardV2NodeType | RegistrationV1NodeType | ServerV1NodeType);

const edgeTypes = {
  Data: DataEdge,
  Wait: DataEdge,
  Action: DataEdge,
};

interface CompetitionGraphProps {
  competition: CompetitionV1;
}

export default function CompetitionGraph({
  competition,
}: CompetitionGraphProps) {
  const { theme } = useTheme();

  const graph = useCompetitionGraph(competition);

  const [nodes, setNodes] = useState<MasterNodeEnumType[]>([]);
  const [edges, setEdges] = useState<DataEdgeType[]>([]);

  const [createdEdge, setCreatedEdge] = useState<{
    origin: NodeHandle;
    target: NodeHandle;
  } | null>(null);
  useMemo(() => {
    const transformedNodes = [
      ...graph.nMatchV1.map((n) => {
        const handle = NodeHandle.MatchV1(n.id);
        const position = graph.nodePositions.find((row) => row.node.tag == handle.tag && row.node.value == handle.value)?.position ?? { x: 0, y: 0 };
        return {
          id: `MatchV1-${n.id}`,
          type: "MatchV1",
          data: n,
          position,
        }
      }),

      ...graph.nCompetitionV1.map((n) => {
        const handle = NodeHandle.CompetitionV1(n.id);
        const position = graph.nodePositions.find((row) => row.node.tag == handle.tag && row.node.value == handle.value)?.position ?? { x: 0, y: 0 };
        return {
          id: `CompetitionV1-${n.id}`,
          type: "CompetitionV1",
          data: n,
          position,
        }
      }),

      ...graph.nRegistrationV1.map((n) => {
        const handle = NodeHandle.RegistrationV1(n.id);
        const position = graph.nodePositions.find((row) => row.node.tag == handle.tag && row.node.value == handle.value)?.position ?? { x: 0, y: 0 };
        return {
          id: `RegistrationV1-${n.id}`,
          type: "RegistrationV1",
          data: n,
          position,
        }
      }),

      ...graph.nLeaderboardV2.map((n) => {
        // This is a fuck up on my (kistz) part because NodeHandle has no LeaderboardV2 xdd so this is indeed correct.
        const handle = NodeHandle.LeaderboardV1(n.id);
        const position = graph.nodePositions.find((row) => row.node.tag == handle.tag && row.node.value == handle.value)?.position ?? { x: 0, y: 0 };
        return {
          id: `LeaderboardV1-${n.id}`,
          type: "LeaderboardV2",
          data: n,
          position,
        }
      }),

      ...graph.nOutputV1.map((n) => {
        const handle = NodeHandle.OutputV1(n.id);
        const position = graph.nodePositions.find((row) => row.node.tag == handle.tag && row.node.value == handle.value)?.position ?? { x: 0, y: 0 };
        return {
          id: `OutputV1-${n.id}`,
          type: "OutputV1",
          data: n,
          position,
        }
      }),

      ...graph.nServerV1.map((n) => {
        const handle = NodeHandle.ServerV1(n.id);
        const position = graph.nodePositions.find((row) => row.node.tag == handle.tag && row.node.value == handle.value)?.position ?? { x: 0, y: 0 };
        return {
          id: `ServerV1-${n.id}`,
          type: "ServerV1",
          data: n,
          position,
        }
      }),

      ...graph.nInputV1.map((n) => {
        const handle = NodeHandle.InputV1(n.id);
        const position = graph.nodePositions.find((row) => row.node.tag == handle.tag && row.node.value == handle.value)?.position ?? { x: 0, y: 0 };
        return {
          id: `InputV1-${n.id}`,
          type: "InputV1",
          data: n,
          position,
        }
      })
    ]

    setNodes(transformedNodes);
  }, [graph.nMatchV1, graph.nCompetitionV1, graph.nodePositions, graph.nLeaderboardV2, graph.nInputV1, graph.nOutputV1, graph.nRegistrationV1, graph.nServerV1]);

  useMemo(() => {
    const transformedEdges = [
      ...graph.connections.map((e) => ({
        id: `edge-${e.origin.tag}-${e.origin.value}-${e.target.tag}-${e.target.value}`,
        source: `${e.origin.tag}-${e.origin.value}`,
        target: `${e.target.tag}-${e.target.value}`,
        type: e.kind.tag,
        className: `${e.kind.tag.toLowerCase()}-edge ${e.status.tag.toLowerCase()}-edge`,
        data: e,
      }))
    ]

    setEdges(transformedEdges);
  }, [graph.connections]);

  const onNodesChange: OnNodesChange<MasterNodeEnumType> = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [setNodes],
  );

  /*
   
  const onEdgesChange: OnEdgesChange<MatchEdgeType> = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [setEdges],
  ); */

  // The edge shows up once the server has created the connection.
  const onConnect: OnConnect = useCallback(({ source, target }) => {
    setCreatedEdge({ origin: toNodeHandle(source), target: toNodeHandle(target) });
  }, []);

  const [settingsEdgeId, setSettingsEdgeId] = useState<number | null>(null);
  const settingsEdge = graph.connections.find((c) => c.id === settingsEdgeId);
  const [settingsNodeId, setSettingsNodeId] = useState<string | null>(null);
  const settingsNode = nodes.find((n) => n.id === settingsNodeId);
  const graphActions = useMemo(
    () => ({ openEdgeSettings: setSettingsEdgeId, openNodeSettings: setSettingsNodeId }),
    [],
  );

  const [menu, setMenu] = useState<{ x: number, y: number } | null>(null);
  const onContextMenu = useCallback((event: globalThis.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY });
  }, []);

  return (
    <GraphActionsContext.Provider value={graphActions}>
    <div className="flex-1 min-h-0 w-full h-full flex flex-col">
      <Card className="w-full flex-1 min-h-0 relative rounded-[calc(var(--radius)+4px)] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          //onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          snapGrid={[10, 10]}
          snapToGrid={true}
          minZoom={0.25}
          onPaneContextMenu={onContextMenu}
          onPaneClick={() => setMenu(null)}
          fitView
          colorMode={theme as ColorMode}
          connectionLineType={ConnectionLineType.SmoothStep}
          style={{
            borderRadius: "calc(var(--radius) + 4px)",
            width: "100%",
            height: "100%",
          }}
          className="absolute"
        >
          <Background />
          <Panel position="bottom-left">
            <ToggleWaitingEdgesButton />
          </Panel>
          <Panel position="top-right" className="flex flex-col gap-2">
            <SaveLayoutButton />
            <AutoLayoutButton />
          </Panel>

          {menu && <ContextMenu {...menu} competitionId={competition.id} onClose={() => setMenu(null)} />}
        </ReactFlow>
      </Card>

      <Modal
        isOpen={createdEdge !== null}
        setIsOpen={() => setCreatedEdge(null)}
      >
        <CreateConnectionModal
          data={createdEdge ?? undefined}
          closeModal={() => setCreatedEdge(null)}
        />
      </Modal>

      <Modal
        isOpen={settingsEdge !== undefined}
        setIsOpen={() => setSettingsEdgeId(null)}
      >
        <EdgeSettingsModal
          data={settingsEdge}
          closeModal={() => setSettingsEdgeId(null)}
        />
      </Modal>

      <Modal
        isOpen={settingsNode !== undefined}
        setIsOpen={() => setSettingsNodeId(null)}
      >
        <NodeSettingsModal
          key={settingsNodeId}
          data={settingsNode}
          closeModal={() => setSettingsNodeId(null)}
        />
      </Modal>
    </div>
    </GraphActionsContext.Provider>
  );
}
