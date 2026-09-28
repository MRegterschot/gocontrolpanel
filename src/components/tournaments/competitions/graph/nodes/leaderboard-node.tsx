"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSpacetimeProcedure } from "@/hooks/tournaments/use-spacetime-procedure";
import { procedures } from "@/lib/server-manager";
import { LeaderboardV2, NodeHandle } from "@/lib/server-manager/types";
import { IconArrowAutofitContent, IconChevronDown, IconSettings } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo, useRef, useState } from "react";
import { useProcedure } from "spacetimedb/react";
import { string } from "zod";

export type LeaderboardV2NodeType = Node<LeaderboardV2>;

const data = [
  {
    "userId": 8220,
    "position": 1,
    "round": 10,
    "mapId": 0,
    "score": 2000,
    "time": 47210,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8213,
    "position": 2,
    "round": 10,
    "mapId": 0,
    "score": 1800,
    "time": 43541,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8234,
    "position": 3,
    "round": 9,
    "mapId": 0,
    "score": 1600,
    "time": 0,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8218,
    "position": 4,
    "round": 8,
    "mapId": 0,
    "score": 1400,
    "time": 45562,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8229,
    "position": 5,
    "round": 7,
    "mapId": 0,
    "score": 1200,
    "time": 44197,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 149,
    "position": 6,
    "round": 6,
    "mapId": 0,
    "score": 1000,
    "time": 43881,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8223,
    "position": 7,
    "round": 5,
    "mapId": 0,
    "score": 800,
    "time": 44516,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8215,
    "position": 8,
    "round": 4,
    "mapId": 0,
    "score": 600,
    "time": 45008,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8228,
    "position": 9,
    "round": 3,
    "mapId": 0,
    "score": 400,
    "time": 46775,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  },
  {
    "userId": 8237,
    "position": 10,
    "round": 2,
    "mapId": 0,
    "score": 200,
    "time": 43999,
    "nodeId": 4103,
    "nodeVariant": 8,
    "mode": {
      "tag": "Knockout",
      "value": {}
    },
    "stepIdx": 0
  }
];

 function LeaderboardV2Node(props: NodeProps<LeaderboardV2NodeType>) {
  const [isOutputHovered, setOutputIsHovered] = useState(false);
  const [hasHoveredBefore, setHasHoveredBefore] = useState(false);

  /* const leaderboardOutput = useProcedure(procedures.nodeLeaderboardOutput);

  const data = useSpacetimeProcedure(
    leaderboardOutput,
    { node: NodeHandle.LeaderboardV1(props.data.id) },
  ).data;
  console.log(data)
  if (data === null || typeof data === "string") {
    return <div></div>
  } */
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
          <IconSettings className="pl-2 h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
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
              {data.map((thing,idx) => <div key={idx}>{thing.position}. {thing.userId}, {thing.score} </div>)}
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