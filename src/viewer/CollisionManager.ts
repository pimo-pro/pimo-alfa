// CollisionManager: Gerencia colisões, detecção, bounding boxes.
export class CollisionManager {
  viewerCore: unknown;

  constructor(viewerCore?: unknown) {
    this.viewerCore = viewerCore;
  }

  smartSnap(_box: unknown, _candidates: unknown): null {
    return null;
  }

  predictCollision(_box: unknown, _movement: unknown): false {
    return false;
  }

  detectCollision(_boxA: unknown, _boxB: unknown): false {
    return false;
  }

  resolveCollision(_boxA: unknown, _boxB: unknown): null {
    return null;
  }
}
