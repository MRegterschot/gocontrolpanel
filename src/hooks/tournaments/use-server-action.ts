import { getErrorMessage } from "@/lib/utils";
import { useCallback } from "react";
import { toast } from "sonner";

// Rejected reducers and `{ err }` procedure results both end up as an error toast.
// Resolves to whether the call succeeded.
export function useServerAction<A extends unknown[]>(
  call: (...args: A) => Promise<unknown>,
  errorTitle: string,
  successTitle?: string,
) {
  return useCallback(
    async (...args: A) => {
      try {
        const result = await call(...args);
        if (result && typeof result === "object" && "err" in result) {
          const err = result.err as string | { tag: string };
          throw new Error(typeof err === "string" ? err : err.tag);
        }
        if (successTitle) toast.success(successTitle);
        return true;
      } catch (error) {
        toast.error(errorTitle, { description: getErrorMessage(error) });
        return false;
      }
    },
    [call, errorTitle, successTitle],
  );
}
