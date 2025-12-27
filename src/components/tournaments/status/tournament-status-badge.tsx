import { TournamentStatus } from "@/lib/tourney-manager";
import {
  Icon,
  IconCalendarEventFilled,
  IconFlag,
  IconLogin2,
  IconProgress,
  IconSpeakerphone,
} from "@tabler/icons-react";
import { Infer } from "spacetimedb";
import { Badge } from "../../ui/badge";

interface TournamentStatusBadgeProps {
  status: Infer<typeof TournamentStatus>;
}

export default function TournamentStatusBadge({
  status,
}: TournamentStatusBadgeProps) {
  let StatusIcon: Icon;
  let bgColor: string | undefined;
  let textColor: string | undefined;

  switch (status.tag) {
    case "Planning":
      StatusIcon = IconCalendarEventFilled;
      bgColor = "#2495D70D";
      textColor = "#2495D780";
      break;
    case "Announced":
      StatusIcon = IconSpeakerphone;
      bgColor = "#33D6610D";
      textColor = "#33D66180";
      break;
    case "Ongoing":
      StatusIcon = IconProgress;
      bgColor = "#FF5C001A";
      textColor = "#FF5C0080";
      break;
    case "Ended":
      StatusIcon = IconFlag;
      break;
    default:
      StatusIcon = IconProgress;
      break;
  }

  return (
    <Badge
      variant="outline"
      className="border rounded-full"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { borderColor: textColor }),
      }}
    >
      <StatusIcon style={{ ...(textColor && { color: textColor }) }} />
      <span>{status.tag}</span>
    </Badge>
  );
}
