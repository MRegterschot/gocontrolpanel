"use client";

import { createFileEntry } from "@/actions/filemanager";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { FileEntry } from "@/types/filemanager";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CreateFileEntrySchema,
  CreateFileEntrySchemaType,
} from "./create-file-entry-schema";

export default function CreateFileEntryForm({
  serverId,
  path,
  isDir = false,
  callback,
}: {
  serverId: string;
  path: string;
  isDir?: boolean;
  callback?: (fileEntry: FileEntry) => void;
}) {
  const form = useForm<CreateFileEntrySchemaType>({
    resolver: zodResolver(CreateFileEntrySchema),
    defaultValues: {
      path: "",
      isDir,
      content: "",
    },
  });

  async function onSubmit(values: CreateFileEntrySchemaType) {
    try {
      values.path = path + "/" + values.path;
      const { ok, data, error } = await createFileEntry(serverId, values);
      if (!ok) {
        throw new ServerError(error, "CreateFileEntryError");
      }

      toast.success("File entry successfully created");
      if (callback) {
        callback(data);
      }
    } catch (error) {
      toast.error("Failed to create file entry", {
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
          name={"path"}
          label="Name"
          description={
            isDir ? "The name of the directory." : "The name of the file."
          }
          placeholder={isDir ? "Enter directory name" : "Enter file name"}
          isRequired
          autoFocus
        />

        {!isDir && (
          <FormElement
            name={"content"}
            label="Content"
            description="The content of the file."
            placeholder="Enter file content"
            isRequired
            type="textarea"
          />
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          {isDir ? "Create Directory" : "Create File"}
        </Button>
      </form>
    </Form>
  );
}
