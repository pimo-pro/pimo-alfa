import React from "react";

const LandingDebugNav: React.FC = () => {
  return (
    <nav style={{ padding: "1rem", background: "#e0e7ff", display: "flex", gap: "1rem" }}>
      <a href="/landing/concept1">Concept 1: Modern</a>
      <a href="/landing/concept2">Concept 2: Minimalist</a>
      <a href="/landing/concept3">Concept 3: Creative</a>
    </nav>
  );
};

export default LandingDebugNav;
