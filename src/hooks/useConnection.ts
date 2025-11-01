import { useSyncExternalStore } from "react";  
import { connectionStore } from "@/stores/connectionStore";  

export function useConnection() {  
  const connection = useSyncExternalStore(  
    (callback) => connectionStore.subscribe(callback),  
    () => connectionStore.getSnapshot(),  
    () => connectionStore.getServerSnapshot()  
  );  
  return connection;  
}