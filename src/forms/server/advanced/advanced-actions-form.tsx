"use client";

import {
  connectFakePlayer,
  disconnectFakePlayer,
} from "@/actions/gbx/advanced";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Copy } from "@/components/ui/copy";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AdvancedActionsSchema,
  AdvancedActionsSchemaType,
} from "./advanced-actions-schema";

export default function AdvancedActionsForm({
  serverId,
  joinLink,
}: {
  serverId: string;
  joinLink: string;
}) {
  const form = useForm<AdvancedActionsSchemaType>({
    resolver: zodResolver(AdvancedActionsSchema),
  });

  const handleAddFakePlayer = async () => {
    try {
      const { data, error } = await connectFakePlayer(serverId);
      if (error) {
        throw new Error(error);
      }

      toast.success(`Added fake player ${data}`);
    } catch (err) {
      toast.error(`Failed to add fake player`, {
        description: getErrorMessage(err),
      });
    }
  };

  const handleRemoveFakePlayer = async (login?: string) => {
    const fakePlayerLogin = login?.trim();

    if (!fakePlayerLogin) {
      toast.error("Please enter a fake player login to remove.");
      return;
    }

    try {
      const { error } = await disconnectFakePlayer(serverId, fakePlayerLogin);
      if (error) {
        throw new Error(error);
      }

      if (fakePlayerLogin === "*") {
        toast.success(`Removed all fake players`);
      } else {
        toast.success(`Removed fake player ${fakePlayerLogin}`);
      }
    } catch (err) {
      toast.error(`Failed to remove fake player`, {
        description: getErrorMessage(err),
      });
    }
  };

  return (
    <Form {...form}>
      <form className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <h2 className="text-sm">Join link</h2>
            <p className="text-muted-foreground text-sm">
              Share this link with players to join the server.
            </p>
          </div>
          <Copy text={joinLink} copyMessage="Copied join link to clipboard." />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <h2 className="text-sm">Fake players</h2>
            <p className="text-muted-foreground text-sm">
              Add or remove fake players from the server. You can add a fake
              player without specifying a login, and the server will generate
              one for you. To remove a fake player, enter their login below.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleAddFakePlayer}
              variant="outline"
            >
              <IconPlus />
              Add Fake Player
            </Button>
            <Button
              type="button"
              onClick={() => handleRemoveFakePlayer("*")}
              variant="outline"
            >
              <IconTrash />
              Remove All Fake Players
            </Button>
          </div>

          <FormElement
            name="login"
            label="Login"
            description="The login of the fake player to remove."
            placeholder="Enter login"
            isRequired
          >
            <Button
              type="button"
              onClick={() => handleRemoveFakePlayer(form.getValues("login"))}
              variant="destructive"
              collapse="sm"
            >
              <IconTrash />
              Remove Fake Player
            </Button>
          </FormElement>
        </div>
      </form>
    </Form>
  );
}
