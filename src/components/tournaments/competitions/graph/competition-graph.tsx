"use client";
import Modal from "@/components/modals/modal";
import CreateConnectionModal from "@/components/modals/tournaments/competition/create-connection";
import EdgeSettingsModal from "@/components/modals/tournaments/competition/edge-settings";
import NodeSettingsModal from "@/components/modals/tournaments/competition/node-settings";
import { Card } from "@/components/ui/card";
import { useCompetitionGraph as useCompetitionGraph } from "@/hooks/tournaments/competitions/use-competition-graph";
import { toNodeHandle, toNodeId } from "@/lib/node-handle";
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
  XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
import { useAutosavePositions } from "./use-autosave-positions";

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

  const { track, accepts } = useAutosavePositions();
  // The server positions seen last, so a node only moves when its own server position changed.
  // This keeps an unsaved auto layout and the node being dragged in place.
  const serverPositions = useRef(new Map<string, XYPosition>());
  useEffect(() => {
    const positions = new Map(graph.nodePositions.map((row) => [toNodeId(row.node), row.position]));
    // The handle tag is the id prefix, only leaderboards have a different node type.
    const sources: [NodeHandle["tag"], MasterNodeEnumType["type"], readonly { id: number }[]][] = [
      ["MatchV1", "MatchV1", graph.nMatchV1],
      ["CompetitionV1", "CompetitionV1", graph.nCompetitionV1],
      ["RegistrationV1", "RegistrationV1", graph.nRegistrationV1],
      ["LeaderboardV1", "LeaderboardV2", graph.nLeaderboardV2],
      ["OutputV1", "OutputV1", graph.nOutputV1],
      ["ServerV1", "ServerV1", graph.nServerV1],
      ["InputV1", "InputV1", graph.nInputV1],
    ];
    const transformedNodes = sources.flatMap(([tag, type, rows]) => rows.map((data) => {
      const id = `${tag}-${data.id}`;
      return { id, type, data, position: positions.get(id) ?? { x: 0, y: 0 } } as MasterNodeEnumType;
    }));

    const seen = serverPositions.current;
    const moved = new Set(transformedNodes
      .filter(({ id, position }) => {
        const last = seen.get(id);
        return !last || last.x !== position.x || last.y !== position.y;
      })
      .filter(({ id, position }) => accepts(id, position))
      .map(({ id }) => id));
    serverPositions.current = new Map(transformedNodes.map(({ id, position }) => [id, position]));

    setNodes((current) => {
      const locals = new Map(current.map((n) => [n.id, n]));
      return transformedNodes.map((node) => {
        const local = locals.get(node.id);
        if (!local) return node;
        const position = moved.has(node.id) && !local.dragging ? node.position : local.position;
        // Unchanged nodes keep their object, so their memoized component doesn't re-render.
        if (local.data === node.data && local.position === position) return local;
        return { ...local, data: node.data, position } as MasterNodeEnumType;
      });
    });
  }, [accepts, graph.nMatchV1, graph.nCompetitionV1, graph.nodePositions, graph.nLeaderboardV2, graph.nInputV1, graph.nOutputV1, graph.nRegistrationV1, graph.nServerV1]);

  useEffect(() => {
    const transformedEdges: DataEdgeType[] = [
      ...graph.connections.map((e) => ({
        id: `edge-${e.origin.tag}-${e.origin.value}-${e.target.tag}-${e.target.value}`,
        source: `${e.origin.tag}-${e.origin.value}`,
        target: `${e.target.tag}-${e.target.value}`,
        type: e.kind.tag,
        className: `${e.kind.tag.toLowerCase()}-edge ${e.status.tag.toLowerCase()}-edge`,
        data: e,
      }))
    ]

    // Routes from the last auto layout and hidden waiting edges are local, so they are kept.
    setEdges((current) => {
      const locals = new Map(current.map((e) => [e.id, e]));
      return transformedEdges.map((edge) => {
        const local = locals.get(edge.id);
        return local ? { ...edge, hidden: local.hidden, data: { ...edge.data!, route: local.data?.route } } : edge;
      });
    });
  }, [graph.connections]);

  const onNodesChange: OnNodesChange<MasterNodeEnumType> = useCallback(
    (changes) => {
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
      track(changes);
    },
    [track],
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
