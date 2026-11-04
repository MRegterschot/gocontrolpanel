import { RawServerConfigV2 } from "@/lib/server-manager/types";
import { createContext, useContext } from "react";

// Lets memoized nodes and edges open the single settings modal owned by the graph.
type GraphActions = {
  openEdgeSettings: (connectionId: number) => void;
  openNodeSettings: (nodeId: string) => void;
  openMatch: (matchId: number) => void;
};

export const GraphActionsContext = createContext<GraphActions>({
  openEdgeSettings: () => {},
  openNodeSettings: () => {},
  openMatch: () => {},
});

export const useGraphActions = () => useContext(GraphActionsContext);

// The configs used by the matches of the graph, looked up by id.
export const MatchConfigsContext = createContext<Map<number, RawServerConfigV2>>(new Map());

export const useMatchConfig = (configId: number) => useContext(MatchConfigsContext).get(configId);
