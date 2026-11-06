import { parseTmTags } from "@/lib/tmtags";
import { cn } from "@/lib/utils";

// Renders Trackmania-formatted text ($f00, $o, ...) with its colors and styles
export function TmText({
  text,
  className,
  title,
}: {
  text: string | null | undefined;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn(className)}
      title={title}
      dangerouslySetInnerHTML={{ __html: parseTmTags(text) }}
    />
  );
}
