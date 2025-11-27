"use client";

import { searchMappacks } from "@/actions/tmx/mappacks";
import { getErrorMessage } from "@/lib/utils";
import { TMXMappack } from "@/types/api/tmx";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import TMXMappackCard from "./tmx-mappack-card";

export default function MappackSearch({
  serverId,
  fmHealth,
  defaultResults = [],
  defaultHasMore = false,
}: {
  serverId: string;
  fmHealth: boolean;
  defaultResults?: TMXMappack[];
  defaultHasMore?: boolean;
}) {
  const [nameQuery, setNameQuery] = useState("");

  const [searchResults, setSearchResults] =
    useState<TMXMappack[]>(defaultResults);
  const [hasMoreResults, setHasMoreResults] = useState(defaultHasMore);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (more?: boolean) => {
    setLoading(true);

    try {
      const params: Record<string, string> = {
        name: nameQuery,
      };

      if (more) {
        params.after =
          searchResults[searchResults.length - 1]?.MappackId.toString();
      }

      const { data, error } = await searchMappacks(serverId, params);
      if (error) {
        throw new Error(error);
      }

      setError(null);
      setSearchResults(
        more ? [...searchResults, ...data.Results] : data.Results,
      );
      setHasMoreResults(data.More);
    } catch (err) {
      setError("Failed to search mappacks: " + getErrorMessage(err));
      toast.error("Failed to search mappacks", {
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-end">
        <Input
          type="text"
          placeholder="Search mappack name..."
          className="max-w-48"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <Button onClick={() => onSearch()} disabled={loading}>
          <IconSearch />
          Search
        </Button>
      </div>

      {error && <span>{error}</span>}

      {searchResults.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
            {searchResults.map((mappack, index) => (
              <TMXMappackCard
                key={index}
                serverId={serverId}
                mappack={mappack}
                fmHealth={fmHealth}
              />
            ))}
          </div>

          {hasMoreResults && (
            <Button
              className="max-w-32 mx-auto"
              onClick={() => onSearch(true)}
              disabled={loading}
              variant={"outline"}
            >
              Load More
            </Button>
          )}
        </div>
      ) : loading ? (
        <span>Loading...</span>
      ) : (
        <span>No results found</span>
      )}
    </div>
  );
}
