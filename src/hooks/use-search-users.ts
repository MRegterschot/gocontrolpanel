import {
  getUsersByIds,
  getUsersByLogins,
  searchUser,
  UserMinimal,
} from "@/actions/database/users";
import { getErrorMessage } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UseSearchUsersProps {
  defaultUsers?: string[];
  field?: "id" | "login";
}

export function useSearchUsers({
  defaultUsers,
  field = "id",
}: UseSearchUsersProps) {
  const [searchResults, setSearchResults] = useState<UserMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getDefaultUsers() {
      if (!defaultUsers || defaultUsers.length === 0) {
        setLoading(false);
        return;
      }

      try {
        let data, error;

        if (field === "id") {
          ({ data, error } = await getUsersByIds(defaultUsers));
        } else if (field === "login") {
          ({ data, error } = await getUsersByLogins(defaultUsers));
        } else {
          throw new Error("Invalid field for user search");
        }

        if (error) {
          throw new Error(error);
        }
        setSearchResults(data);
      } catch (error) {
        setError("Failed to fetch users: " + getErrorMessage(error));
        toast.error("Failed to fetch users", {
          description: getErrorMessage(error),
        });
      } finally {
        setLoading(false);
      }
    }

    getDefaultUsers();
  }, []);

  async function search(query?: string) {
    if (!query?.trim()) {
      setSearching(false);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const { data, error } = await searchUser(query);
      if (error) {
        throw new Error(error);
      }
      if (!data) return;

      setSearchResults((prev) => {
        if (prev.some((user) => user.id === data.id)) {
          return prev;
        }
        return [...prev, data];
      });
    } catch (error) {
      setError("Failed to search users: " + getErrorMessage(error));
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
