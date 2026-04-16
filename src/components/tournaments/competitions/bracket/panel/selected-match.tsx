"use client";
import { Card } from "@/components/ui/card";
import { MatchNodeType } from "../nodes/match-node";
import { Button } from "@/components/ui/button";

interface SelectedMatchProps {
  match: MatchNodeType;
}

export default function SelectedMatchPanel({
  match,
}: SelectedMatchProps) {
  return (
    <Card className="p-2 gap-2">
      <h3 className="font-semibold">Match Details</h3>
      <p>Match ID: {match.id}</p>
      <p>Match Name: {match.data.label}</p>
      <Button variant="outline">
        Mark Configured
      </Button>
      <Button variant="outline">
        Update Config
      </Button>
      <Button variant="outline">
        Mark Ready
      </Button>
      <Button variant="outline">
        Start
      </Button>
    </Card>
  );
}
