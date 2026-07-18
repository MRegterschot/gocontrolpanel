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
  getGameModeByScript,
  getNormalizedSetting,
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

function getInputType(type: string) {
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
    const gameMode = getGameModeByScript(originalScriptName);

    if (!originalScriptName || !gameMode) {
      return [];
    }

    form.setValue(
      "settings",
      Object.fromEntries(
        gameMode.ParamDescs.map((setting) => {
          return [
            setting.Name,
            getNormalizedSetting(setting.Default, setting.Type),
          ];
        }),
      ),
    );

    return gameMode.ParamDescs;
  }, [originalScriptName, getGameModeByScript, form]);

  const descriptions = useMemo(() => {
    const gameMode = getGameModeByScript(originalScriptName);

    if (!originalScriptName || !gameMode) {
      return {};
    }

    return gameMode.ParamDescs.reduce(
      (acc, desc) => {
        if (desc.Desc !== "<hidden>") acc[desc.Name] = desc.Desc;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [originalScriptName, getGameModeByScript]);

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

  const middleIndex = Math.ceil(selectedScriptSettings.length / 2);
  const leftSettings = selectedScriptSettings.slice(0, middleIndex);
  const rightSettings = selectedScriptSettings.slice(middleIndex);

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
                {leftSettings.map((setting) => (
                  <FormElement
                    key={setting.Name}
                    name={`settings.${setting.Name}`}
                    label={setting.Name}
                    type={getInputType(setting.Type)}
                    description={descriptions[setting.Name]}
                    placeholder={setting.Name.slice(2)
                      .split(/(?=[A-Z])/)
                      .join(" ")
                      .replace(/^\w/, (c) => c.toUpperCase())
                      .replace(/_/g, "")}
                    className={
                      setting.Type === "int" || setting.Type === "float"
                        ? "w-26"
                        : "sm:w-2/3 xl:max-w-[calc(100%-192px)] min-w-48"
                    }
                    rootClassName="max-w-full"
                    onClear={() =>
                      form.setValue(
                        `settings.${setting.Name}`,
                        getDefaultSetting(originalScriptName, setting.Name),
                      )
                    }
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {rightSettings.map((setting) => (
                  <FormElement
                    key={setting.Name}
                    name={`settings.${setting.Name}`}
                    label={setting.Name}
                    description={descriptions[setting.Name]}
                    type={getInputType(setting.Type)}
                    placeholder={setting.Name.slice(2)
                      .split(/(?=[A-Z])/)
                      .join(" ")
                      .replace(/^\w/, (c) => c.toUpperCase())
                      .replace(/_/g, "")}
                    className={
                      setting.Type === "int" || setting.Type === "float"
                        ? "w-26"
                        : "sm:w-2/3 xl:max-w-[calc(100%-192px)] min-w-48"
                    }
                    rootClassName="max-w-full"
                    onClear={() =>
                      form.setValue(
                        `settings.${setting.Name}`,
                        getDefaultSetting(originalScriptName, setting.Name),
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
