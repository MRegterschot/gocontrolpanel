"use client";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserV1 } from "@/lib/server-manager/types";
import { useUsers } from "@/providers/users-provider";
import { IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";

// Only users who have logged in once are known to the server, so they are picked from that list.
export default function UserPicker({ exclude, disabled, onPick }: {
  exclude: number[];
  disabled: boolean;
  onPick: (user: UserV1) => void;
}) {
  const [open, setOpen] = useState(false);
  const users = [...useUsers().values()].filter((u) => !exclude.includes(u.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="self-start" disabled={disabled}>
          <IconUserPlus />
          Add Member
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            {users.map((user) => (
              <CommandItem key={user.id} value={`${user.name} ${user.id}`} onSelect={() => { onPick(user); setOpen(false); }}>
                {user.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
