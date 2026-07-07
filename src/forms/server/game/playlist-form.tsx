"use client";

import { appendPlaylist, insertPlaylist } from "@/actions/gbx/game";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconLayoutDistributeHorizontal,
  IconPlaylistAdd,
} from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PlaylistSchema, PlaylistSchemaType } from "./game-schema";

export default function PlaylistForm({ serverId }: { serverId: string }) {
  const playlistForm = useForm<PlaylistSchemaType>({
    resolver: zodResolver(PlaylistSchema),
    defaultValues: {
      filename: "",
    },
  });

  async function onAppendPlaylist() {
    try {
      playlistForm.trigger("filename");
      const filename = playlistForm.getValues("filename");
      const { error } = await appendPlaylist(serverId, filename);
      if (error) {
        throw new Error(error);
      }
      toast.success("Playlist successfully appended");
    } catch (error) {
      toast.error("Failed to append playlist", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onInsertPlaylist() {
    try {
      playlistForm.trigger("filename");
      const filename = playlistForm.getValues("filename");
      const { error } = await insertPlaylist(serverId, filename);
      if (error) {
        throw new Error(error);
      }
      toast.success("Playlist successfully inserted");
    } catch (error) {
      toast.error("Failed to insert playlist", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...playlistForm}>
      <form className="flex flex-col gap-2">
        <FormElement
          name={"filename"}
          label="Playlist"
          description="The name of the file to append/insert playlist."
          placeholder="playlist.txt"
          className="w-full sm:w-1/3 xl:w-2/3 xl:max-w-[calc(100%-192px)]"
          rootClassName="max-w-full"
          isRequired
        >
          <div className="gap-2 flex">
            <Button
              type="button"
              variant={"outline"}
              collapse="sm"
              onClick={onAppendPlaylist}
            >
              <IconPlaylistAdd />
              Append
            </Button>
            <Button type="button" collapse="sm" onClick={onInsertPlaylist}>
              <IconLayoutDistributeHorizontal />
              Insert
            </Button>
          </div>
        </FormElement>
      </form>
    </Form>
  );
}
