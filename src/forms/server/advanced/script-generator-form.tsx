"use client";

import { createFileEntry } from "@/actions/filemanager";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  gameModesScripts,
  generateScript,
  getDefaultSetting,
  getGameModeWithScriptSettings,
  getUpdatedSettingsForGameMode,
} from "@/lib/scripts";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconFileTextSpark } from "@tabler/icons-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ScriptGeneratorSchema,
  ScriptGeneratorSchemaType,
} from "./script-generator-schema";

function getInputType(type: "string" | "int" | "boolean" | "float") {
  switch (type) {
    case "string":
      return "text";
    case "int":
    case "float":
      return "number";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

export default function ScriptGeneratorForm({
  serverId,
}: {
  serverId: string;
}) {
  const form = useForm<ScriptGeneratorSchemaType>({
    resolver: zodResolver(ScriptGeneratorSchema),
    defaultValues: {
      scriptName: "",
      originalScriptName: "",
      settings: {},
    },
  });

  const originalScriptName = useWatch({
    control: form.control,
    name: "originalScriptName",
  });

  const selectedScriptSettings = useMemo(() => {
    const gameMode = getGameModeWithScriptSettings(originalScriptName);

    if (!originalScriptName || !gameMode) {
      return {};
    }

    form.setValue(
      "settings",
      Object.fromEntries(
        Object.entries(gameMode.scriptSettings).map(
          ([settingName, setting]) => [settingName, setting.value],
        ),
      ),
    );

    return gameMode.scriptSettings;
  }, [originalScriptName, getGameModeWithScriptSettings]);

  const onSubmit = async (values: ScriptGeneratorSchemaType) => {
    const updatedSettings = getUpdatedSettingsForGameMode(
      values.originalScriptName,
      values.settings,
    );

    const scriptName = values.scriptName.trim().endsWith(".Script.txt")
      ? values.scriptName.trim()
      : `${values.scriptName.trim()}.Script.txt`;

    try {
      const { error } = await createFileEntry(serverId, {
        path: `Scripts/Modes/${scriptName}`,
        isDir: false,
        content: generateScript(values.originalScriptName, updatedSettings),
      });

      if (error) throw new Error(error);

      toast.success("Script generated successfully");
    } catch (error) {
      toast.error("Error generating script", {
        description: getErrorMessage(error),
      });
    }
  };

  const middleIndex = Math.ceil(Object.keys(selectedScriptSettings).length / 2);
  const leftSettings = Object.entries(selectedScriptSettings).slice(
    0,
    middleIndex,
  );
  const rightSettings = Object.entries(selectedScriptSettings).slice(
    middleIndex,
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Script Generator</h1>
          <h4 className="text-muted-foreground">
            Generate a script with the desired settings.
          </h4>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          <FormElement
            name="scriptName"
            label="Script Name"
            type="text"
            placeholder="Enter the script name"
            className="sm:w-92"
            isRequired
          />

          <FormElement
            name="originalScriptName"
            label="Original Script Name"
            type="select"
            placeholder="Select the original script name"
            className="w-64 sm:w-fit"
            options={gameModesScripts.map((scriptName) => ({
              value: scriptName,
              label: scriptName,
            }))}
            isRequired
          />
        </div>

        {originalScriptName && (
          <div className="flex flex-col gap-6">
            <Separator />

            <h2 className="text-xl font-bold">Settings</h2>

            <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex flex-col gap-3 flex-1">
                {leftSettings.map(([settingName, setting]) => (
                  <FormElement
                    key={settingName}
                    name={`settings.${settingName}`}
                    label={settingName}
                    type={getInputType(setting.type)}
                    placeholder={settingName
                      .slice(2)
                      .split(/(?=[A-Z])/)
                      .join(" ")
                      .replace(/^\w/, (c) => c.toUpperCase())
                      .replace(/_/g, "")}
                    className={
                      setting.type === "int" || setting.type === "float"
                        ? "w-26"
                        : "sm:w-2/3 xl:max-w-[calc(100%-192px)] min-w-48"
                    }
                    rootClassName="max-w-full"
                    onClear={() =>
                      form.setValue(
                        `settings.${settingName}`,
                        getDefaultSetting(originalScriptName, settingName),
                      )
                    }
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {rightSettings.map(([settingName, setting]) => (
                  <FormElement
                    key={settingName}
                    name={`settings.${settingName}`}
                    label={settingName}
                    type={getInputType(setting.type)}
                    placeholder={settingName
                      .slice(2)
                      .split(/(?=[A-Z])/)
                      .join(" ")
                      .replace(/^\w/, (c) => c.toUpperCase())
                      .replace(/_/g, "")}
                    className={
                      setting.type === "int" || setting.type === "float"
                        ? "w-26"
                        : "sm:w-2/3 xl:max-w-[calc(100%-192px)] min-w-48"
                    }
                    rootClassName="max-w-full"
                    onClear={() =>
                      form.setValue(
                        `settings.${settingName}`,
                        getDefaultSetting(originalScriptName, settingName),
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <Button type="submit" className="max-w-fit">
          <IconFileTextSpark />
          Generate Script
        </Button>
      </form>
    </Form>
  );
}
