import {
  Icon,
  IconFlag,
  IconPlayerTrackNext,
  IconPointFilled,
  IconProgress,
  IconSettings,
} from "@tabler/icons-react";
import { Badge } from "../../ui/badge";
import { MatchStatus } from "@/lib/server-manager/types";

interface MatchStatusBadgeProps {
  status: MatchStatus;
}

export default function MatchStatusBadge({ status }: MatchStatusBadgeProps) {
  let StatusIcon: Icon;
  let bgColor: string | undefined;
  let textColor: string | undefined;

  switch (status.tag) {
    case "Configuring":
      StatusIcon = IconSettings;
      bgColor = "#2495D70D";
      textColor = "#2495D780";
      break;
    case "Configured":
      StatusIcon = IconSettings;
      bgColor = "#2495D70D";
      textColor = "#2495D780";
      break;
    case "Preparation":
      StatusIcon = IconPlayerTrackNext;
      bgColor = "#33D6610D";
      textColor = "#33D66180";
      break;
    case "Live":
      StatusIcon = IconPointFilled;
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
