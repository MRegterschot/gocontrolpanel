import { createContext, useContext } from "react";

// Lets memoized nodes and edges open the single settings modal owned by the graph.
type GraphActions = {
  openEdgeSettings: (connectionId: number) => void;
  openNodeSettings: (nodeId: string) => void;
};

export const GraphActionsContext = createContext<GraphActions>({
  openEdgeSettings: () => {},
  openNodeSettings: () => {},
});

export const useGraphActions = () => useContext(GraphActionsContext);
