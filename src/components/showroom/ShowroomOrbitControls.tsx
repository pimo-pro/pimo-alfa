import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useShowroomStore } from "./showroomStore";

export function ShowroomOrbitControls() {
  const ref = useRef<OrbitControlsImpl>(null);
  const orbitSuspended = useShowroomStore((s) => s.orbitSuspended);
  const setControlsRef = useShowroomStore((s) => s.setControlsRef);

  useEffect(() => {
    const ctrl = ref.current;
    setControlsRef(ctrl);
    return () => setControlsRef(null);
  }, [setControlsRef]);

  useEffect(() => {
    const ctrl = ref.current;
    if (ctrl) ctrl.enabled = !orbitSuspended;
  }, [orbitSuspended]);

  return <OrbitControls ref={ref} makeDefault enableDamping dampingFactor={0.08} />;
}
