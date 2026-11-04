"use client";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { LeaderboardV2, LbSettingsV2 } from "@/lib/server-manager/types";
import { IconListNumbers } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo, useRef, useState } from "react";
import LeaderboardPreview from "./leaderboard-preview";
import NodeCard from "./node-card";

const OPERATIONS = {
  Add: (o: string, v: number) => `${o} + ${v}`,
  SubtractLhs: (o: string, v: number) => `${o} - ${v}`,
  SubtractRhs: (o: string, v: number) => `${v} - ${o}`,
  Multiply: (o: string, v: number) => `${o} × ${v}`,
  DivideLhs: (o: string, v: number) => `${o} / ${v}`,
  DivideRhs: (o: string, v: number) => `${v} / ${o}`,
};

function describeStep(setting: LbSettingsV2) {
  switch (setting.tag) {
    case "Filter": return setting.value.kind.tag;
    case "Merge": return `${setting.value.kind.tag}, ${setting.value.action.tag} ${setting.value.param.tag}`;
    case "Remap": {
      const { origin, target, manipulation, manipulationValue } = setting.value;
      return `${target.tag} = ${OPERATIONS[manipulation.tag](origin.tag, manipulationValue)}`;
    }
    case "Finalize": return "";
  }
}

export type LeaderboardV2NodeType = Node<LeaderboardV2>;

 function LeaderboardV2Node(props: NodeProps<LeaderboardV2NodeType>) {
  const [isOutputHovered, setOutputIsHovered] = useState(false);

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setOutputIsHovered(true);
  };
  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOutputIsHovered(false);
    }, 500);
  };

  return (
      <NodeCard id={props.id} name={props.data.name} icon={IconListNumbers} color="bg-yellow-700">
        <Handle type="target" position={Position.Left} className="h-5! rounded-sm!" />
        <Popover open={isOutputHovered}>
          <PopoverAnchor asChild>
            <Handle type="source" position={Position.Right} className="h-5! rounded-sm!" onMouseEnter={handleMouseEnter}
              onMouseLeave={() => handleMouseLeave()} />
          </PopoverAnchor>
          <PopoverContent side="top" align="center" onPointerDown={(e) => e.stopPropagation()} onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            <div>
              <LeaderboardPreview id={props.data.id} />
            </div>
          </PopoverContent>
        </Popover>
        {props.data.settings.length === 0 && <p className="text-muted-foreground">No steps</p>}
        <ol className="flex flex-col gap-1">
          {props.data.settings.map((setting, idx) => (
            <li key={idx} className="flex items-baseline gap-2">
              <span className="text-muted-foreground tabular-nums">{idx + 1}</span>
              <span className="font-medium">{setting.tag}</span>
              <span className="text-muted-foreground">{describeStep(setting)}</span>
            </li>
          ))}
        </ol>
      </NodeCard>

  );
}

export default memo(LeaderboardV2Node)