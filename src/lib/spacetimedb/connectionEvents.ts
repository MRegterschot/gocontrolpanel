import { Identity } from "spacetimedb";

export const connectionStatus = {  
  isConnected: false,  
  isSubscribed: false,  
  error: null as Error | null,  
  identity: null as Identity | null,  
};  

const listeners = new Set<() => void>();  
export const onConnectionChange = (callback: () => void) => {  
  listeners.add(callback);  
  return () => listeners.delete(callback);  
};  

export const notifyConnectionEstablished = () => {  
  listeners.forEach(callback => callback());  
};  
export const notifyConnectionDisconnected = () => {  
  listeners.forEach(callback => callback());  
};  
export const notifyConnectionError = () => {  
  listeners.forEach(callback => callback());  
};

export const cleanupConnectionListener = () => {  
  listeners.clear();  
}