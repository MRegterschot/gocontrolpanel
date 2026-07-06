"use client";

import { sendChatMessage } from "@/actions/gbx/advanced";
import { getErrorMessage } from "@/lib/utils";
import { DetailedPlayerChat, SPlayerInfo } from "@/types/gbx/player";
import { IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

export default function LiveChat({
  serverId,
  serverPlayerInfo,
  chatMessages,
  canSendMessage,
}: {
  serverId: string;
  serverPlayerInfo?: SPlayerInfo;
  chatMessages: DetailedPlayerChat[];
  canSendMessage: boolean;
}) {
  const [inputValue, setInputValue] = useState<string>("");

  const handleSendMessage = async () => {
    if (!canSendMessage) {
      toast.error("You do not have permission to send messages.");
      return;
    }

    if (inputValue.trim() === "") return;

    try {
      const { error } = await sendChatMessage(serverId, inputValue);
      if (error) {
        throw new Error(error);
      }

      setInputValue("");
    } catch (err) {
      toast.error(`Failed to send message`, {
        description: getErrorMessage(err),
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Card className="flex flex-col-reverse gap-2 min-h-96 max-h-96 overflow-y-auto p-2">
        {chatMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground flex flex-1 justify-center items-center">
            No chat messages yet.
          </p>
        ) : (
          chatMessages.map((chat, i) => (
            <Message key={i} chat={chat} serverPlayerInfo={serverPlayerInfo} />
          ))
        )}
      </Card>

      {canSendMessage && (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            className="w-full"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />

          <Button type="button" onClick={handleSendMessage}>
            <IconSend />
            <span className="hidden sm:block">Send message</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function Message({
  chat,
  serverPlayerInfo,
}: {
  chat: DetailedPlayerChat;
  serverPlayerInfo?: SPlayerInfo;
}) {
  return (
    <div className="flex gap-1 text-sm">
      {chat.Login != serverPlayerInfo?.Login && <span>[ {chat.Name} ]</span>}
      <p
        dangerouslySetInnerHTML={{
          __html: parseTmTags(chat.Text),
        }}
      />
    </div>
  );
}
