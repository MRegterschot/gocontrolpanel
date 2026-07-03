"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useSearchUsers } from "@/hooks/use-search-users";
import { reducers } from "@/lib/server-manager";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconUserPlus, IconX } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { decode } from "slugid";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import {
  RegisterPlayerSchema,
  RegisterPlayerSchemaType,
} from "./register-player-schema";

export default function RegisterPlayerForm({
  registrationId,
  callback,
}: {
  registrationId: number;
  callback?: () => void;
}) {
  const registerPlayer = useReducer(reducers.registerPlayer);

  const { search, searchResults, searching } = useSearchUsers({});

  const form = useForm<RegisterPlayerSchemaType>({
    resolver: zodResolver(RegisterPlayerSchema),
  });

  async function handleSubmit(values: RegisterPlayerSchemaType) {
    try {
      registerPlayer({
        registrationId,
        player: values.player,
      });
      toast.success("Player successfully registered");
      callback?.();
    } catch (error) {
      toast.error("Failed to register player", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name={`player`}
          className="w-full"
          label="Player"
          placeholder="Search player..."
          onSearch={search}
          options={searchResults.map((u) => ({
            label: u.nickName,
            value: decode(u.login),
          }))}
          isLoading={searching}
          type="search"
        />

        <div className="flex justify-between mt-4">
          <Button variant={"outline"} onClick={callback} className="self-end">
            <IconX />
            Close
          </Button>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            <IconUserPlus />
            Register Player
          </Button>
        </div>
      </form>
    </Form>
  );
}
