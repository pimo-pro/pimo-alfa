import { Link } from "react-router-dom";
import "./ui.css";

export type TabItem = {
  key: string;
  label: string;
  to: string;
};

type Props = {
  items: TabItem[];
  activeKey: string;
};

export default function Tabs({ items, activeKey }: Props) {
  return (
    <nav className="ui-tabs" aria-label="Navegação por abas">
      {items.map((item) => (
        <Link
          key={item.key}
          to={item.to}
          className={`ui-tab${item.key === activeKey ? " ui-tab--active" : ""}`}
          aria-current={item.key === activeKey ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
