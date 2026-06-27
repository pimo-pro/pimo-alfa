import type { ReactNode } from "react";

export default function ProjetosIndexLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: 24 }}>
      <header>PROJETOS — INDEX</header>
      <main>{children}</main>
    </div>
  );
}
