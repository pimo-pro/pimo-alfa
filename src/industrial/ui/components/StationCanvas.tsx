import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

import { industrialCanvasShellStyle } from '@/industrial/ui/layouts/industrialStyles';

import StationChatOverlay from './StationChatOverlay';
import StationNotificationsOverlay from './StationNotificationsOverlay';
import type {
  StationChatConversation,
  StationNotification,
  StationToolMode,
} from './stationTypes';

export interface StationCanvasPiece {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  color?: string;
  highlighted?: boolean;
}

interface StationCanvasProps {
  pieces: StationCanvasPiece[];
  selectedPieceId: string | null;
  toolMode: StationToolMode;
  onSelectPiece: (pieceId: string) => void;
  onClearSelection: () => void;
  notifications: StationNotification[];
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  onDismissNotification: (id: string) => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  conversations: StationChatConversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onSendChatMessage: (body: string, eventAttachment?: string) => void;
  enableSupervisorChat?: boolean;
  stationLabel: string;
}

function StationScene({
  pieces,
  selectedPieceId,
  onSelectPiece,
  onClearSelection,
}: {
  pieces: StationCanvasPiece[];
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
  onClearSelection: () => void;
}) {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const cols = Math.max(1, Math.ceil(Math.sqrt(pieces.length)));

  return (
    <>
      <PerspectiveCamera makeDefault position={[2.4, 1.8, 2.8]} fov={42} near={0.01} far={200} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow onClick={onClearSelection}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#0b1220" />
      </mesh>
      <gridHelper args={[12, 48, '#1e293b', '#1e293b']} position={[0, 0.001, 0]} />

      {pieces.map((piece, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const w = Math.max(0.001, piece.widthMm / 1000);
        const h = Math.max(0.001, piece.thicknessMm / 1000);
        const d = Math.max(0.001, piece.heightMm / 1000);
        const x = (col - (cols - 1) / 2) * 0.55;
        const z = (row - (Math.ceil(pieces.length / cols) - 1) / 2) * 0.55;
        const selected = selectedPieceId === piece.id;
        const color = piece.highlighted ? '#38bdf8' : piece.color ?? '#8b9cb3';

        return (
          <mesh
            key={piece.id}
            position={[x, h / 2, z]}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              onSelectPiece(piece.id);
            }}
          >
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
            {selected || piece.highlighted ? <Edges color="#38bdf8" /> : null}
          </mesh>
        );
      })}

      <OrbitControls ref={orbitRef} enableDamping dampingFactor={0.06} minDistance={0.6} maxDistance={14} target={[0, 0.2, 0]} />
    </>
  );
}

export default function StationCanvas({
  pieces,
  selectedPieceId,
  toolMode,
  onSelectPiece,
  onClearSelection,
  notifications,
  notificationsOpen,
  onToggleNotifications,
  onDismissNotification,
  chatOpen,
  onToggleChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onSendChatMessage,
  enableSupervisorChat,
  stationLabel,
}: StationCanvasProps) {
  const [hint] = useState('Clique para seleccionar · Orbit arrastar · Scroll zoom');

  const displayPieces = useMemo(() => pieces.slice(0, 24), [pieces]);

  return (
    <div style={industrialCanvasShellStyle}>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 2,
          fontSize: 11,
          color: '#94a3b8',
          background: 'rgba(2,6,23,0.7)',
          padding: '4px 8px',
          borderRadius: 6,
        }}
      >
        {stationLabel} · {selectedPieceId ? `Peça ${selectedPieceId}` : hint} · Modo {toolMode}
      </div>

      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <Suspense fallback={null}>
          <StationScene
            pieces={displayPieces}
            selectedPieceId={selectedPieceId}
            onSelectPiece={onSelectPiece}
            onClearSelection={onClearSelection}
          />
        </Suspense>
      </Canvas>

      <StationNotificationsOverlay
        open={notificationsOpen}
        notifications={notifications}
        onClose={onToggleNotifications}
        onDismiss={onDismissNotification}
      />

      <StationChatOverlay
        open={chatOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={onSelectConversation}
        onClose={onToggleChat}
        onSendMessage={onSendChatMessage}
        enableSupervisor={enableSupervisorChat}
      />
    </div>
  );
}
