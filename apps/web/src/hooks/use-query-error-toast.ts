import { getErrorMessage } from "@/lib/utils";
import { useEffect } from "react";
import { toast } from "sonner";

// Shows a failed read once per failure, like the try/catch + toast the components had
export function useQueryErrorToast(error: unknown, title: string) {
  useEffect(() => {
    if (!error) return;
    toast.error(title, { description: getErrorMessage(error) });
     
  }, [error]);
}
