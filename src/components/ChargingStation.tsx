import { useRef } from 'react';
import { Box, Text } from '@react-three/drei';
import { Vector3 } from 'three';

interface ChargingStationProps {
  position: [number, number, number];
  isManual: boolean;
  isUnlocked: boolean;
  onInteract: () => void;
}

export function ChargingStation({ position, isManual, isUnlocked, onInteract }: ChargingStationProps) {
  return (
    <group position={position}>
      {/* Base */}
      <Box args={[2, 0.1, 2]} position={[0, 0.05, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      
      {/* Pillar */}
      <Box args={[0.4, 2, 0.4]} position={[0, 1, -0.8]}>
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
      </Box>
      
      {/* Screen Housing */}
      <group position={[0, 1.5, -0.55]} rotation={[-0.2, 0, 0]}>
        <Box args={[0.8, 0.6, 0.1]}>
          <meshStandardMaterial color="#0066ff" />
        </Box>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.08}
          color={isUnlocked ? "#00ff00" : "#ff0000"}
          fontWeight="bold"
        >
          {isUnlocked ? (isManual ? "MANUAL MODE" : "AUTO MODE") : "LOCKED"}
        </Text>
        <Text
          position={[0, -0.2, 0.06]}
          fontSize={0.05}
          color="white"
        >
          Press [C] to Interact
        </Text>
      </group>
      
      {/* Floor Indicator - Placement Area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.2, 1.4, 32]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.1} />
      </mesh>
      <Text
        position={[0, 0.02, 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="#00aaff"
        fontWeight="bold"
      >
        ROBOT PLACEMENT AREA
      </Text>
    </group>
  );
}
