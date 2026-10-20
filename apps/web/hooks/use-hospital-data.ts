"use client";
import { useEffect, useState } from "react";

export function useHospitalData<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Hospital data unavailable." });
    });
    return () => controller.abort();
  }, [key, load, retry]);
  return { ...(state.key === key ? state : { key }), retry: () => { setState({ key }); setRetry(v => v + 1); } };
}
