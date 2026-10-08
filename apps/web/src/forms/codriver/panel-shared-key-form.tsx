"use client";
import { setCodriverSharedKey } from "@/actions/codriver";
import { invalidateCodriverPanel } from "@/components/codriver/panel-format";
import FormElement from "@/components/form/form-element";
import ConfirmModal from "@/components/modals/confirm-modal";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  PanelSharedKeySchema,
  PanelSharedKeySchemaType,
} from "./panel-shared-key-schema";

export default function PanelSharedKeyForm({
  canStoreKeys,
  hasKey,
}: {
  canStoreKeys: boolean;
  hasKey: boolean;
}) {
  const queryClient = useQueryClient();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const form = useForm<PanelSharedKeySchemaType>({
    resolver: zodResolver(PanelSharedKeySchema),
    defaultValues: { key: "" },
  });

  async function onSubmit(values: PanelSharedKeySchemaType) {
    try {
      const { error } = await setCodriverSharedKey(values.key);
      if (error) {
        throw new ServerError(error, "SetCodriverKeyError");
      }
      form.reset({ key: "" });
      await invalidateCodriverPanel(queryClient);
      toast.success("Shared API key saved");
    } catch (error) {
      toast.error("Failed to save the API key", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onRemove() {
    setRemoving(true);
    try {
      const { error } = await setCodriverSharedKey(null);
      if (error) {
        throw new ServerError(error, "RemoveCodriverKeyError");
      }
      await invalidateCodriverPanel(queryClient);
      toast.success("Shared API key removed");
    } catch (error) {
      toast.error("Failed to remove the API key", {
        description: getErrorMessage(error),
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-wrap items-end gap-2"
        >
          <FormElement
            name="key"
            type="password"
            label="Anthropic API key"
            placeholder="sk-ant-..."
            isDisabled={!canStoreKeys}
            rootClassName="flex-1 min-w-64"
          />
          <Button
            type="submit"
            disabled={!canStoreKeys || form.formState.isSubmitting}
          >
            <IconDeviceFloppy />
            Save
          </Button>
          {hasKey && (
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => setConfirmRemove(true)}
            >
              <IconTrash />
              Remove
            </Button>
          )}
        </form>
      </Form>
      <ConfirmModal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={onRemove}
        title="Remove the shared API key?"
        description="Codriver stops using the shared key until a new one is stored. Servers with their own key keep working."
        confirmText="Remove"
        cancelText="Cancel"
      />
    </>
  );
}
