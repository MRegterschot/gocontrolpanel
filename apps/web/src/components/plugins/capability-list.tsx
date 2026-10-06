import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { describeCapability, type CapabilityRisk } from "@gcp/shared";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconShieldCheck,
} from "@tabler/icons-react";

const riskStyle: Record<CapabilityRisk, string> = {
  low: "text-muted-foreground",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-destructive",
};

const RiskIcon = ({ risk }: { risk: CapabilityRisk }) =>
  risk === "low" ? (
    <IconShieldCheck className="size-4 shrink-0" />
  ) : risk === "medium" ? (
    <IconInfoCircle className="size-4 shrink-0" />
  ) : (
    <IconAlertTriangle className="size-4 shrink-0" />
  );

// What a plugin is allowed to do, with the risky parts first
export function CapabilityList({
  capabilities,
  highlight = [],
  className,
}: {
  capabilities: string[];
  // Shown as new, for updates that ask for more
  highlight?: string[];
  className?: string;
}) {
  if (capabilities.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        This plugin needs no special permissions.
      </p>
    );
  }

  const order: CapabilityRisk[] = ["high", "medium", "low"];
  const sorted = [...capabilities].sort(
    (a, b) =>
      order.indexOf(describeCapability(a).risk) -
      order.indexOf(describeCapability(b).risk),
  );

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {sorted.map((capability) => {
        const info = describeCapability(capability);
        return (
          <li key={capability} className="flex items-start gap-2">
            <span className={cn("mt-0.5", riskStyle[info.risk])}>
              <RiskIcon risk={info.risk} />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium flex items-center gap-2">
                {info.label}
                {highlight.includes(capability) && (
                  <Badge variant="secondary">New</Badge>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {info.description}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CapabilityBadges({ capabilities }: { capabilities: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {capabilities.map((capability) => {
        const info = describeCapability(capability);
        return (
          <Badge
            key={capability}
            variant={info.risk === "high" ? "destructive" : "outline"}
            title={info.description}
          >
            {info.label}
          </Badge>
        );
      })}
    </div>
  );
}
