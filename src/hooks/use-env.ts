"use client";

import { useEffect, useState } from "react";

export function useRuntimeEnv() {
  const [env, setEnv] = useState<null | {
    SPACETIME_URI: string | null;
    SPACETIME_MODULE: string | null;
  }>(null);

  useEffect(() => {
    async function fetchEnv() {
      const res = await fetch("/api/env");
      const data = await res.json();
      setEnv(data);
    }

    fetchEnv();
  }, []);

  return env;
}
