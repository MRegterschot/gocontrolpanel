import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export default function ContextMenu({ x, y, ...props }) {
    const { getNode, setNodes, addNodes, setEdges } = useReactFlow();
    /* const duplicateNode = useCallback(() => {
        //const node = getNode(id);
        const position = {
            x: node.position.x + 50,
            y: node.position.y + 50,
        };

        addNodes({
            ...node,
            selected: false,
            dragging: false,
            id: `${node.id}-copy`,
            position,
        });
    }, [id, getNode, addNodes]); */

    /* const deleteNode = useCallback(() => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id));
    }, [id, setNodes, setEdges]); */
    console.log("X is" + x + "Y is " + y)
    return (
        <Card className="relative w-30 h-50" style={{ left: x - 300, top: y - 200 }} >
            What
            <Button variant="outline" className="max-w-44">
                Add Match
            </Button>
        </Card>
    );
}