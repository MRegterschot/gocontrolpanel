"use client";

import { setScriptName } from "@/actions/gbx/game";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconScriptPlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ScriptNameSchema, ScriptNameSchemaType } from "./game-schema";

export default function ScriptNameForm({
  scriptName,
  scripts,
  serverId,
}: {
  scriptName: string;
  scripts: string[];
  serverId: string;
}) {
  const scriptNameForm = useForm<ScriptNameSchemaType>({
    resolver: zodResolver(ScriptNameSchema),
    defaultValues: {
      scriptName,
    },
  });

  async function onSubmitScriptName(values: ScriptNameSchemaType) {
    try {
      const { error } = await setScriptName(serverId, values.scriptName);
      if (error) {
        throw new Error(error);
      }
      toast.success("Script successfully loaded");
    } catch (error) {
      toast.error("Failed to update Script Name", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...scriptNameForm}>
      <form
        onSubmit={scriptNameForm.handleSubmit(onSubmitScriptName)}
        className="flex flex-col gap-2"
      >
        <FormElement
          name={"scriptName"}
          label="Script Name"
          description="The name of the script to load."
          rootClassName="max-w-full"
          options={scripts.map((script) => ({
            label: script,
            value: script,
          }))}
          className="max-w-48 sm:max-w-full sm:w-1/2"
          type="select"
          isRequired
        >
          <Button
            type="submit"
            collapse="sm"
            disabled={scriptNameForm.formState.isSubmitting}
          >
            <IconScriptPlus />
            Load Script
          </Button>
        </FormElement>
      </form>
    </Form>
  );
}
