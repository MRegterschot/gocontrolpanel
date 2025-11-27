import { tournamentStore } from "@/stores/tournamentStore";
import { useSyncExternalStore } from "react";

export function useTournaments() {
  const tournaments = useSyncExternalStore(
    (callback) => tournamentStore.subscribe(callback),
    () => tournamentStore.getSnapshot(),
    () => tournamentStore.getServerSnapshot()
  );
  return tournaments;
}