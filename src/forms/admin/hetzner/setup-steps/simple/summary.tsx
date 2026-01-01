"use client";

import { createSimpleServerSetup } from "@/actions/hetzner/server-setup";
import BooleanDisplay from "@/components/boolean-display";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";
import { IconArrowNarrowLeft, IconPlus } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { SimpleServerSetupSchemaType } from "./server-setup-schema";

export default function Summary({
  form,
  projectId,
  onBack,
  callback,
}: {
  form: UseFormReturn<SimpleServerSetupSchemaType>;
  projectId: string;
  onBack: () => void;
  callback?: () => void;
}) {
  const { watch } = form;

  const server = watch("server");
  const controller = watch("serverController");
  const database = watch("database");

  async function handleSubmit(values: SimpleServerSetupSchemaType) {
    try {
      const { error } = await createSimpleServerSetup(projectId, values);
      if (error) {
        throw new Error(error);
      }
      toast.success("Server setup successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create server setup", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="flex flex-col gap-4">
        <div className="gap-4 grid sm:grid-cols-2 sm:gap-8 text-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-muted-foreground">Server</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold">Name</span>
                  <span className="truncate">{server.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Location</span>
                  <span className="truncate">{server.location}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Login</span>
                  <span className="truncate">{server.dediLogin}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Controller</span>
                  <span className="truncate">
                    <BooleanDisplay value={!!server.controller} size={20} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-muted-foreground">Controller</h4>
              {controller ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold">Type</span>
                    <span className="truncate">{controller.type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Admins</span>
                    <span className="truncate">
                      {"admins" in controller && controller.admins
                        ? Array.isArray(controller.admins) &&
                          controller.admins.length
                        : "-"}
                    </span>
                  </div>
                </div>
              ) : (
                <span>-</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-muted-foreground">Database</h4>
              {database ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold">Name</span>
                    <span className="truncate">{database.name || "local"}</span>
                  </div>
                </div>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-between">
          <Button
            className="flex-1 max-w-32"
            variant="outline"
            onClick={onBack}
          >
            <IconArrowNarrowLeft />
            Previous
          </Button>
          <Button
            className="flex-1 max-w-fit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            type="submit"
          >
            <IconPlus />
            Finish Setup
          </Button>
        </div>
      </div>
    </form>
  );
}
