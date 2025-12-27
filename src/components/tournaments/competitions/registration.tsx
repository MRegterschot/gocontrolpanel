import { Badge } from "@/components/ui/badge";
import { RegistrationSettings } from "@/lib/tourney-manager";
import { IconUser, IconUsers } from "@tabler/icons-react";
import { Infer } from "spacetimedb";

interface RegistrationProps {
  registrationSettings: Infer<typeof RegistrationSettings>;
}

export default function Registration({
  registrationSettings,
}: RegistrationProps) {
  if (registrationSettings.tag === "Players") {
    return (
      <Badge variant={"outline"} className="rounded-full">
        <IconUser />
        Max {registrationSettings.value.playerLimit} players
      </Badge>
    );
  } else if (registrationSettings.tag === "Team") {
    return (
      <Badge variant={"outline"} className="rounded-full">
        <IconUsers />
        Max {registrationSettings.value.teamLimit} teams
      </Badge>
    );
  } else {
    return null;
  }
}
