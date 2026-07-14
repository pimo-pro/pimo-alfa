import type { RouteObject } from "react-router-dom";
import AjudaPage from "@/pages/ajuda/AjudaPage";
import AjudaWhatsNewPage from "@/pages/ajuda/AjudaWhatsNewPage";

export const AJUDA_PATH = "/ajuda";
export const AJUDA_WHATS_NEW_PATH = "/ajuda/whats-new";

export const ajudaRoutes: RouteObject[] = [
  { path: AJUDA_PATH, element: <AjudaPage /> },
  { path: AJUDA_WHATS_NEW_PATH, element: <AjudaWhatsNewPage /> },
];
