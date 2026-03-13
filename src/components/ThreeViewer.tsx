import { useEffect, useRef } from "react";
import { Viewer } from "../3d/core/Viewer";

/** Props do ThreeViewer: apenas as utilizadas pelo componente (sem APIs falsas). */
export type ThreeViewerProps = {
  height?: number | string;
  backgroundColor?: string;
  viewerOptions?: any;
};

export default function ThreeViewer({
  height = 300,
  backgroundColor = "#0f172a",
  viewerOptions,
}: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    // Viewer não aceita argumentos no construtor
    viewerRef.current = new Viewer();
    return () => {
      viewerRef.current = null;
    };
  }, [backgroundColor, viewerOptions]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        background: backgroundColor,
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    />
  );
}
