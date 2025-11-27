import { connectionStore } from "@/stores/connectionStore";
import { useSyncExternalStore } from "react";

export function useConnection() {
  return useSyncExternalStore(
    (callback) => connectionStore.subscribe(callback),
    () => connectionStore.getSnapshot(),
    () => connectionStore.getServerSnapshot(),
  );
}
