import React from "react";
const Concept1Modern = React.lazy(() => import("./concept1-modern/index"));
const Concept2Minimal = React.lazy(() => import("./concept2-minimal/index"));
const Concept3Creative = React.lazy(() => import("./concept3-creative/index"));

export const landingRoutes = [
  {
    path: "/landing/concept1",
    element: <Concept1Modern />,
  },
  {
    path: "/landing/concept2",
    element: <Concept2Minimal />,
  },
  {
    path: "/landing/concept3",
    element: <Concept3Creative />,
  },
];
