import type { DoorOrDrawer } from "../models/DoorOrDrawer";

export function toggleDoorOrDrawer(id: string) {
  return (items: DoorOrDrawer[]): DoorOrDrawer[] =>
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            isOpen: !item.isOpen,
          }
        : item
    );
}
