import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import {
  getUsersByIds,
  getUsersByLogins,
  searchUser,
} from "@/lib/api-client/database";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import type { UserMinimal } from "@/services/database/users";
import { ServerError } from "@/types/responses";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface UseSearchUsersProps {
  defaultUsers?: string[];
  field?: "id" | "login";
}

export function useSearchUsers({
  defaultUsers,
  field = "id",
}: UseSearchUsersProps) {
  // What the user searched for, on top of the users the form started with
  const [searched, setSearched] = useState<UserMinimal[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasDefaults = !!defaultUsers && defaultUsers.length > 0;
  const defaultsQuery = useQuery({
    queryKey: queryKeys.users(field, defaultUsers ?? []),
    queryFn: () =>
      unwrap(
        field === "id"
          ? getUsersByIds(defaultUsers!)
          : getUsersByLogins(defaultUsers!),
        "GetDefaultUsersError",
      ),
    enabled: hasDefaults,
    // The form owns the list from here on; don't swap it under the user
    staleTime: Infinity,
    gcTime: 0,
  });
  const loading = hasDefaults && defaultsQuery.isPending;
  const error =
    searchError ??
    (defaultsQuery.error
      ? "Failed to fetch users: " + getErrorMessage(defaultsQuery.error)
      : null);
  useQueryErrorToast(defaultsQuery.error, "Failed to fetch users");

  const searchResults = useMemo(() => {
    const merged = [...(defaultsQuery.data ?? [])];
    for (const user of searched) {
      if (!merged.some((u) => u.id === user.id)) merged.push(user);
    }
    return merged;
  }, [defaultsQuery.data, searched]);

  async function search(query?: string) {
    if (!query?.trim()) {
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await searchUser(query);
      if (error) {
        throw new ServerError(error, "SearchUserError");
      }
      if (!data) return;

      setSearched((prev) =>
        prev.some((user) => user.id === data.id) ? prev : [...prev, data],
      );
    } catch (error) {
      setSearchError("Failed to search users: " + getErrorMessage(error));
      toast.error("Failed to search users", {
        description: getErrorMessage(error),
      });
    } finally {
      setSearching(false);
    }
  }

  return {
    search,
    searchResults,
    searching,
    loading,
    error,
  };
}
