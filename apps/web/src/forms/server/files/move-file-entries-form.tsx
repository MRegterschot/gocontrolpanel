"use client";

import { moveFileEntries } from "@/actions/filemanager";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage, removePrefix } from "@/lib/utils";
import { FileEntry } from "@/types/filemanager";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowsMove } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  MoveFileEntriesFormSchema,
  MoveFileEntriesFormSchemaType,
} from "./move-file-entries-schema";

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export default function MoveFileEntriesForm({
  serverId,
  items,
  callback,
}: {
  serverId: string;
  items: FileEntry[];
  callback?: (moved: FileEntry[]) => void;
}) {
  const single = items.length === 1;

  const form = useForm<MoveFileEntriesFormSchemaType>({
    resolver: zodResolver(MoveFileEntriesFormSchema),
    defaultValues: {
      destination: single
        ? trimSlashes(removePrefix(items[0].path, "/UserData"))
        : "",
    },
  });

  async function onSubmit(values: MoveFileEntriesFormSchemaType) {
    try {
      const destination = trimSlashes(values.destination);
      const { data, error } = await moveFileEntries(serverId, {
        items: items.map((item) => ({
          from: item.path,
          to: single
            ? `/UserData/${destination}`
            : `/UserData/${destination}/${item.name}`.replace(/\/+/g, "/"),
        })),
      });
      if (error) {
        throw new ServerError(error, "MoveFileEntriesError");
      }

      toast.success("Items moved", {
        description: `${items.length} item(s) successfully moved.`,
      });
      callback?.(data);
    } catch (error) {
      toast.error("Failed to move items", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="destination"
          label={single ? "New path" : "Destination folder"}
          description={
            single
              ? "Change the name to rename, or the folder to move. Missing folders are created."
              : "The folder to move the selected items into. Use / for the root folder."
          }
          placeholder={single ? "Maps/NewName.Map.Gbx" : "Maps/Archive"}
          isRequired
          autoFocus
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          <IconArrowsMove />
          {single ? "Move / Rename" : "Move"}
        </Button>
      </form>
    </Form>
  );
}
