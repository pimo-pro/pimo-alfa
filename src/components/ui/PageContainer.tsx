import type { ReactNode } from "react";
import "./ui.css";

type Props = {
  children: ReactNode;
  centered?: boolean;
};

export default function PageContainer({ children, centered = false }: Props) {
  return (
    <main className={`ui-page-container${centered ? " ui-page-container--centered" : ""}`}>
      {children}
    </main>
  );
}
