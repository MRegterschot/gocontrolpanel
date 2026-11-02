"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Icon, IconCheck, IconX } from "@tabler/icons-react";
import { ReactNode } from "react";
import NodeSettingsButton from "./node-settings-button";

export default function NodeCard({ id, name, icon: TypeIcon, color, children }: {
  id: string;
  name: string;
  icon: Icon;
  color: string;
  children?: ReactNode;
}) {
  return (
    <Card className="min-w-52 gap-0 overflow-hidden py-0">
      <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-white", color)}>
        <TypeIcon className="size-4 shrink-0" />
        <p className="truncate font-semibold">{name}</p>
        <NodeSettingsButton id={id} />
      </div>
      {children && <div className="flex flex-col gap-1.5 px-3 py-2 text-xs">{children}</div>}
    </Card>
  );
}

export function NodeRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

export function NodeFlag({ value }: { value: boolean }) {
  return value ? <IconCheck className="size-4 text-green-600" /> : <IconX className="size-4 text-muted-foreground" />;
}
