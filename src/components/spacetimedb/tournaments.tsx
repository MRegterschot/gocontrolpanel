"use client";

import { useConnection } from "@/hooks/useConnection";
import { useTournaments } from "@/hooks/useTournaments";
import { tournamentStore } from "@/stores/tournamentStore";

export default function MessageList() {
  const connection = useConnection();
  const allTournaments = useTournaments();

  if (connection.error) return <div>Error: {connection.error.message}</div>;

  if (!connection.isConnected || !connection.isSubscribed)
    return <div>Not connected</div>;

  return (
    <div>
      <h1>Tournament</h1>
      {allTournaments.map((tournament, i) => (
        <div key={i}>{tournament.name}</div>
      ))}
      <button
        onClick={() =>
          tournamentStore.createTournament(
            "Tournament " + (allTournaments.length + 1),
          )
        }
      >
        Create Tournament
      </button>
    </div>
  );
}
