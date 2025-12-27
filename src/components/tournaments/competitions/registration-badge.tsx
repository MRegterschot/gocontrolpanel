import { Badge } from "@/components/ui/badge";
import { RegistrationSettings } from "@/lib/tourney-manager";
import { IconStopwatch, IconUser, IconUsers } from "@tabler/icons-react";
import { Infer } from "spacetimedb";

interface RegistrationBadgeProps {
  registrationSettings: Infer<typeof RegistrationSettings>;
}

export default function RegistrationBadge({
  registrationSettings,
}: RegistrationBadgeProps) {
  if (registrationSettings.tag === "Players") {
    return (
      <>
        <Badge variant={"outline"} className="rounded-full">
          <IconUser />
          Max {registrationSettings.value.playerLimit ?? 0} players
        </Badge>

        <Badge variant={"outline"} className="rounded-full">
          <IconStopwatch />
          Registration closes{" "}
          {registrationSettings.value.registrationDeadline
            .toDate()
            .toLocaleString()}
        </Badge>
      </>
    );
  } else if (registrationSettings.tag === "Team") {
    return (
      <>
        <Badge variant={"outline"} className="rounded-full">
          <IconUsers />
          Max {registrationSettings.value.teamLimit} teams
        </Badge>

        <Badge variant={"outline"} className="rounded-full">
          <IconUser />
          {registrationSettings.value.teamSizeMin} -{" "}
          {registrationSettings.value.teamSizeMax} players per team
        </Badge>

        <Badge variant={"outline"} className="rounded-full">
          <IconStopwatch />
          Registration closes{" "}
          {registrationSettings.value.registrationDeadline
            .toDate()
            .toLocaleString()}
        </Badge>
      </>
    );
  } else {
    return null;
  }
}
