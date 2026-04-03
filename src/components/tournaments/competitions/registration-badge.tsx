import { Badge } from "@/components/ui/badge";
import { RegistrationSettings } from "@/lib/server-manager/types";
import { IconStopwatch, IconUser, IconUsers } from "@tabler/icons-react";

interface RegistrationBadgeProps {
  registrationSettings: RegistrationSettings;
}

export default function RegistrationBadge({
  registrationSettings,
}: RegistrationBadgeProps) {
  if (registrationSettings.tag === "Player") {
    return (
      <>
        <Badge variant={"outline"} className="rounded-full">
          <IconUser />
          Max {registrationSettings.value.playerLimit ?? 0}
        </Badge>

        <Badge variant={"outline"} className="rounded-full">
          <IconStopwatch />
          {registrationSettings.value.registrationDeadline
            .toDate()
            .toLocaleString("en-UK", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
        </Badge>
      </>
    );
  } else if (registrationSettings.tag === "Team") {
    return (
      <>
        <Badge variant={"outline"} className="rounded-full">
          <IconUser />
          Max {registrationSettings.value.teamLimit}
        </Badge>

        <Badge variant={"outline"} className="rounded-full">
          <IconUsers />
          {registrationSettings.value.teamSizeMin} -{" "}
          {registrationSettings.value.teamSizeMax}
        </Badge>

        <Badge variant={"outline"} className="rounded-full">
          <IconStopwatch />
          {registrationSettings.value.registrationDeadline
            .toDate()
            .toLocaleString("en-UK", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
        </Badge>
      </>
    );
  } else {
    return null;
  }
}
