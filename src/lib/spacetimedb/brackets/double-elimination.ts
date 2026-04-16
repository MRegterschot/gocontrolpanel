import { MatchNodeType } from "@/components/tournaments/competitions/bracket/nodes/match-node";

export function calculateDoubleEliminationBracketPositions(
  nodes: MatchNodeType[],
  gap: {
    x: number;
    y: number;
  },
): MatchNodeType[] {
  // Sort nodes by id to ensure consistent ordering, the highest id is the final match
  const sortedNodes = [...nodes].sort(
    (a, b) => parseInt(a.id) - parseInt(b.id),
  );

  // calculate bracket size, the bracket size is the power of 2 that is equal or one lower than the number of matches in the upper bracket
  const numMatches = sortedNodes.length;
  const bracketSize = Math.pow(2, Math.floor(Math.log2(numMatches)));

  const lowerBracketPositionOffset = (bracketSize / 2) * gap.y;

  const positionedNodes: MatchNodeType[] = [];

  // Calculate positions for first round of upper bracket
  for (let i = 0; i < bracketSize / 2; i++) {
    const node = sortedNodes.shift();
    if (!node) continue;

    positionedNodes.push({
      ...node,
      position: {
        x: 0,
        y: i * gap.y,
      },
    });
  }

  // Calculate rest of the upper bracket rounds and lower bracket rounds when needed
  for (let i = 1; i < Math.log2(bracketSize); i++) {
    const matchesInRound = bracketSize / Math.pow(2, i + 1);

    // Generate upper bracket round
    for (let j = 0; j < matchesInRound; j++) {
      const node = sortedNodes.shift();
      if (!node) continue;

      positionedNodes.push({
        ...node,
        position: {
          x: ((i - 1) * 2 + 1) * gap.x,
          y:
            j * gap.y * i * 2 +
            (Math.max((i - 1) * 2 - 1, 0) * gap.y + gap.y / 2),
        },
      });
    }

    // Generate first lower bracket round after the first upper bracket round
    for (let j = 0; j < matchesInRound; j++) {
      const node = sortedNodes.shift();
      if (!node) continue;

      positionedNodes.push({
        ...node,
        position: {
          x: ((i - 1) * 2 + 1) * gap.x,
          y: lowerBracketPositionOffset + j * gap.y,
        },
      });
    }

    // Generate second lower bracket round
    for (let j = 0; j < matchesInRound; j++) {
      const node = sortedNodes.shift();
      if (!node) continue;

      positionedNodes.push({
        ...node,
        position: {
          x: ((i - 1) * 2 + 1) * gap.x + gap.x,
          y: lowerBracketPositionOffset + j * gap.y,
        },
      });
    }
  }

  // Calculate positions for grand final
  const grandFinalNode = sortedNodes.shift();
  if (grandFinalNode) {
    positionedNodes.push({
      ...grandFinalNode,
      position: {
        x: (Math.log2(bracketSize) - 1) * 2 * gap.x + gap.x,
        y: lowerBracketPositionOffset / 2 - gap.y / 2,
      },
    });
  }

  // Add any remaining nodes
  for (const node of sortedNodes) {
    positionedNodes.push({
      ...node,
      position: {
        x: -gap.x,
        y: -gap.y,
      },
    });
  }

  return positionedNodes;
}
