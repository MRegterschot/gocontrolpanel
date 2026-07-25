"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { LocalMapInfo } from "@/types/map";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { parseTmTags } from "tmtags";
import {
  SelectFolderSchema,
  SelectFolderSchemaType,
} from "./select-folder-schema";

export default function SelectFolderForm({
  localFolders,
  onSubmit,
}: {
  localFolders: Record<string, LocalMapInfo[]>;
  onSubmit: (selectedMaps: LocalMapInfo[]) => void;
}) {
  const form = useForm<SelectFolderSchemaType>({
    resolver: zodResolver(SelectFolderSchema),
    defaultValues: {
      folderPath: "",
    },
  });

  const handleSubmit = (data: SelectFolderSchemaType) => {
    const selectedMaps = localFolders[data.folderPath] || [];
    onSubmit(selectedMaps);
  };

  const mapsInSelectedFolder = useMemo(() => {
    const folderPath = form.watch("folderPath");
    return localFolders[folderPath] || [];
  }, [form.watch("folderPath"), localFolders]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormElement
          label="Select Folder"
          name="folderPath"
          type="select"
          className="w-full max-w-72 sm:max-w-92"
          options={Object.keys(localFolders).map((folderPath) => ({
            value: folderPath,
            label: folderPath,
          }))}
        />

        {mapsInSelectedFolder.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Maps in Selected Folder</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {mapsInSelectedFolder.map((map) => (
                <li
                  key={map.UId}
                  dangerouslySetInnerHTML={{
                    __html: parseTmTags(map.Name),
                  }}
                />
              ))}
            </ul>
          </div>
        )}

        <Button type="submit" className="w-full">
          Select Folder
        </Button>
      </form>
    </Form>
  );
}
