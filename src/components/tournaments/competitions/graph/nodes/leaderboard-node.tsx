"use client";

import { Card } from "@/components/ui/card";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { LeaderboardV2 } from "@/lib/server-manager/types";
import { IconChevronDown } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import NodeSettingsButton from "./node-settings-button";
import { memo, useRef, useState } from "react";
import LeaderboardPreview from "./leaderboard-preview";

export type LeaderboardV2NodeType = Node<LeaderboardV2>;

 function LeaderboardV2Node(props: NodeProps<LeaderboardV2NodeType>) {
  const [isOutputHovered, setOutputIsHovered] = useState(false);
  const [hasHoveredBefore, setHasHoveredBefore] = useState(false);

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
    <>
      <Card>
        <div className=" bg-yellow-300 rounded-t-lg flex">
          <IconChevronDown className="h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
          <p className="font-bold">
            {props.data.name}
          </p>
          <NodeSettingsButton id={props.id} />
        </div>

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
        <div className="m-2">
          {props.data.settings.map((setting, idx) => {
            switch (setting.tag) {
              case "Filter":
                return <div className="flex" key={idx}>{idx + 1}. Filter {setting.value.kind.tag}</div>
              case "Merge":
                return <div className="flex" key={idx}>{idx + 1}. Merge <span className="underline">{setting.value.kind.tag} </span> and <span className="underline">{setting.value.action.tag}</span> the <span className="underline">{setting.value.param.tag}</span></div>
              case "Remap":
                return <div className="flex" key={idx}>{idx + 1}. Remap
                  <span className="underline">  {setting.value.origin.tag} </span>
                  to <span className="underline">{setting.value.target.tag}</span>
                  and do <span className="underline">
                    {(() => {
                      switch (setting.value.manipulation.tag) {
                        case "Add": return <div> {setting.value.origin.tag} + {setting.value.manipulationValue}  </div>
                        case "DivideLhs": return <div> {setting.value.origin.tag} / {setting.value.manipulationValue} </div>
                        case "DivideRhs": return <div>{setting.value.manipulationValue} / {setting.value.origin.tag}</div>
                        case "Multiply": return <div> {setting.value.origin.tag} * {setting.value.manipulationValue} </div>
                        case "SubtractLhs": return <div>{setting.value.origin.tag} - {setting.value.manipulationValue} </div>
                        case "SubtractRhs": return <div> {setting.value.manipulationValue} - {setting.value.origin.tag}</div>
                      }
                    })()}</span>
                </div>
              case "Finalize":
                return <div key={idx}>{idx + 1}. Finalize Leaderboard</div>
            }
          })}
        </div>
      </Card>


    </>
  );
}

export default memo(LeaderboardV2Node)