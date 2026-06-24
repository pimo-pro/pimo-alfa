export type ViewerWindowEventHandlers = {
  resize: () => void;
  keydown: (_event: KeyboardEvent) => void;
  keyup: (_event: KeyboardEvent) => void;
};

export function registerViewerWindowEvents(handlers: ViewerWindowEventHandlers): () => void {
  window.addEventListener("resize", handlers.resize);
  window.addEventListener("keydown", handlers.keydown);
  window.addEventListener("keyup", handlers.keyup);

  return () => {
    window.removeEventListener("resize", handlers.resize);
    window.removeEventListener("keydown", handlers.keydown);
    window.removeEventListener("keyup", handlers.keyup);
  };
}
