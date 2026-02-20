import * as THREE from "three";

export type WallGizmoDragMode = "move" | "rotate" | null;

export interface WallGizmoHandleHit {
  mode: "move" | "rotate";
  axis?: "x" | "z";
}

/**
 * Gizmo para mover e rotacionar paredes no plano X/Z.
 * Handles: setas X/Z para translação, círculo para rotação em torno de Y.
 * Arquitetura preparada para offsets de portas/janelas e controle de ângulo.
 */
export class WallGizmo {
  readonly group = new THREE.Group();
  selectedWall: THREE.Mesh | null = null;
  isDragging = false;
  dragMode: WallGizmoDragMode = null;

  private handles: {
    arrowX: THREE.ArrowHelper;
    arrowZ: THREE.ArrowHelper;
    circle: THREE.Mesh;
  } | null = null;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly planeIntersect = new THREE.Vector3();

  private dragStartPosition = new THREE.Vector3();
  private dragStartPointerAngle = 0;

  private camera: THREE.Camera;
  private onTransform: (() => void) | null = null;

  private static readonly HANDLE_SCALE = 0.35;
  private static readonly ARROW_LEN = 0.25;
  private static readonly CIRCLE_RADIUS = 0.2;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.group.name = "wallGizmo";
    this.group.visible = false;

    const origin = new THREE.Vector3(0, 0, 0);
    const dirX = new THREE.Vector3(1, 0, 0);
    const dirZ = new THREE.Vector3(0, 0, 1);
    const arrowX = new THREE.ArrowHelper(
      dirX,
      origin,
      WallGizmo.ARROW_LEN,
      0xe11d48
    );
    const arrowZ = new THREE.ArrowHelper(
      dirZ,
      origin,
      WallGizmo.ARROW_LEN,
      0x2563eb
    );
    arrowX.userData.handle = "move" as const;
    arrowX.userData.axis = "x" as const;
    arrowZ.userData.handle = "move" as const;
    arrowZ.userData.axis = "z" as const;

    const circleGeom = new THREE.RingGeometry(
      WallGizmo.CIRCLE_RADIUS - 0.02,
      WallGizmo.CIRCLE_RADIUS + 0.02,
      32
    );
    circleGeom.rotateX(-Math.PI / 2);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x16a34a,
      side: THREE.DoubleSide,
      depthTest: true,
    });
    const circle = new THREE.Mesh(circleGeom, circleMat);
    circle.position.y = 0.05;
    circle.userData.handle = "rotate" as const;

    this.group.add(arrowX);
    this.group.add(arrowZ);
    this.group.add(circle);

    this.handles = { arrowX, arrowZ, circle };
  }

  /** Regista callback chamado após mover/rotacionar (para notificar estado). */
  setOnTransform(callback: (() => void) | null): void {
    this.onTransform = callback;
  }

  attach(wall: THREE.Mesh): void {
    this.detach();
    this.selectedWall = wall;
    this.syncFromWall();
    this.group.visible = true;
  }

  detach(): void {
    this.selectedWall = null;
    this.isDragging = false;
    this.dragMode = null;
    this.group.visible = false;
  }

  /** Sincroniza a posição do gizmo com a parede (e escala opcional). */
  update(): void {
    if (!this.selectedWall) return;
    this.syncFromWall();
  }

  private syncFromWall(): void {
    if (!this.selectedWall) return;
    this.selectedWall.getWorldPosition(this.group.position);
    this.group.rotation.set(0, 0, 0);
    const scale = WallGizmo.HANDLE_SCALE;
    this.group.scale.setScalar(scale);
  }

  private getHandleObjects(): THREE.Object3D[] {
    const h = this.handles;
    if (!h) return [];
    return [h.arrowX, h.arrowZ, h.circle];
  }

  /**
   * Testa se o pointer (NDC -1..1) atinge algum handle.
   * Retorna qual handle foi atingido ou null.
   */
  hitTest(pointerNdcX: number, pointerNdcY: number): WallGizmoHandleHit | null {
    this.pointer.set(pointerNdcX, pointerNdcY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objects = this.getHandleObjects();
    const hits = this.raycaster.intersectObjects(objects, true);
    if (!hits.length) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && obj.userData?.handle === undefined) obj = obj.parent;
    if (!obj) return null;
    const handle = obj.userData?.handle as "move" | "rotate" | undefined;
    const axis = obj.userData?.axis as "x" | "z" | undefined;
    if (handle === "move" && axis) return { mode: "move", axis };
    if (handle === "rotate") return { mode: "rotate" };
    return null;
  }

  /**
   * Chamado quando o utilizador inicia arraste num handle.
   * pointerNdc em coordenadas normalizadas de dispositivo (-1 a 1).
   * Retorna true se o evento foi consumido (início de drag).
   */
  onPointerDown(pointerNdcX: number, pointerNdcY: number): boolean {
    if (!this.selectedWall) return false;
    const hit = this.hitTest(pointerNdcX, pointerNdcY);
    if (!hit) return false;

    this.isDragging = true;
    this.dragMode = hit.mode;
    this.selectedWall.getWorldPosition(this.dragStartPosition);

    if (hit.mode === "move") {
      this.plane.constant = -this.dragStartPosition.y;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect);
      this.dragStartPosition.copy(this.planeIntersect);
    } else {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.plane.constant = -this.dragStartPosition.y;
      this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect);
      this.dragStartPointerAngle = Math.atan2(
        this.planeIntersect.z - this.dragStartPosition.z,
        this.planeIntersect.x - this.dragStartPosition.x
      );
    }
    return true;
  }

  /**
   * Chamado durante o arraste. Atualiza posição ou rotação da parede.
   */
  onPointerMove(pointerNdcX: number, pointerNdcY: number): void {
    if (!this.isDragging || !this.selectedWall || !this.dragMode) return;

    this.pointer.set(pointerNdcX, pointerNdcY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.plane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      this.selectedWall.getWorldPosition(new THREE.Vector3())
    );
    if (!this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect))
      return;

    if (this.dragMode === "move") {
      const dx = this.planeIntersect.x - this.dragStartPosition.x;
      const dz = this.planeIntersect.z - this.dragStartPosition.z;
      this.selectedWall.position.x += dx;
      this.selectedWall.position.z += dz;
      this.dragStartPosition.copy(this.planeIntersect);
    } else {
      const wallPos = this.selectedWall.getWorldPosition(new THREE.Vector3());
      const angle = Math.atan2(
        this.planeIntersect.z - wallPos.z,
        this.planeIntersect.x - wallPos.x
      );
      const delta = angle - this.dragStartPointerAngle;
      this.dragStartPointerAngle = angle;
      this.selectedWall.rotation.y += delta;
    }
    this.syncFromWall();
  }

  /**
   * Chamado quando o utilizador solta o botão. Finaliza o arraste e notifica.
   */
  onPointerUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.dragMode = null;
    this.onTransform?.();
  }

  dispose(): void {
    this.detach();
    const h = this.handles;
    if (h) {
      if (h.arrowX?.line?.geometry) h.arrowX.line.geometry.dispose();
      if (h.arrowZ?.line?.geometry) h.arrowZ.line.geometry.dispose();
      if (h.circle?.geometry) h.circle.geometry.dispose();
      if (h.circle?.material && !Array.isArray(h.circle.material)) {
        (h.circle.material as THREE.Material).dispose();
      }
    }
    this.group.clear();
  }
}
