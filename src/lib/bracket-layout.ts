import { Edge, Node, Position } from "@xyflow/react";

export function computeNodeDepths<TNode extends Node, TEdge extends Edge>(
  nodes: TNode[],
  edges: TEdge[],
): Map<string, number> {
  const parents = new Map<string, string[]>();

  nodes.forEach((n) => parents.set(n.id, []));

  edges.forEach((e) => {
    if (!parents.has(e.source)) return;
    // inverted semantics: target -> source
    parents.get(e.source)?.push(e.target);
  });

  const depth = new Map<string, number>();

  function dfs(id: string): number {
    if (depth.has(id)) return depth.get(id) ?? 0;

    const ps = parents.get(id);
    if (!ps || ps.length === 0) {
      depth.set(id, 0);
      return 0;
    }

    let maxParentDepth = 0;
    for (const p of ps) {
      if (!parents.has(p)) continue;
      maxParentDepth = Math.max(maxParentDepth, dfs(p));
    }

    const d = maxParentDepth + 1;
    depth.set(id, d);
    return d;
  }

  nodes.forEach((n) => dfs(n.id));
  return depth;
}

function getDataParents<TEdge extends Edge>(
  nodeId: string,
  edges: TEdge[],
): string[] {
  if (!edges.length) return [];

  return edges
    .filter(
      (e) =>
        e.source === nodeId &&
        e.data?.connectionTag === "Data" &&
        typeof e.target === "string",
    )
    .map((e) => e.target);
}

export function layoutBracket<TNode extends Node, TEdge extends Edge>(
  nodes: TNode[],
  edges: TEdge[],
  options?: {
    xSpacing?: number;
    ySpacing?: number;
    nodeWidth?: number;
    nodeHeight?: number;
  },
) {
  if (!nodes.length) {
    return { nodes: [], edges };
  }

  const { xSpacing = 220, ySpacing = 100 } = options ?? {};

  const depths = computeNodeDepths(nodes, edges);

  // Group by round
  const rounds = new Map<number, TNode[]>();
  nodes.forEach((n) => {
    const d = depths.get(n.id) ?? 0;
    if (!rounds.has(d)) rounds.set(d, []);
    rounds.get(d)?.push(n);
  });

  const sortedRounds = [...rounds.entries()].sort(([a], [b]) => a - b);

  const positioned = new Map<string, TNode>();

  // Remaining rounds
  for (let r = 0; r < sortedRounds.length; r++) {
    const [round, roundNodes] = sortedRounds[r];

    let fallbackIndex = 0;

    roundNodes.forEach((node, i) => {
      let y = i * ySpacing;

      if (round !== 0) {
        const parentIds = getDataParents(node.id, edges);

        const dataParents = parentIds
          .map((id) => positioned.get(id))
          .filter((p): p is TNode => Boolean(p));


        if (dataParents.length > 0) {
          y =
            dataParents.reduce((sum, p) => sum + p.position.y, 0) /
            dataParents.length;
        } else {
          y = fallbackIndex * ySpacing;
          fallbackIndex++;
        }
      }

      positioned.set(node.id, {
        ...node,
        position: {
          x: round * xSpacing,
          y,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  }

  return {
    nodes: Array.from(positioned.values()),
    edges,
  };
}
