"use client";

import { Button } from "@/components/ui/button";
import { reducers, tables } from "@/lib/server-manager";
import { getErrorMessage } from "@/lib/utils";
import { IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { useReducer, useTable } from "spacetimedb/react";

export default function SelfRegistrationButton({
  registrationId,
}: {
  registrationId: number;
}) {
  const registerPlayer = useReducer(reducers.registerPlayer);
  const unregisterPlayer = useReducer(reducers.unregisterPlayer);
  const [[me]] = useTable(tables.myUser);
  const [players] = useTable(
    tables.tabRegisterationPlayer.where((r) => r.registrationId.eq(registrationId)),
  );

  const registered = players.some((p) => p.userId === me?.id);

  async function toggle() {
    try {
      await (registered ? unregisterPlayer : registerPlayer)({ registrationId });
      toast.success(registered ? "Unregistered" : "Registered");
    } catch (error) {
      toast.error("Failed to update registration", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Button className="w-9 sm:w-auto" variant="outline" disabled={!me} onClick={toggle}>
      {registered ? <IconUserMinus /> : <IconUserPlus />}
      <span className="hidden sm:inline">{registered ? "Unregister" : "Register"}</span>
    </Button>
  );
}
