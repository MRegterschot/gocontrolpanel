"use client";
import { Button } from "@/components/ui/button";
import { reducers } from "@/lib/tourney-manager";
import { useReducer } from "spacetimedb/react";
import { MatchNodeType } from "../nodes/match-node";

interface SelectedMatchProps {
  match: MatchNodeType;
  clearSelection: () => void;
}

export default function SelectedMatchPanel({
  match,
  clearSelection,
}: SelectedMatchProps) {
  const deleteMatch = useReducer(reducers.deleteMatch);

  const onDeleteMatch = () => {
    const matchId = parseInt(match.id, 10);
    deleteMatch({ matchId });
    clearSelection();
  };

  return (
    <div className="p-2 rounded-md shadow-md">
      <h3 className="font-semibold mb-2">Match Details</h3>
      <p>Match ID: {match.id}</p>
      <p>Match Name: {match.data.label}</p>
      <Button variant={"destructive"} onClick={onDeleteMatch}>
        Delete Match
      </Button>
    </div>
  );
}
