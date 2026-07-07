"use client";

import { loadMatchSettings, saveMatchSettings } from "@/actions/gbx/game";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconFileSettings } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MatchSettingsSchema, MatchSettingsSchemaType } from "./game-schema";

export default function MatchSettingsForm({
  serverId,
  matchSettings,
}: {
  serverId: string;
  matchSettings: string[];
}) {
  const matchSettingsForm = useForm<MatchSettingsSchemaType>({
    resolver: zodResolver(MatchSettingsSchema),
    defaultValues: {
      filename: "",
    },
  });

  async function onLoadMatchSettings() {
    try {
      matchSettingsForm.trigger("filename");
      const filename = matchSettingsForm.getValues("filename");
      const { error } = await loadMatchSettings(
        serverId,
        "MatchSettings/" + filename,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Match settings successfully loaded");
    } catch (error) {
      toast.error("Failed to load match settings", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onSaveMatchSettings() {
    try {
      matchSettingsForm.trigger("filename");
      const filename = matchSettingsForm.getValues("filename");
      const { error } = await saveMatchSettings(
        serverId,
        "MatchSettings/" + filename,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Match settings saved successfully");
    } catch (error) {
      toast.error("Failed to save match settings", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...matchSettingsForm}>
      <form className="flex flex-col gap-2">
        <FormElement
          name={"filename"}
          label="Match Settings"
          description="The name of the file to load/save match settings."
          placeholder="matchlist.txt"
          className="sm:w-1/3 xl:w-2/3 xl:max-w-[calc(100%-192px)]"
          rootClassName="max-w-full"
          type="filter"
          options={matchSettings.map((filename) => ({
            label: filename,
            value: filename,
          }))}
          isRequired
        >
          <div className="gap-2 flex">
            <Button
              type="button"
              variant={"outline"}
              collapse="sm"
              onClick={onLoadMatchSettings}
            >
              <IconFileSettings />
              Load
            </Button>
            <Button type="button" collapse="sm" onClick={onSaveMatchSettings}>
              <IconDeviceFloppy />
              Save
            </Button>
          </div>
        </FormElement>
      </form>
    </Form>
  );
}
