import { getClub, getClubMembersCount } from "@/actions/nadeo/clubs";
import ClubActivities from "@/components/nadeo/clubs/club-activities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  IconArrowLeft,
  IconPhoto,
  IconRosetteDiscountCheck,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { parseTmTags } from "tmtags";
import Clubs from "../clubs/clubs";

export default async function ClubsTab({
  serverId,
  fmHealth,
  clubId,
}: {
  serverId: string;
  fmHealth: boolean;
  clubId?: number;
}) {
  if (clubId) {
    const { data: club, error } = await getClub(clubId);
    const { data: clubMembersCount, error: clubMembersError } =
      await getClubMembersCount(clubId);

    if (error) {
      return <span>{error}</span>;
    }

    if (clubMembersError) {
      return <span>{clubMembersError}</span>;
    }

    const createdAt = new Date(club.creationTimestamp * 1000);
    const updatedAt = new Date(club.editionTimestamp * 1000);

    if (!club) {
      return <span>Club not found</span>;
    }

    return (
      <>
        <Link href={`/server/${serverId}/nadeo?page=clubs`}>
          <Button variant={"outline"}>
            <IconArrowLeft />
            Back
          </Button>
        </Link>

        <div className="flex flex-col gap-4">
          <Card className="p-4 flex flex-col gap-4">
            <div className="flex gap-4 flex-col lg:flex-row">
              {club.iconUrl ? (
                <Image
                  src={club.iconUrl}
                  fill
                  alt={club.name}
                  className="static! rounded-lg max-w-92 object-cover"
                />
              ) : (
                <div className="w-full rounded-lg flex items-center justify-center max-w-92">
                  <IconPhoto className="text-gray-500" size={48} />
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <h2
                      className="text-xl font-bold truncate"
                      dangerouslySetInnerHTML={{
                        __html: parseTmTags(club.name),
                      }}
                    ></h2>

                    {club.verified && <IconRosetteDiscountCheck />}

                    {club.tag && (
                      <Badge
                        variant={"secondary"}
                        className="text-md"
                        dangerouslySetInnerHTML={{
                          __html: parseTmTags(club.tag),
                        }}
                      ></Badge>
                    )}
                  </div>

                  {club.description.trim() && (
                    <p
                      dangerouslySetInnerHTML={{
                        __html: parseTmTags(club.description.trim()),
                      }}
                    ></p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-128">
                  <div className="flex flex-col">
                    <span className="font-semibold">Author</span>
                    <span className="truncate">{club.authorName}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Latest Editor</span>
                    <span className="truncate">{club.latestEditorName}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Members</span>
                    <span className="truncate">{clubMembersCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Created At</span>
                    <span className="truncate">
                      {createdAt.toLocaleDateString()}{" "}
                      {createdAt.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Updated At</span>
                    <span className="truncate">
                      {updatedAt.toLocaleDateString()}{" "}
                      {updatedAt.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <ClubActivities
            serverId={serverId}
            fmHealth={fmHealth}
            clubId={clubId}
          />
        </div>
      </>
    );
  } else {
    return <Clubs serverId={serverId} />;
  }
}
