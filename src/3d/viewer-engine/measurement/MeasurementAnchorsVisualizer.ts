import * as THREE from "three";
import type { MeasurementAnchorEntry } from "../../../core/viewer/measurementAnchors";

const PIN_COLOR = 0xf59e0b;
const LINE_COLOR = 0x38bdf8;

export class MeasurementAnchorsVisualizer {
  private readonly root = new THREE.Group();
  private readonly pins = new Map<string, THREE.Mesh>();
  private readonly labels: THREE.Sprite[] = [];

  constructor(scene: THREE.Scene) {
    this.root.name = "measurement-anchors-root";
    scene.add(this.root);
  }

  getRoot(): THREE.Group {
    return this.root;
  }

  sync(anchors: MeasurementAnchorEntry[], selectedPosition?: THREE.Vector3 | null): void {
    const ids = new Set(anchors.map((a) => a.id));

    for (const [id, mesh] of this.pins) {
      if (!ids.has(id)) {
        this.root.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.pins.delete(id);
      }
    }

    for (const anchor of anchors) {
      let pin = this.pins.get(anchor.id);
      if (!pin) {
        const geom = new THREE.ConeGeometry(0.012, 0.04, 8);
        const mat = new THREE.MeshBasicMaterial({ color: PIN_COLOR, depthTest: true });
        pin = new THREE.Mesh(geom, mat);
        pin.name = `anchor-pin-${anchor.id}`;
        this.pins.set(anchor.id, pin);
        this.root.add(pin);
      }
      pin.position.set(anchor.position.x, anchor.position.y, anchor.position.z);
      pin.rotation.x = Math.PI;
    }

    this.clearLines();
    if (selectedPosition && anchors.length > 0) {
      for (const anchor of anchors) {
        const from = new THREE.Vector3(anchor.position.x, anchor.position.y, anchor.position.z);
        this.addLine(from, selectedPosition);
      }
    }

    const anchorPairs = anchors.length >= 2;
    if (anchorPairs) {
      for (let i = 0; i < anchors.length; i++) {
        for (let j = i + 1; j < anchors.length; j++) {
          const a = anchors[i]!;
          const b = anchors[j]!;
          this.addLine(
            new THREE.Vector3(a.position.x, a.position.y, a.position.z),
            new THREE.Vector3(b.position.x, b.position.y, b.position.z)
          );
        }
      }
    }
  }

  private clearLines(): void {
    for (const line of this.labels) {
      this.root.remove(line);
      line.material.dispose();
    }
    this.labels.length = 0;
    const toRemove = this.root.children.filter((c) => c.name.startsWith("anchor-line-"));
    for (const child of toRemove) {
      this.root.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }

  private addLine(from: THREE.Vector3, to: THREE.Vector3): void {
    const geom = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new THREE.LineBasicMaterial({ color: LINE_COLOR, depthTest: true });
    const line = new THREE.Line(geom, mat);
    line.name = `anchor-line-${from.x}-${to.x}`;
    this.root.add(line);
  }

  dispose(): void {
    for (const mesh of this.pins.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.pins.clear();
    this.clearLines();
    this.root.removeFromParent();
  }
}
