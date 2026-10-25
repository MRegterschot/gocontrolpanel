"use client";

import { createApiKeyColumns } from "@/components/api-keys/api-key-columns";

// Admins revoke here; renaming stays with the key's server or group
export const createColumns = (refetch: () => void) =>
  createApiKeyColumns(refetch, {
    showTarget: true,
    canManage: () => ({ rename: false, revoke: true }),
  });

// For viewers without api-keys:revoke
export const createReadOnlyColumns = (refetch: () => void) =>
  createApiKeyColumns(refetch, {
    showTarget: true,
    canManage: () => ({ rename: false, revoke: false }),
  });
