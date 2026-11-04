"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { hasPermission, PERMISSION } from "@/lib/competition-permissions";
import { reducers, tables } from "@/lib/server-manager";
import { MatchV1 } from "@/lib/server-manager/types";
import { useUsers } from "@/providers/users-provider";
import { IconSend } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { useMyPermissions } from "../../competitions/permissions/use-competition-access";

export default function MatchChat({ match }: { match: MatchV1 }) {
  const users = useUsers();
  const canSend = hasPermission(useMyPermissions(match.parentId), PERMISSION.MATCH_SEND_CHAT);
  // The client cache merges the rows of a view for all args, so they are filtered by match.
  const [rows] = useTable(tables.matchChat({ matchId: match.id }));
  const messages = rows.filter((m) => m.matchId === match.id).sort((a, b) => a.id - b.id);
  const [message, setMessage] = useState("");
  const send = useServerAction(useReducer(reducers.unstableMatchChatMessage), "Failed to send message");

  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  return (
    <Card className="gap-3 px-4 py-4 h-[32rem]">
      <h2 className="font-semibold">Chat</h2>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 text-sm">
        {messages.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
        {messages.map((m) => (
          <p key={m.id}>
            <span className="font-semibold">{users.get(m.userId)?.name ?? `User ${m.userId}`}</span>{" "}
            <span className="break-words">{m.message}</span>
          </p>
        ))}
        <div ref={bottom} />
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await send({ matchId: match.id, message })) setMessage("");
        }}
      >
        <Input
          placeholder={canSend ? "Message the server..." : "You can't send messages in this match"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!canSend}
        />
        <Button type="submit" size="icon" disabled={!canSend || !message.trim()}>
          <IconSend />
        </Button>
      </form>
    </Card>
  );
}
