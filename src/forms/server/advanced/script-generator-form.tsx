"use client";

import { createFileEntry } from "@/actions/filemanager";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { IconFileTextSpark, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ScriptGeneratorSchema,
  ScriptGeneratorSchemaType,
} from "./script-generator-schema";
import { ServerError } from "@/types/responses";

function getInputType(type: string) {
  switch (type) {
    case "string":
      return "text";
    case "number":
    case "int":
    case "float":
      return "number";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

function getDefaultValue(type: string) {
  switch (type) {
    case "string":
      return "";
    case "int":
    case "float":
      return 0;
    case "boolean":
      return false;
    default:
      return "";
  }
}

export default function ScriptGeneratorForm({
  serverId,
}: {
  serverId: string;
}) {
  const [newCustomSetting, setNewCustomSetting] = useState<string>("");
  const [newCustomSettingType, setNewCustomSettingType] = useState<
    "string" | "int" | "float" | "boolean"
  >("string");

  const form = useForm<ScriptGeneratorSchemaType>({
    resolver: zodResolver(ScriptGeneratorSchema),
    defaultValues: {
      scriptName: "",
      originalScriptName: "",
      settings: {},
      customSettings: {},
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
        content: generateScript(values.originalScriptName, {
          ...updatedSettings,
          ...Object.fromEntries(
            Object.entries(values.customSettings).map(([key, setting]) => [
              key,
              {
                value: setting.value,
                type: setting.type,
              },
            ]),
          ),
        }),
      });

      if (error) throw new ServerError(error, "CreateFileEntryError");

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

            <Separator />

            {/* Custom Settings */}
            <div className="flex flex-col gap-3 xl:max-w-[50%]">
              {Object.entries(form.getValues("customSettings")).map(
                ([settingName, settingValue]) => (
                  <FormElement
                    key={settingName}
                    name={`customSettings.${settingName}.value`}
                    label={settingName}
                    type={getInputType(settingValue.type)}
                    placeholder={settingName
                      .slice(2)
                      .split(/(?=[A-Z])/)
                      .join(" ")
                      .replace(/^\w/, (c) => c.toUpperCase())
                      .replace(/_/g, "")}
                    className={
                      settingValue.type === "int" ||
                      settingValue.type === "float"
                        ? "w-26"
                        : "sm:w-2/3 xl:max-w-[calc(100%-192px)] min-w-48"
                    }
                    rootClassName="max-w-full"
                    onClear={() => {
                      const settings = form.getValues("customSettings");
                      const { [settingName]: _, ...rest } = settings;

                      form.unregister(`customSettings.${settingName}`);
                      form.setValue("customSettings", rest);
                    }}
                  />
                ),
              )}

              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="S_CustomSetting"
                  className="max-w-92"
                  value={newCustomSetting}
                  onChange={(e) => setNewCustomSetting(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCustomSetting.trim()) {
                      e.preventDefault();
                      form.setValue(
                        `customSettings.${newCustomSetting.trim()}`,
                        {
                          value: getDefaultValue(newCustomSettingType),
                          type: newCustomSettingType,
                        },
                      );
                      setNewCustomSetting("");
                    }
                  }}
                />

                <Select
                  value={newCustomSettingType}
                  onValueChange={(value) =>
                    setNewCustomSettingType(
                      value as "string" | "int" | "float" | "boolean",
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="int">Integer</SelectItem>
                    <SelectItem value="float">Float</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  collapse="sm"
                  variant="outline"
                  onClick={() => {
                    if (newCustomSetting.trim()) {
                      form.setValue(
                        `customSettings.${newCustomSetting.trim()}`,
                        {
                          value: getDefaultValue(newCustomSettingType),
                          type: newCustomSettingType,
                        },
                      );
                      setNewCustomSetting("");
                    }
                  }}
                >
                  <IconPlus />
                  Add Custom Setting
                </Button>
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
