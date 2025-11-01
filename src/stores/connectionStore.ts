import {
 connectionStatus, 
 onConnectionChange
} from "@/lib/spacetimedb/connectionEvents";  
import { DbConnection } from "tm-tourney-manager-api-ts";

class ConnectionStore {  
  private listeners: Set<() => void> = new Set();  
  private connection: DbConnection | null = null;  

  constructor() {  
    onConnectionChange(() => {  
      this.emitChange();  
    });  
  }  

  public subscribe(onStoreChange: () => void) {  
    this.listeners.add(onStoreChange);  
    return () => {  
      // Cleanup on unmount  
      this.listeners.delete(onStoreChange);  
    };  
  }  

  public getSnapshot() {  
    return connectionStatus;  
  }  

  public getServerSnapshot() {  
    return connectionStatus;  
  }  

  private emitChange() {  
    for (const listener of this.listeners) {  
      listener();  
    }  
  }  
}  

export const connectionStore = new ConnectionStore();