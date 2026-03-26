import type { ReactNode } from "react";
import "./ui.css";

type Props = {
  left: ReactNode;
  right: ReactNode;
};

export default function Toolbar({ left, right }: Props) {
  return (
    <div className="ui-toolbar">
      <div className="ui-toolbar__left">{left}</div>
      <div className="ui-toolbar__right">{right}</div>
    </div>
  );
}
