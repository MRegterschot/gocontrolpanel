"use client";
import { toNodeHandle } from "@/lib/node-handle";
import { reducers } from "@/lib/server-manager";
import { getErrorMessage } from "@/lib/utils";
import { NodeChange, XYPosition } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";

// At most 10 saves a second while dragging, the final position is sent right on drop.
const INTERVAL = 100;

const samePosition = (a: XYPosition, b: XYPosition) => a.x === b.x && a.y === b.y;

export function useAutosavePositions() {
  const update = useReducer(reducers.competitionNodePositionsUpdate);
  const pending = useRef(new Map<string, XYPosition>());
  // The last position sent per node, until the server has echoed it back.
  const awaiting = useRef(new Map<string, XYPosition>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);
  const dragging = useRef(false);
  const failed = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current.size === 0) return;

    const sent = [...pending.current];
    pending.current.clear();
    lastSent.current = Date.now();
    sent.forEach(([id, position]) => awaiting.current.set(id, position));

    // An unchanged position is never echoed, so a finished save clears its wait as well.
    const settle = () => sent.forEach(([id, position]) => {
      if (awaiting.current.get(id) === position) awaiting.current.delete(id);
    });

    update({ positions: sent.map(([id, { x, y }]) => ({ node: toNodeHandle(id), position: { x, y } })) }).then(settle, (error) => {
      settle();
      // One toast per drag instead of one per save.
      if (failed.current) return;
      failed.current = true;
      toast.error("Failed to save node position", { description: getErrorMessage(error) });
    });
  }, [update]);

  useEffect(() => flush, [flush]);

  // Only user moves are position changes with a dragging flag, so auto layout is never saved.
  const track = useCallback((changes: NodeChange[]) => {
    let dropped = false;
    for (const change of changes) {
      if (change.type !== "position" || change.dragging === undefined) continue;
      if (change.position) pending.current.set(change.id, change.position);
      if (change.dragging && !dragging.current) failed.current = false;
      dragging.current = change.dragging;
      if (!change.dragging) dropped = true;
    }

    if (dropped) flush();
    else if (pending.current.size > 0 && !timer.current) {
      timer.current = setTimeout(flush, Math.max(0, INTERVAL - (Date.now() - lastSent.current)));
    }
  }, [flush]);

  // Whether a node may take a position from the server, older echoes of our own saves are skipped.
  const accepts = useCallback((id: string, position: XYPosition) => {
    const expected = awaiting.current.get(id);
    if (!expected) return true;
    if (samePosition(expected, position)) awaiting.current.delete(id);
    return false;
  }, []);

  return { track, accepts };
}
