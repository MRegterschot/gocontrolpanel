import { queryKeys } from "@/lib/api-client/query";
import type { QueryClient } from "@tanstack/react-query";

const MICROS_PER_CENT = 10_000;

export const centsToDollars = (cents: number | null): number | "" =>
  cents === null ? "" : cents / 100;

export const dollarsToCents = (
  dollars: number | "" | undefined,
): number | null =>
  dollars === "" || dollars === undefined || Number.isNaN(dollars)
    ? null
    : Math.round(dollars * 100);

export const formatCents = (cents: number | null): string =>
  cents === null ? "No limit" : `$${(cents / 100).toFixed(2)}`;

export const formatMicros = (micros: number): string =>
  `$${(micros / MICROS_PER_CENT / 100).toFixed(2)}`;

// Rules and settings change every access answer
export const invalidateCodriverPanel = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.codriverPanel }),
    queryClient.invalidateQueries({ queryKey: ["codriver", "access"] }),
  ]);
