import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { Text, Billboard } from '@react-three/drei';

import { soundManager } from '../lib/sounds';

import { RobotStatus } from '../types';

interface RobotProps {
  id: number;
  initialPosition: [number, number, number];
  shelfPos: Vector3;
  workstationPos: Vector3;
  maintenancePos: Vector3;
  onStatusChange: (id: number, status: RobotStatus) => void;
  onDeliver: () => void;
  language: 'en' | 'zh';
  isGrabbed: boolean;
  onGrab: (id: number) => void;
  onPositionUpdate?: (id: number, pos: Vector3) => void;
  disabled?: boolean;
  initialStatus?: RobotStatus;
}

export function Robot({ 
  id, 
  initialPosition, 
  shelfPos, 
  workstationPos, 
  maintenancePos,
  onStatusChange, 
  onDeliver,
  language,
  isGrabbed,
  onGrab,
  onPositionUpdate,
  disabled = false,
  initialStatus = 'picking'
}: RobotProps) {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const internalPos = useRef(new Vector3(...initialPosition));
  const [status, setStatus] = useState<RobotStatus>(initialStatus);
  const [hasCargo, setHasCargo] = useState(false);
  const [flash, setFlash] = useState(false);
  
  const speed = 0.02; // Slower speed
  const failureChance = 0.0005; 
  const criticalChance = 0.0002;

  useFrame((state) => {
    if (disabled || !groupRef.current) return;
    
    const currentStatus = status;

    if (isGrabbed) {
      // Follow player with offset
      const targetPos = camera.position.clone();
      // Smoothly follow
      internalPos.current.lerp(new Vector3(targetPos.x, 0.5, targetPos.z), 0.1);
      groupRef.current.position.copy(internalPos.current);
      onPositionUpdate?.(id, internalPos.current);

      if (internalPos.current.distanceTo(maintenancePos) < 2) {
        onStatusChange(id, 'returning');
      }
      return;
    }

    if (currentStatus === 'failed' || currentStatus === 'setup') return;
    
    if (currentStatus === 'critical') {
      // Flashing effect
      if (state.clock.elapsedTime % 0.4 > 0.2) setFlash(true);
      else setFlash(false);
      return;
    }

    // Random failure
    const rand = Math.random();
    if (rand < criticalChance) {
      setStatus('critical');
      onStatusChange(id, 'critical');
      return;
    } else if (rand < failureChance) {
      setStatus('failed');
      onStatusChange(id, 'failed');
      return;
    }

    let target = shelfPos.clone();
    if (hasCargo) {
      target = workstationPos.clone();
    }

    // Simple pathfinding: move along X then Z to stay on grid/QR codes
    const direction = new Vector3();
    const diffX = target.x - internalPos.current.x;
    const diffZ = target.z - internalPos.current.z;

    if (Math.abs(diffX) > 0.1) {
      direction.set(Math.sign(diffX), 0, 0);
    } else if (Math.abs(diffZ) > 0.1) {
      direction.set(0, 0, Math.sign(diffZ));
    }
    
    if (direction.length() > 0) {
      direction.multiplyScalar(speed);
      internalPos.current.add(direction);
      onPositionUpdate?.(id, internalPos.current);
      if (groupRef.current) {
        groupRef.current.position.copy(internalPos.current);
        // Look in direction of movement
        const lookTarget = internalPos.current.clone().add(direction);
        groupRef.current.lookAt(lookTarget.x, 0.5, lookTarget.z);
      }
    } else {
      // Reached target
      if (!hasCargo) {
        setHasCargo(true);
        setStatus('delivering');
        onStatusChange(id, 'delivering');
      } else {
        setHasCargo(false);
        onDeliver();
        setStatus('picking');
        onStatusChange(id, 'picking');
      }
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Use ref for distance check to avoid re-adding listener
      if (disabled || !internalPos.current) return;
      const dist = internalPos.current.distanceTo(camera.position);
      if (dist > 2.5) return;

      if (e.key.toLowerCase() === 'r' && status === 'failed') {
        soundManager.playReboot();
        setStatus(hasCargo ? 'delivering' : 'picking');
        onStatusChange(id, hasCargo ? 'delivering' : 'picking');
      }

      if (e.key.toLowerCase() === 'p' && (status === 'critical' || status === 'setup' || isGrabbed)) {
        onGrab(id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, id, onStatusChange, maintenancePos, hasCargo, onGrab, disabled, camera, isGrabbed]);

  const t = {
    en: { failed: "FAILED! (R)", critical: "CRITICAL! (P to Grab)" },
    zh: { failed: "故障！(按R重启)", critical: "严重故障！(按P抓取)" }
  }[language];

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* Robot Body */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.8]} />
        <meshStandardMaterial 
          color={status === 'critical' ? (flash ? '#ff0000' : '#550000') : (status === 'failed' ? '#ff4444' : '#4488ff')} 
        />
      </mesh>
      
      {/* Cargo */}
      {hasCargo && (
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      )}

      {/* Status Indicator */}
      {(status === 'failed' || status === 'critical') && (
        <Billboard position={[0, 1.5, 0]}>
          <Text
            fontSize={0.25}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            {status === 'failed' ? t.failed : t.critical}
          </Text>
        </Billboard>
      )}

      {/* Wheels */}
      <mesh position={[0.3, 0.1, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.3, 0.1, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}
