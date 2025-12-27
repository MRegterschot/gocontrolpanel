import { CompetitionStatus } from "@/lib/tourney-manager";
import {
  Icon,
  IconCalendarEventFilled,
  IconFlag,
  IconLogin2,
  IconProgress,
} from "@tabler/icons-react";
import { Infer } from "spacetimedb";
import { Badge } from "../../ui/badge";

interface CompetitiontatusBadgeProps {
  status: Infer<typeof CompetitionStatus>;
}

export default function CompetitionStatusBadge({
  status,
}: CompetitiontatusBadgeProps) {
  let StatusIcon: Icon;
  let bgColor: string | undefined;
  let textColor: string | undefined;

  switch (status.tag) {
    case "Planning":
      StatusIcon = IconCalendarEventFilled;
      bgColor = "#2495D70D";
      textColor = "#2495D780";
      break;
    case "Registration":
      StatusIcon = IconLogin2;
      bgColor = "#33D6610D";
      textColor = "#33D66180";
      break;
    case "Ongoing":
      StatusIcon = IconProgress;
      bgColor = "#FF5C001A";
      textColor = "#FF5C0080";
      break;
    case "Completed":
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
