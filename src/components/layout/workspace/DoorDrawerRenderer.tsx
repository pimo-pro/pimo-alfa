import type { DoorOrDrawer } from "../../../models/DoorOrDrawer";

type DoorDrawerRendererProps = {
  items: DoorOrDrawer[];
};

export default function DoorDrawerRenderer({ items }: DoorDrawerRendererProps) {
  // Overlay legado mantido apenas como fallback visual leve.
  if (!items.length) return null;

  return (
    <div className="door-drawer-overlay" aria-hidden="true">
      {items.map((item) => {
        const style = {
          width: `${Math.max(32, item.width / 10)}px`,
          height: `${Math.max(16, item.height / 10)}px`,
          transform: getTransform(item),
        };

        return (
          <div
            key={item.id}
            className={`door-drawer-item door-drawer-item--${item.type} ${
              item.isOpen ? "door-drawer-item--open" : ""
            }`}
            style={style}
          />
        );
      })}
    </div>
  );
}

function getTransform(item: DoorOrDrawer) {
  if (!item.isOpen) return "translateZ(0)";
  if (item.type === "drawer" || item.openDirection === "pull") {
    return "translateZ(8px)";
  }
  if (item.openDirection === "left") return "rotateY(-20deg)";
  if (item.openDirection === "right") return "rotateY(20deg)";
  if (item.openDirection === "up") return "rotateX(-18deg)";
  if (item.openDirection === "down") return "rotateX(18deg)";
  return "translateZ(0)";
}
