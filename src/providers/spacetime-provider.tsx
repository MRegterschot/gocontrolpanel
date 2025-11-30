"use client";

import { getDbConnectionBuilder } from '@/lib/spacetimedb/connection_builder';
import { StrictMode } from 'react';

import { SpacetimeDBProvider as BuiltinSpacetimeDbProvider } from "spacetimedb/react"



const SpacetimeDBProvider = ({ children }: { children: React.ReactNode }) => {
  return <StrictMode><BuiltinSpacetimeDbProvider connectionBuilder={getDbConnectionBuilder()}>{children}</BuiltinSpacetimeDbProvider></StrictMode>;
};

export default SpacetimeDBProvider;