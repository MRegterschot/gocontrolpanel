"use client";

import { Card } from "@/components/ui/card";
import { InputV1 } from "@/lib/server-manager/types";
import { IconChevronDown, IconSettings } from "@tabler/icons-react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

export type InputV1NodeType = Node<InputV1>;

 function InputV1Node(props: NodeProps<InputV1NodeType>) {
  return (

    <Card>
      <div className=" bg-purple-300 rounded-t-lg flex">
        <IconChevronDown className="h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
        <p className="font-bold">
          {props.data.name}
        </p>
        <IconSettings className="pl-2 h-[1em] items-center text-inherit leading-none self-center align-middle bg-none p-0 m-0 " />
      </div>
      <Handle type="source" position={Position.Right} className="h-5! rounded-sm!"/>
      {/* <Handle type="target" position={Position.Left} /> */}

      <div>
        hafhhafahf
      </div>
    </Card>
  );
}

export default memo(InputV1Node)