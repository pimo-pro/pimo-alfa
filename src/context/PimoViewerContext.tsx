import { useCallback, useMemo, useRef, useState } from "react";
import { PimoViewerContext } from "./PimoViewerContextCore";
import type { PimoViewerApi } from "./PimoViewerContextCore";
import { getPimoViewerStubApi } from "./pimoViewerStubApi";

export const PimoViewerProvider = ({ children }: { children: React.ReactNode }) => {
  const stubApiRef = useRef(getPimoViewerStubApi());
  const [viewerApi, setViewerApi] = useState<PimoViewerApi>(stubApiRef.current);
  const registeredApiRef = useRef<PimoViewerApi | null>(null);

  const registerViewerApi = useCallback((api: PimoViewerApi | null) => {
    if (api === null) {
      registeredApiRef.current = null;
      setViewerApi(stubApiRef.current);
      return;
    }
    if (registeredApiRef.current === api) return;
    registeredApiRef.current = api;
    setViewerApi(api);
  }, []);

  const value = useMemo(() => ({ viewerApi, registerViewerApi }), [viewerApi, registerViewerApi]);

  return <PimoViewerContext.Provider value={value}>{children}</PimoViewerContext.Provider>;
};
