import { tournamentStore } from "@/stores/tournamentStore";
import { useSyncExternalStore } from "react";

export function useTournaments() {
  return useSyncExternalStore(
    (callback) => tournamentStore.subscribe(callback),
    () => tournamentStore.getSnapshot(),
    () => tournamentStore.getServerSnapshot(),
  );
}
