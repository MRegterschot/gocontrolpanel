import {getDbConnection} from '@/lib/spacetimedb/connection';
import {onSubscriptionChange} from "@/lib/spacetimedb/subscriptionEvents";
import { DbConnection, Tournament } from 'tm-tourney-manager-api-ts';

class TournamentStore {
  private listeners: Set<() => void> = new Set();
  private connection: DbConnection | null = null;
  private cachedSnapshot: Tournament[] = [];
  private serverSnapshot: Tournament[] = [];

  constructor() {
    onSubscriptionChange(() => {
      this.updateSnapshot();
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
    try {
      this.getConnection();
      return this.cachedSnapshot;
    } catch (error) {
      const isNotSSR = typeof window !== 'undefined';  
      if(isNotSSR) { 
        // This would be an unexpected error on the client-side
        console.error('Unexpected error while obtaining snapshot:', error);  
      }
      return this.serverSnapshot;  
    }
  }

  public getServerSnapshot() {
    // Return the same reference to prevent unnecessary SSR re-renders
    return this.serverSnapshot;
  }

  public createTournament(name: string){
    if (this.connection) {
      this.connection.reducers.createTournament(name);
    }
  }

  private getConnection(): DbConnection {
    if (!this.connection) {
      this.connection = getDbConnection();
      this.connection.db.tournament.onInsert((ctx, row) => this.updateSnapshot());
      this.connection.db.tournament.onDelete((ctx, row) => this.updateSnapshot());
    }
    return this.connection;
  }

  private updateSnapshot() {
    if (this.connection) {
      this.cachedSnapshot = Array.from(this.connection.db.tournament.iter());
      this.emitChange();
    }
  }

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const tournamentStore = new TournamentStore();