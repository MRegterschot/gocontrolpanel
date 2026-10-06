import { useEffect, useRef, useState } from "react";

export function useHasScrollbar<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [hasScrollbar, setHasScrollbar] = useState(false);

  useEffect(() => {
    const checkScrollbar = () => {
      if (ref.current) {
        setHasScrollbar(ref.current.scrollHeight > ref.current.clientHeight);
      }
    };

    checkScrollbar();

    const mutationObserver = new MutationObserver(checkScrollbar);
    const resizeObserver = new ResizeObserver(checkScrollbar);

    if (ref.current) {
      mutationObserver.observe(ref.current, { childList: true, subtree: true });
      resizeObserver.observe(ref.current);
    }

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  return { ref, hasScrollbar };
}
