/**
 * Hook customizado para lógica do canvas 3D da landing v4.
 * Setup de cena, luzes, animação de câmara, criação do móvel, etc.
 *
 * Implementação inicial: apenas cena, iluminação e fundo gradiente.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function useLanding3D(canvasRef: React.RefObject<HTMLDivElement>) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight, false);
    renderer.setClearColor(0x0a0a0f, 1); // fallback cor sólida
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasRef.current.appendChild(renderer.domElement);

    // Fundo gradiente via CSS
    canvasRef.current.style.background = "linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)";

    // Cena
    const scene = new THREE.Scene();

    // Luz ambiente suave
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    // Luz direcional com sombras realistas
    const directional = new THREE.DirectionalLight(0xffffff, 1.0);
    directional.position.set(5, 10, 7);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.bias = -0.0005;
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 40;
    directional.shadow.camera.left = -10;
    directional.shadow.camera.right = 10;
    directional.shadow.camera.top = 10;
    directional.shadow.camera.bottom = -10;
    scene.add(directional);

    // Camera (posição inicial será ajustada depois)
    const aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(6, 8, 10);
    camera.lookAt(0, 0, 0);

    // Render loop mínimo
    let running = true;
    function animate() {
      if (!running) return;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

// Cleanup
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    // ResizeObserver para atualizar câmera e renderer quando o canvas muda de tamanho
    const resizeObserver = new ResizeObserver(() => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvasRef.current);

    return () => {
      running = false;
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      resizeObserver.disconnect();
    };
  }, [canvasRef]);

  // Retorna refs para uso futuro (ex: adicionar objetos)
  return {
    renderer: rendererRef,
    scene: sceneRef,
    camera: cameraRef,
  };
}
