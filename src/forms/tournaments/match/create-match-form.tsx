"use client";
import FormElement from "@/components/form/form-element";
import Modal from "@/components/modals/modal";
import CreateMatchTemplateModal from "@/components/modals/tournaments/match/create-match-template";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { reducers, tables } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useReducer, useTable } from "spacetimedb/react";
import {
  CreateMatchSchema,
  CreateMatchSchemaType,
} from "./create-match-schema";

export default function CreateMatchForm({
  competitionId,
  callback,
}: {
  competitionId: number;
  callback?: () => void;
}) {
  const createMatch = useReducer(reducers.createMatch);

  const [isCreateMatchTemplateModalOpen, setIsCreateMatchTemplateModalOpen] =
    useState(false);

  const [matchTemplateRows] = useTable(tables.myMatchTemplate);

  const form = useForm<CreateMatchSchemaType>({
    resolver: zodResolver(CreateMatchSchema),
    defaultValues: {
      competitionId: competitionId,
      withTemplate: undefined,
    },
  });

  async function onSubmit(values: CreateMatchSchemaType) {
    try {
      createMatch({
        ...values,
        withTemplate: values.withTemplate ?? undefined,
      });

      toast.success("Match successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create match", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormElement
            name="name"
            label="Match Name"
            type="text"
            placeholder="Enter match name"
          />

          <div className="flex flex-1 gap-2 items-end">
            <FormElement
              name="withTemplate"
              label="Match Template"
              type="select"
              rootClassName="flex-1"
              placeholder="Select template"
              className="w-full"
              options={matchTemplateRows.map((template) => ({
                label: template.name,
                value: template.id.toString(),
              }))}
            />
            <Button
              type="button"
              size={"icon"}
              variant="outline"
              onClick={() => setIsCreateMatchTemplateModalOpen(true)}
            >
              <IconPlus />
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full mt-4"
            disabled={form.formState.isSubmitting}
          >
            <IconPlus />
            Create Match
          </Button>
        </form>
      </Form>

      <Modal
        isOpen={isCreateMatchTemplateModalOpen}
        setIsOpen={setIsCreateMatchTemplateModalOpen}
      >
        <CreateMatchTemplateModal />
      </Modal>
    </>
  );
}
