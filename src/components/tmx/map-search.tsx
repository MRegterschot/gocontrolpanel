"use client";

import { searchMaps } from "@/actions/tmx/maps";
import { getErrorMessage } from "@/lib/utils";
import { TMXMap } from "@/types/api/tmx";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import TMXMapCard from "./tmx-map-card";

export default function MapSearch({
  serverId,
  fmHealth,
  defaultResults = [],
  defaultHasMore = false,
}: {
  serverId: string;
  fmHealth: boolean;
  defaultResults?: TMXMap[];
  defaultHasMore?: boolean;
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");

  const [searchResults, setSearchResults] = useState<TMXMap[]>(defaultResults);
  const [hasMoreResults, setHasMoreResults] = useState(defaultHasMore);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (more?: boolean) => {
    setLoading(true);

    try {
      const params: Record<string, string> = {
        name: nameQuery,
      };

      if (authorQuery) {
        params.author = authorQuery;
      }

      if (more) {
        params.after =
          searchResults[searchResults.length - 1]?.MapId.toString();
      }

      const { data, error } = await searchMaps(serverId, params);
      if (error) {
        throw new Error(error);
      }

      setError(null);
      setSearchResults(
        more ? [...searchResults, ...data.Results] : data.Results,
      );
      setHasMoreResults(data.More);
    } catch (err) {
      setError("Failed to search maps: " + getErrorMessage(err));
      toast.error("Failed to search maps", {
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
          placeholder="Search map name..."
          className="max-w-48"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <Input
          type="text"
          placeholder="Search author..."
          value={authorQuery}
          className="max-w-48"
          onChange={(e) => setAuthorQuery(e.target.value)}
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
            {searchResults.map((map, index) => (
              <TMXMapCard
                key={index}
                serverId={serverId}
                map={map}
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
