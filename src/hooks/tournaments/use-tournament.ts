import { tournamentStore } from "@/stores/tournamentStore";
import { useSyncExternalStore } from "react";

export function useTournament(id: bigint) {
  return useSyncExternalStore(
    (callback) => tournamentStore.subscribe(callback),
    () => tournamentStore.getTournamentById(id),
    () => tournamentStore.getTournamentById(id),
  );
}
