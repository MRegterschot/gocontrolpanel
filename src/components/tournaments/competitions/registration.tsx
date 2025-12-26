import { Badge } from "@/components/ui/badge";
import { RegistrationRules } from "@/lib/tourney-manager";
import {
  IconLogin2,
  IconSitemap,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { Infer } from "spacetimedb";

interface RegistrationProps {
  registrationRules: Infer<typeof RegistrationRules>;
}

export default function Registration({ registrationRules }: RegistrationProps) {
  if (registrationRules.tag === "Open") {
    return (
      <Badge variant={"outline"} className="rounded-full">
        <IconLogin2 />
        Registrations open
      </Badge>
    );
  } else if (registrationRules.tag === "Inherit") {
    return (
      <Badge variant={"outline"} className="rounded-full">
        <IconSitemap />
        Registration rules inherited
      </Badge>
    );
  } else if (registrationRules.tag === "Players") {
    return (
      <Badge variant={"outline"} className="rounded-full">
        <IconUser />
        Max {registrationRules.value.playerLimit} players
      </Badge>
    );
  } else if (registrationRules.tag === "Team") {
    return (
      <Badge variant={"outline"} className="rounded-full">
        <IconUsers />
        Max {registrationRules.value.teamLimit} teams
      </Badge>
    );
  } else {
    return null;
  }
}
