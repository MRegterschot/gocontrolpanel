"use client";

import { saveFileText } from "@/actions/filemanager";
import { logger } from "@/lib/logger";
import { generatePath, getErrorMessage, pathToBreadcrumbs } from "@/lib/utils";
import { routes } from "@/routes";
import { cpp } from "@codemirror/lang-cpp";
import { xml } from "@codemirror/lang-xml";
import { IconCancel, IconDeviceFloppy } from "@tabler/icons-react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import FilesBreadcrumbs from "./breadcrumbs";

export default function TextEditor({
  path,
  defaultText = "",
  serverId,
}: {
  path: string;
  defaultText: string;
  serverId: string;
}) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const [text, setText] = useState<string>(defaultText);
  const isDark = resolvedTheme === "dark";

  const getLanguageMode = (filePath: string) => {
    if (filePath.endsWith(".Script.txt")) {
      return cpp();
    } else if (filePath.endsWith(".txt")) {
      return xml();
    }
    return [];
  };

  const handleCancel = () => {
    const parentPath = path.split("/").slice(0, -1).join("/");
    router.push(
      `${generatePath(routes.servers.files, { id: serverId })}?path=${parentPath}`,
    );
  };

  const handleSave = async () => {
    try {
      const { error } = await saveFileText(serverId, path, text);

      if (error) {
        throw new Error("Failed to save file");
      }

      toast.success("File successfully saved", {
        description: "Your changes have been saved.",
      });
    } catch (error) {
      logger.error(error, "Error saving file");
      toast.error("Failed to save file", {
        description: getErrorMessage(error),
      });
    }
  };

  const styles = EditorView.baseTheme({
    // Default
    "&.cm-editor.cm-focused": {
      outline: "none",
    },

    // Dark mode
    "&dark .cm-cursor": {
      borderLeftColor: "white !important",
    },
    "&dark .cm-gutter": {
      backgroundColor: "black",
    },
    "&dark .cm-gutterElement": {
      backgroundColor: "black",
      color: "white",
      opacity: 0.5,
    },
    "&dark .cm-activeLine": {
      backgroundColor: "#111",
    },
    "&dark .cm-selectionBackground": {
      backgroundColor: "#444 !important",
    },

    // Light mode
    "&light .cm-cursor": {
      borderLeftColor: "black !important",
    },
    "&light .cm-gutter": {
      backgroundColor: "white",
    },
    "&light .cm-gutterElement": {
      backgroundColor: "white",
      color: "black",
      opacity: 0.5,
    },
    "&light .cm-activeLine": {
      backgroundColor: "#eee !important",
    },
    "&light &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "#bbb !important",
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between w-full lg:items-center flex-col lg:flex-row gap-2">
        <FilesBreadcrumbs
          crumbs={pathToBreadcrumbs(path).slice(1)}
          serverId={serverId}
        />
        <div className="flex gap-2">
          <Button variant={"outline"} onClick={handleCancel}>
            <IconCancel />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <IconDeviceFloppy />
            Save
          </Button>
        </div>
      </div>

      <CodeMirror
        suppressHydrationWarning
        value={text}
        height="100%"
        width="100%"
        onChange={(value) => setText(value)}
        extensions={[EditorView.lineWrapping, getLanguageMode(path), styles]}
        theme={isDark ? "dark" : "light"}
        className="border-1"
      />
    </div>
  );
}
