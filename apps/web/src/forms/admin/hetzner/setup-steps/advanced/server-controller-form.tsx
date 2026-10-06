"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useFormContext, UseFormReturn } from "react-hook-form";
import { AdvancedServerSetupSchemaType } from "./server-setup-schema";

export default function ServerControllerForm({
  form,
  onNext,
  onBack,
}: {
  form: UseFormReturn<AdvancedServerSetupSchemaType>;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <form className="flex flex-col gap-4">
      <FormElement
        name="serverController.type"
        label="Controller"
        description="Select the server controller you want to use"
        className="min-w-32"
        isRequired
        type="select"
        options={[
          { value: "evosc", label: "EvoSC" },
          { value: "maniacontrol", label: "ManiaControl" },
          { value: "minicontrol", label: "MiniControl" },
          { value: "pyplanet", label: "PyPlanet" },
        ]}
      />

      {form.watch("serverController.type") === "maniacontrol" && (
        <ManiaControlSettingsForm />
      )}

      {form.watch("serverController.type") === "evosc" && <EvoSCSettingsForm />}

      {form.watch("serverController.type") === "minicontrol" && (
        <MiniControlSettingsForm />
      )}

      {form.watch("serverController.type") === "pyplanet" && (
        <PyPlanetSettingsForm />
      )}

      <div className="flex gap-2 justify-between">
        <Button className="flex-1 max-w-32" variant="outline" onClick={onBack}>
          <IconArrowNarrowLeft />
          Previous
        </Button>
        <Button className="flex-1 max-w-32" type="button" onClick={onNext}>
          Next
          <IconArrowNarrowRight />
        </Button>
      </div>
    </form>
  );
}

function ManiaControlSettingsForm() {
  const form = useFormContext<AdvancedServerSetupSchemaType>();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user.login) return;

    form.setValue(
      "serverController.admins",
      form.getValues("serverController.admins") || [session.user.login],
    );
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <FormLabel className="text-sm">Admins</FormLabel>
      {form.watch("serverController.admins")?.map((_, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex-1">
            <FormElement
              name={`serverController.admins.${index}`}
              className="w-full"
              placeholder="Enter admin login"
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            size={"icon"}
            onClick={() => {
              const currentAdmins = form.getValues("serverController.admins");
              form.setValue(
                "serverController.admins",
                currentAdmins?.filter((_, i) => i !== index),
              );
            }}
          >
            <IconTrash />
            <span className="sr-only">Remove Admin</span>
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const currentAdmins = form.getValues("serverController.admins") || [];
          form.setValue("serverController.admins", [...currentAdmins, ""]);
        }}
      >
        <IconPlus />
        Add Admin
      </Button>
    </div>
  );
}

function EvoSCSettingsForm() {
  return <></>;
}

function MiniControlSettingsForm() {
  const form = useFormContext<AdvancedServerSetupSchemaType>();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user.login) return;

    form.setValue(
      "serverController.admins",
      form.getValues("serverController.admins") || [session.user.login],
    );
    form.setValue(
      "serverController.excludedPlugins",
      form.getValues("serverController.excludedPlugins") || [],
    );
  }, []);

  return (
    <>
      <div className="flex flex-col gap-2">
        <FormLabel className="text-sm">Admins</FormLabel>
        {form.watch("serverController.admins")?.map((_, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1">
              <FormElement
                name={`serverController.admins.${index}`}
                className="w-full"
                placeholder="Enter admin login"
              />
            </div>

            <Button
              type="button"
              variant="destructive"
              size={"icon"}
              onClick={() => {
                const currentAdmins = form.getValues("serverController.admins");
                form.setValue(
                  "serverController.admins",
                  currentAdmins?.filter((_, i) => i !== index),
                );
              }}
            >
              <IconTrash />
              <span className="sr-only">Remove Admin</span>
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const currentAdmins =
              form.getValues("serverController.admins") || [];
            form.setValue("serverController.admins", [...currentAdmins, ""]);
          }}
        >
          <IconPlus />
          Add Admin
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <FormLabel className="text-sm">Excluded Plugins</FormLabel>
        {form.watch("serverController.excludedPlugins")?.map((_, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1">
              <FormElement
                name={`serverController.excludedPlugins.${index}`}
                className="w-full"
                placeholder="Enter plugin name"
              />
            </div>

            <Button
              type="button"
              variant="destructive"
              size={"icon"}
              onClick={() => {
                const currentExcludedPlugins = form.getValues(
                  "serverController.excludedPlugins",
                );
                form.setValue(
                  "serverController.excludedPlugins",
                  currentExcludedPlugins?.filter((_, i) => i !== index),
                );
              }}
            >
              <IconTrash />
              <span className="sr-only">Remove Plugin</span>
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const currentExcludedPlugins =
              form.getValues("serverController.excludedPlugins") || [];
            form.setValue("serverController.excludedPlugins", [
              ...currentExcludedPlugins,
              "",
            ]);
          }}
        >
          <IconPlus />
          Add Plugin
        </Button>
      </div>

      <FormElement
        name="serverController.contactInfo"
        label="Contact Info"
        description="Contact information so nadeo can reach you"
        isRequired
      />

      <FormElement
        name="serverController.identifier"
        label="Identifier"
        description="Trackmania API identifier"
        type="text"
        isRequired
      />

      <FormElement
        name="serverController.secret"
        label="Secret"
        description="Trackmania API secret"
        type="password"
        isRequired
      />
    </>
  );
}

function PyPlanetSettingsForm() {
  const form = useFormContext<AdvancedServerSetupSchemaType>();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user.login) return;

    form.setValue(
      "serverController.admins",
      form.getValues("serverController.admins") || [session.user.login],
    );
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <FormLabel className="text-sm">Admins</FormLabel>
      {form.watch("serverController.admins")?.map((_, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex-1">
            <FormElement
              name={`serverController.admins.${index}`}
              className="w-full"
              placeholder="Enter admin login"
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            size={"icon"}
            onClick={() => {
              const currentAdmins = form.getValues("serverController.admins");
              form.setValue(
                "serverController.admins",
                currentAdmins?.filter((_, i) => i !== index),
              );
            }}
          >
            <IconTrash />
            <span className="sr-only">Remove Admin</span>
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const currentAdmins = form.getValues("serverController.admins") || [];
          form.setValue("serverController.admins", [...currentAdmins, ""]);
        }}
      >
        <IconPlus />
        Add Admin
      </Button>
    </div>
  );
}
