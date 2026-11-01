"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers } from "@/lib/server-manager";
import { useReactFlow } from "@xyflow/react";
import { useReducer } from "spacetimedb/react";

interface ContextMenuProps {
    x: number;
    y: number;
    competitionId: number;
    onClose: () => void;
}

// Creates a node at the right-clicked position. Names can be changed afterwards.
export default function ContextMenu({ x, y, competitionId, onClose }: ContextMenuProps) {
    const { screenToFlowPosition } = useReactFlow();
    const createMatch = useReducer(reducers.matchCreate);
    const createCompetition = useReducer(reducers.competitionCreate);
    const createRegistration = useReducer(reducers.registrationCreate);
    const createLeaderboard = useReducer(reducers.leaderboardCreate);
    const createInput = useReducer(reducers.inputCreate);
    const createOutput = useReducer(reducers.outputCreate);
    const createServer = useReducer(reducers.serverCreate);

    const base = { parentId: competitionId, position: screenToFlowPosition({ x, y }), withTemplate: 0 };
    const node = { ...base, asTemplate: false };
    const creators = {
        Match: () => createMatch({ ...node, name: "New Match" }),
        Competition: () => createCompetition({ ...base, name: "New Competition" }),
        Registration: () => createRegistration({ ...node, name: "New Registration" }),
        Leaderboard: () => createLeaderboard({ ...node, name: "New Leaderboard" }),
        Input: () => createInput({ ...node, name: "New Input" }),
        Output: () => createOutput({ ...node, name: "New Output" }),
        Server: () => createServer({ ...node, name: "New Server" }),
    };

    const create = useServerAction(
        async (kind: keyof typeof creators) => creators[kind](),
        "Failed to create node",
    );

    return (
        <Card className="fixed z-50 p-1 gap-1" style={{ left: x, top: y }}>
            {(Object.keys(creators) as (keyof typeof creators)[]).map((kind) => (
                <Button
                    key={kind}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => { create(kind); onClose(); }}
                >
                    Add {kind}
                </Button>
            ))}
        </Card>
    );
}
