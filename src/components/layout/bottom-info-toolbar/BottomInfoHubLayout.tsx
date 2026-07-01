import type { ReactNode } from "react";
import IndustrialToolbarIcon, {
  type IndustrialToolbarIconName,
} from "../../icons/industrialToolbar/IndustrialToolbarIcon";

export type BottomInfoHubTab = {
  id: string;
  label: string;
};

type Props = {
  title: string;
  icon: IndustrialToolbarIconName;
  tabs: BottomInfoHubTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  headerAction?: ReactNode;
  children: ReactNode;
};

export default function BottomInfoHubLayout({
  title,
  icon,
  tabs,
  activeTabId,
  onTabChange,
  headerAction,
  children,
}: Props) {
  return (
    <div className="bottom-info-hub">
      <div className="bottom-info-hub__sidebar">
        <div className="bottom-info-hub__sidebar-header">
          <IndustrialToolbarIcon name={icon} size={18} />
          <span>{title}</span>
        </div>
        <nav className="bottom-info-hub__nav" aria-label={title}>
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                className={`bottom-info-hub__nav-item${active ? " bottom-info-hub__nav-item--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="bottom-info-hub__content">
        {headerAction ? <div className="bottom-info-hub__content-header">{headerAction}</div> : null}
        <div className="bottom-info-hub__content-body">{children}</div>
      </div>
    </div>
  );
}
