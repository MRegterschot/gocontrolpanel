"use client";

import { setModeScriptSettings } from "@/actions/gbx/game";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { ModeScriptInfo } from "@/types/gbx";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ModeScriptSettingsSchema,
  ModeScriptSettingsSchemaType,
} from "./game-schema";

export default function ModeScriptSettingsForm({
  serverId,
  modeScriptSettings,
  modeScriptInfo,
}: {
  serverId: string;
  modeScriptSettings: Record<string, unknown>;
  modeScriptInfo: ModeScriptInfo;
}) {
  const modeScriptSettingsForm = useForm<ModeScriptSettingsSchemaType>({
    resolver: zodResolver(ModeScriptSettingsSchema),
    defaultValues: modeScriptSettings as ModeScriptSettingsSchemaType,
  });

  const onSubmitModeScriptSettings = useCallback(
    async (values: ModeScriptSettingsSchemaType) => {
      try {
        const parsedValues = Object.fromEntries(
          Object.entries(values).map(([key, value]) => {
            const desc = modeScriptInfo.ParamDescs.find((d) => d.Name === key);
            if (!desc) return [key, value];

            if (desc.Type === "boolean") {
              return [key, Boolean(value)];
            } else if (desc.Type === "int") {
              return [key, Number(value)];
            }
            return [key, value];
          }),
        );

        const { error } = await setModeScriptSettings(serverId, parsedValues);
        if (error) {
          throw new Error(error);
        }
        toast.success("Mode Script Settings successfully updated");
      } catch (error) {
        toast.error("Failed to update Mode Script Settings", {
          description: getErrorMessage(error),
        });
      }
    },
    [serverId],
  );

  const descriptions = useMemo(() => {
    return modeScriptInfo.ParamDescs.reduce(
      (acc, desc) => {
        if (desc.Desc !== "<hidden>") acc[desc.Name] = desc.Desc;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [modeScriptInfo.ParamDescs]);

  const formElements = useMemo(() => {
    return Object.entries(modeScriptSettingsForm.getValues()).map(
      ([key, value]) => {
        return {
          key,
          value,
          label: key,
          description: descriptions[key] || "",
          placeholder: key
            .slice(2)
            .split(/(?=[A-Z])/)
            .join(" ")
            .replace(/^\w/, (c) => c.toUpperCase())
            .replace(/_/g, ""),
          type:
            typeof value === "boolean"
              ? "checkbox"
              : typeof value === "number"
                ? "number"
                : "text",
          className:
            typeof value === "number"
              ? "w-26"
              : "sm:w-2/3 xl:max-w-[calc(100%-192px)] min-w-48",
        };
      },
    );
  }, [modeScriptSettingsForm, descriptions]);

  const middleIndex = Math.ceil(formElements.length / 2);
  const leftElements = formElements.slice(0, middleIndex);
  const rightElements = formElements.slice(middleIndex);

  return (
    <Form {...modeScriptSettingsForm}>
      <form
        className="flex flex-col gap-4"
        onSubmit={modeScriptSettingsForm.handleSubmit(
          onSubmitModeScriptSettings,
        )}
      >
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex flex-col gap-3 flex-1">
            {leftElements.map(({ key, ...element }) => (
              <FormElement
                key={key}
                name={key as never}
                label={element.label}
                description={element.description}
                placeholder={element.placeholder}
                className={element.className}
                type={element.type}
                rootClassName="max-w-full"
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 flex-1">
            {rightElements.map(({ key, ...element }) => (
              <FormElement
                key={key}
                name={key as never}
                label={element.label}
                description={element.description}
                placeholder={element.placeholder}
                className={element.className}
                type={element.type}
                rootClassName="max-w-full"
              />
            ))}
          </div>
        </div>
        <Button
          className="max-w-fit mt-4"
          type="submit"
          disabled={modeScriptSettingsForm.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
