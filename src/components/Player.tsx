import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Html } from '@react-three/drei';
import { Vector3, PerspectiveCamera as ThreePerspectiveCamera } from 'three';

interface CollisionObject {
  x: number;
  z: number;
  w: number; // width (x-axis)
  h: number; // depth (z-axis)
}

interface PlayerProps {
  onPositionUpdate?: (pos: Vector3) => void;
  isGrabbing: boolean;
  canMove: boolean;
  obstacles?: CollisionObject[];
  initialPosition?: Vector3;
  onLockChange?: (locked: boolean) => void;
}

export function Player({ onPositionUpdate, isGrabbing, canMove, obstacles = [], initialPosition, onLockChange }: PlayerProps) {
  const { camera, gl } = useThree();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    onLockChange?.(isLocked);
  }, [isLocked, onLockChange]);
  
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  
  const velocity = useRef(new Vector3());
  const direction = useRef(new Vector3());
  const lastUpdatePos = useRef(new Vector3());
  const lastLockRequest = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const hasInitialized = useRef(false);

  // Set initial position once on mount
  useLayoutEffect(() => {
    // Always reset FOV and clipping planes when a camera is assigned to this player
    if (camera instanceof ThreePerspectiveCamera) {
      camera.fov = 75;
      camera.near = 0.1;
      camera.far = 1000;
      camera.updateProjectionMatrix();
    }

    if (hasInitialized.current) return;
    
    if (initialPosition) {
      camera.position.copy(initialPosition);
      // Only look at center if we are at the default start
      if (initialPosition.x === 0 && initialPosition.z === 10) {
        camera.lookAt(0, 1.6, 0);
      }
    } else {
      camera.position.set(0, 1.6, 10);
      camera.lookAt(0, 1.6, 0);
    }
    
    lastUpdatePos.current.copy(camera.position);
    hasInitialized.current = true;
  }, [camera, initialPosition]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!canMove || !isLocked) return;
      switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward.current = true; break;
        case 'ArrowLeft': case 'KeyA': moveLeft.current = true; break;
        case 'ArrowDown': case 'KeyS': moveBackward.current = true; break;
        case 'ArrowRight': case 'KeyD': moveRight.current = true; break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward.current = false; break;
        case 'ArrowLeft': case 'KeyA': moveLeft.current = false; break;
        case 'ArrowDown': case 'KeyS': moveBackward.current = false; break;
        case 'ArrowRight': case 'KeyD': moveRight.current = false; break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    // Removed handleGlobalKeyDown to avoid re-locking immediately after ESC exit
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      // Explicitly exit pointer lock on unmount with safety check
      if (isMounted.current && document.pointerLockElement === gl.domElement) {
        try {
          document.exitPointerLock();
        } catch (e) {
          // Ignore exit errors
        }
      }
    };
  }, [canMove, isLocked, gl]);

  const handleLock = useRef(() => setIsLocked(true));
  const handleUnlock = useRef(() => setIsLocked(false));

  useEffect(() => {
    handleLock.current = () => setIsLocked(true);
    handleUnlock.current = () => setIsLocked(false);
  }, []);

  useEffect(() => {
    if (onLockChange) onLockChange(isLocked);
  }, [isLocked, onLockChange]);

  // Pre-allocate vectors to avoid GC pressure
  const _forward = useRef(new Vector3());
  const _right = useRef(new Vector3());

  useFrame((state, delta) => {
    const activeCamera = state.camera;
    const dt = Math.min(delta, 0.1);

    if (!canMove || !isLocked) {
      velocity.current.set(0, 0, 0);
      return;
    }

    const speed = isGrabbing ? 25.0 : 40.0; 
    const friction = 8.0;
    
    velocity.current.x -= velocity.current.x * friction * dt;
    velocity.current.z -= velocity.current.z * friction * dt;

    // Movement direction relative to camera (horizontal only)
    _forward.current.set(0, 0, -1).applyQuaternion(activeCamera.quaternion);
    _forward.current.y = 0;
    if (_forward.current.lengthSq() < 0.001) {
      // If looking straight up/down, use a fallback based on camera's UP vector
      _forward.current.set(0, 0, -1).applyQuaternion(activeCamera.quaternion);
      _forward.current.y = 0;
    }
    _forward.current.normalize();
    
    _right.current.set(1, 0, 0).applyQuaternion(activeCamera.quaternion);
    _right.current.y = 0;
    _right.current.normalize();

    direction.current.set(0, 0, 0);
    if (moveForward.current) direction.current.add(_forward.current);
    if (moveBackward.current) direction.current.sub(_forward.current);
    if (moveRight.current) direction.current.add(_right.current);
    if (moveLeft.current) direction.current.sub(_right.current);
    
    if (direction.current.lengthSq() > 0) {
      direction.current.normalize();
      velocity.current.x += direction.current.x * speed * dt;
      velocity.current.z += direction.current.z * speed * dt;
    }

    const playerRadius = isGrabbing ? 0.8 : 0.35; 

    const checkCollision = (x: number, z: number) => {
      for (const obj of obstacles) {
        const dx = Math.abs(x - obj.x);
        const dz = Math.abs(z - obj.z);
        if (dx < (obj.w / 2) + playerRadius && dz < (obj.h / 2) + playerRadius) {
          return obj; 
        }
      }
      return null;
    };

    // Move X and check
    const nextX = activeCamera.position.x + velocity.current.x * dt;
    if (!checkCollision(nextX, activeCamera.position.z)) {
      activeCamera.position.x = nextX;
    } else {
      velocity.current.x = 0;
    }

    // Move Z and check
    const nextZ = activeCamera.position.z + velocity.current.z * dt;
    if (!checkCollision(activeCamera.position.x, nextZ)) {
      activeCamera.position.z = nextZ;
    } else {
      velocity.current.z = 0;
    }

    // Keep player on ground and within boundaries
    activeCamera.position.y = 1.6;
    activeCamera.position.x = Math.max(-15.5, Math.min(15.5, activeCamera.position.x));
    activeCamera.position.z = Math.max(-15.5, Math.min(15.5, activeCamera.position.z));

    // Throttled position update
    if (onPositionUpdate && activeCamera.position.distanceTo(lastUpdatePos.current) > 0.05) {
      onPositionUpdate(activeCamera.position.clone());
      lastUpdatePos.current.copy(activeCamera.position);
    }
  });

  return (
    <>
      <PointerLockControls onLock={handleLock.current} onUnlock={handleUnlock.current} />
      {!isLocked && (
        <Html center zIndexRange={[100, 200]}>
          <div 
            className="flex flex-col items-center gap-6 pointer-events-auto cursor-pointer group"
            onClick={() => {
              const now = Date.now();
              // Browsers often have a strict 1.5s cooldown after Esc before re-locking
              if (now - lastLockRequest.current < 1500) return; 
              
              if (gl.domElement && isMounted.current) {
                try {
                  lastLockRequest.current = now;
                  // Focus first
                  gl.domElement.focus();
                  const promise = gl.domElement.requestPointerLock();
                  // Some browsers return a promise
                  if (promise && (promise as any).catch) {
                    (promise as any).catch((err: any) => {
                      console.warn("Pointer lock error:", err);
                    });
                  }
                } catch (e) {
                  console.warn("Pointer lock request failed:", e);
                }
              }
            }}
          >
            <div className="bg-blue-600 text-white px-12 py-6 rounded-3xl font-black uppercase tracking-[0.2em] animate-pulse shadow-[0_0_50px_rgba(59,130,246,0.5)] border-2 border-white/20 whitespace-nowrap text-xl transition-transform group-hover:scale-105">
              Click to Start / 点击开始
            </div>
            <div className="text-white/60 text-sm font-bold uppercase tracking-widest animate-bounce">
              User interaction required / 需要点击以开始
            </div>
          </div>
        </Html>
      )}
    </>
  );
}
