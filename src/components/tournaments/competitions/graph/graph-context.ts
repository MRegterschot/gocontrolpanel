import { createContext, useContext } from "react";

// Lets memoized nodes and edges open the single settings modal owned by the graph.
type GraphActions = {
  openEdgeSettings: (connectionId: number) => void;
};

export const GraphActionsContext = createContext<GraphActions>({
  openEdgeSettings: () => {},
});

export const useGraphActions = () => useContext(GraphActionsContext);
