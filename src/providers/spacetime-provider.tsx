"use client";  

import { useEffect } from 'react';  
import {
 getDbConnection,
 disconnectDbConnection
} from "@/lib/spacetimedb/connection";  

const SpacetimeDBProvider = ({ children }: { children: React.ReactNode }) => {  
  useEffect(() => {  
    getDbConnection();  

    return () => {  
      disconnectDbConnection();  
    };
  }, []);  

  // It doesn't need to render anything itself, just pass children through.  
  return <>{children}</>;  
};  

export default SpacetimeDBProvider;