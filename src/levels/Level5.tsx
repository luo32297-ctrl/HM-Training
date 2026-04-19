import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, PerspectiveCamera, Box, Plane, Text, Billboard, Html } from '@react-three/drei';
import { Vector3, Group, Mesh, Color } from 'three';
import { Warehouse } from '../components/Warehouse';
import { Player } from '../components/Player';
import { ArrowLeft, CheckCircle2, Info, ShieldAlert, Zap, Radio, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { Language } from '../types';

interface Level5Props {
  language: Language;
  starReq: string;
  onExit: (success: boolean) => void;
}

const BEACON_POSITIONS = [
  new Vector3(-8, 0, -8),
  new Vector3(8, 0, -8),
  new Vector3(8, 0, 8),
  new Vector3(-8, 0, 8),
  new Vector3(0, 0, 0),
];

export function Level5({ language, starReq, onExit }: Level5Props) {
  const playerPos = useRef(new Vector3(0, 1.6, 10));
  const [hasPlayerMoved, setHasPlayerMoved] = useState(false);

  // Track initial movement to hide prompt
  useEffect(() => {
    const handleMove = (e: KeyboardEvent | MouseEvent) => {
      setHasPlayerMoved(true);
    };
    window.addEventListener('keydown', handleMove);
    window.addEventListener('mousedown', handleMove);
    return () => {
      window.removeEventListener('keydown', handleMove);
      window.removeEventListener('mousedown', handleMove);
    };
  }, []);

  const [robotPos, setRobotPos] = useState(new Vector3(0, 0, -10));
  const [isRobotStopped, setIsRobotStopped] = useState(false);
  const [currentBeaconIndex, setCurrentBeaconIndex] = useState(0);
  const robotPosRef = useRef(new Vector3(0, 0, -10));
  const currentBeaconIndexRef = useRef(0);
  
  useEffect(() => { currentBeaconIndexRef.current = currentBeaconIndex; }, [currentBeaconIndex]);

  const initialPlayerPos = useMemo(() => new Vector3(0, 1.6, 10), []);

  const [isDeviceActive, setIsDeviceActive] = useState(false);
  const [isDeviceOnCooldown, setIsDeviceOnCooldown] = useState(false);
  const [gameOver, setGameOver] = useState<'none' | 'success' | 'fail'>('none');

  useEffect(() => {
    if (gameOver === 'success') {
      onExit(true);
    }
  }, [gameOver, onExit]);

  const t = {
    en: {
      title: "Obstacle Avoidance Training",
      instruction: "Reach 5 destinations. Use [E] to stop the AGV for 3s.",
      beacon: "Destination",
      complete: "TRAINING COMPLETE",
      fail: "COLLISION DETECTED!",
      restart: "RETRY",
      back: "Back to Menu",
      deviceActive: "DEVICE ACTIVE",
      deviceCooldown: "DEVICE COOLDOWN",
      deviceReady: "DEVICE READY [E]",
      finalTitle: "Safety Training Complete",
      finalMsg: "You have mastered the use of the remote obstacle avoidance device. In real operations, always maintain a safe distance from moving AGVs.",
      finish: "FINISH",
      controls: "Controls",
      move: "Move",
      look: "Look",
      interact: "Activate Device [E]",
      agvStopped: "STOPPED (3s)"
    },
    zh: {
      title: "避障器使用教学",
      instruction: "依次到达5个目的地。按 [E] 键使AGV停止3秒。",
      beacon: "目的地",
      complete: "培训完成",
      fail: "发生碰撞！",
      restart: "重试",
      back: "返回菜单",
      deviceActive: "避障器已激活",
      deviceCooldown: "避障器冷却中",
      deviceReady: "避障器就绪 [E]",
      finalTitle: "安全培训完成",
      finalMsg: "你已掌握远程避障器的使用。在真实现场，请始终与运行中的AGV保持安全距离。",
      finish: "完成",
      controls: "操作指南",
      move: "移动",
      look: "视角",
      interact: "激活避障器 [E]",
      agvStopped: "已停止 (3s)"
    }
  }[language];
  
  // Device logic stabilized
  const handleActivateDevice = useCallback(() => {
    // Check state values via refs if possible or just rely on state if called from event
    setIsDeviceActive(prev => {
      if (prev || gameOver !== 'none') return prev;
      setIsRobotStopped(true);
      setIsDeviceOnCooldown(true);
      soundManager.playDevice();
      return true;
    });
  }, [gameOver]);

  // Timer for Freeze Duration (3s)
  useEffect(() => {
    if (isDeviceActive) {
      const timer = setTimeout(() => {
        setIsDeviceActive(false);
        setIsRobotStopped(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDeviceActive]);

  // Timer for Cooldown Duration (3s) - Starts AFTER freeze ends
  useEffect(() => {
    if (isDeviceOnCooldown && !isDeviceActive) {
      const timer = setTimeout(() => {
        setIsDeviceOnCooldown(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDeviceOnCooldown, isDeviceActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') {
        handleActivateDevice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleActivateDevice]);

  // Collision detection and beacon progress
  const initialPos = useMemo(() => new Vector3(0, 1.6, 10), []);

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault fov={75} />
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Warehouse language={language} showFacilities={false} />
        
        <Level5Logic 
          gameOver={gameOver}
          playerPos={playerPos}
          initialPlayerPos={initialPlayerPos}
          hasPlayerMoved={hasPlayerMoved}
          setHasPlayerMoved={setHasPlayerMoved}
          currentBeaconIndex={currentBeaconIndex}
          setCurrentBeaconIndex={setCurrentBeaconIndex}
          setGameOver={setGameOver}
          robotPosRef={robotPosRef}
          setRobotPos={setRobotPos}
          setIsRobotStopped={setIsRobotStopped}
          setIsDeviceActive={setIsDeviceActive}
        />

        {/* Beacons */}
        {BEACON_POSITIONS.map((pos, i) => (
          <Beacon 
            key={`beacon-${i}`} 
            position={pos} 
            active={i === currentBeaconIndex} 
            label={`${t.beacon} ${i + 1}`}
          />
        ))}

        {/* AGV Robot */}
        <AGV 
          position={robotPos} 
          targetPos={playerPos.current} 
          stopped={isRobotStopped || !hasPlayerMoved} 
          onPositionUpdate={(pos) => robotPosRef.current.copy(pos)}
          gameOver={gameOver !== 'none'}
          stoppedText={t.agvStopped}
        />

        <Player 
          onPositionUpdate={(pos) => playerPos.current.copy(pos)} 
          isGrabbing={false} 
          canMove={gameOver === 'none'} 
          initialPosition={initialPos}
        />

        {/* Handheld Remote Device */}
        <HandheldRemote active={isDeviceActive} cooldown={isDeviceOnCooldown} />
      </Canvas>

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        <div className="w-1 h-1 bg-white/50 rounded-full" />
      </div>

      {/* UI */}
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-10 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-4 rounded-br-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-[8px] px-2 py-0.5 font-bold rounded-bl-lg shadow-lg">
              {language === 'zh' ? "Hotmeer 正品防伪标签" : "Hotmeer Genuine Product"}
            </div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <ShieldAlert size={20} className="text-red-500" />
              {t.title}
            </h1>
            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <Target size={10} /> {starReq}
            </p>
            <p className="text-[10px] text-white/50 mt-1 uppercase tracking-widest">{t.instruction}</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex gap-1">
                {BEACON_POSITIONS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-8 h-1.5 rounded-full transition-all duration-500 ${i < currentBeaconIndex ? 'bg-green-500' : i === currentBeaconIndex ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`} 
                  />
                ))}
              </div>
              <span className="text-xs font-mono text-white/40">{currentBeaconIndex}/{BEACON_POSITIONS.length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <button onClick={() => onExit(gameOver === 'success')} className="pointer-events-auto bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase">
              <ArrowLeft size={14} /> {t.back}
            </button>
            
            <div className={`transition-all duration-300 p-4 rounded-2xl border flex items-center gap-3 shadow-2xl ${isDeviceActive ? 'bg-red-500/20 border-red-500/50 scale-110' : isDeviceOnCooldown ? 'bg-yellow-500/10 border-yellow-500/30 opacity-80' : 'bg-blue-500/10 border-blue-500/30'}`}>
              <Radio size={20} className={isDeviceActive ? 'text-red-500 animate-ping' : isDeviceOnCooldown ? 'text-yellow-500' : 'text-blue-500'} />
              <div className="text-right">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDeviceActive ? 'text-red-500' : isDeviceOnCooldown ? 'text-yellow-500' : 'text-blue-500/50'}`}>
                  {isDeviceActive ? t.deviceActive : isDeviceOnCooldown ? t.deviceCooldown : t.deviceReady}
                </p>
                {isDeviceActive && <div className="h-1 bg-red-500 mt-1 animate-[shrink_3s_linear_forwards]" />}
                {isDeviceOnCooldown && !isDeviceActive && <div className="h-1 bg-yellow-500 mt-1 animate-[shrink_3s_linear_forwards]" />}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl max-w-xs">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
              <Info size={12} /> {t.controls}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
              <span className="text-white/30 uppercase tracking-tighter">{t.move}</span>
              <span className="text-white/80">WASD</span>
              <span className="text-white/30 uppercase tracking-tighter">{t.look}</span>
              <span className="text-white/80">MOUSE</span>
              <span className="text-white/30 uppercase tracking-tighter">{t.interact}</span>
              <span className="text-white/80 font-bold text-red-500">[E]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instruction Overlay */}
      <AnimatePresence>
        {!hasPlayerMoved && gameOver === 'none' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-[0_0_50px_rgba(59,130,246,0.3)] border-2 border-white/20 text-center animate-bounce">
              {language === 'zh' ? "按任意键开始培训" : "PRESS ANY KEY TO START"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence>
        {gameOver === 'fail' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-900/40 backdrop-blur-md flex items-center justify-center z-[100]"
          >
            <div className="text-center">
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-8xl font-black text-white mb-4 tracking-tighter uppercase italic">
                {t.fail}
              </motion.div>
              <p className="text-white/60 font-mono tracking-widest uppercase">{t.restart}...</p>
            </div>
          </motion.div>
        )}

        {gameOver === 'success' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-6"
          >
            <div className="max-w-2xl bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500" />
              
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-8 border border-green-500/30">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              
              <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase">{t.finalTitle}</h2>
              <p className="text-lg text-white/70 leading-relaxed mb-10">{t.finalMsg}</p>

              <button 
                onClick={() => onExit(true)}
                className="pointer-events-auto w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {t.finish}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

function Beacon({ position, active, label }: { position: Vector3, active: boolean, label: string }) {
  const ref = useRef<Mesh>(null);
  
  useFrame((state) => {
    if (ref.current && active) {
      ref.current.rotation.y += 0.05;
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.2 + 0.5;
    }
  });

  if (!active) return null;

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Ground Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.2, 1.5, 32]} />
        <meshBasicMaterial color="#0088ff" transparent opacity={0.3} />
      </mesh>
      
      {/* Floating Diamond */}
      <mesh ref={ref} position={[0, 1, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#0088ff" emissive="#0088ff" emissiveIntensity={2} />
      </mesh>

      {/* Light Beam */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.1, 0.5, 10, 16]} />
        <meshBasicMaterial color="#0088ff" transparent opacity={0.1} />
      </mesh>

      <Billboard position={[0, 2, 0]}>
        <Text fontSize={0.3} color="white" fontWeight="bold" outlineWidth={0.02} outlineColor="black">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

function AGV({ position, targetPos, stopped, onPositionUpdate, gameOver, stoppedText }: { position: Vector3, targetPos: Vector3, stopped: boolean, onPositionUpdate: (v: Vector3) => void, gameOver: boolean, stoppedText: string }) {
  const ref = useRef<Group>(null);
  const currentPosRef = useRef(new Vector3().copy(position));
  const directionRef = useRef(new Vector3());
  const speed = 0.068; // Reduced by 15% from original 0.08

  // Sync with prop if it changes externally (e.g. level reset)
  useEffect(() => {
    currentPosRef.current.copy(position);
    if (ref.current) ref.current.position.copy(position);
  }, [position]);

  useFrame(() => {
    if (stopped || gameOver) return;

    directionRef.current.subVectors(targetPos, currentPosRef.current);
    directionRef.current.y = 0; // Keep on ground
    
    if (directionRef.current.length() > 0.1) {
      directionRef.current.normalize().multiplyScalar(speed);
      currentPosRef.current.add(directionRef.current);
      onPositionUpdate(currentPosRef.current);
      if (ref.current) {
        ref.current.position.copy(currentPosRef.current);
        ref.current.lookAt(targetPos.x, 0.5, targetPos.z);
      }
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Robot Body - Matching Level 1/2 Model */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.8]} />
        <meshStandardMaterial color={stopped ? "#ffaa00" : "#4488ff"} />
      </mesh>
      
      {/* Cargo Box */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* Wheels */}
      {[[-0.3, 0.1, 0.2], [0.3, 0.1, 0.2], [-0.3, 0.1, -0.2], [0.3, 0.1, -0.2]].map((pos, i) => (
        <mesh key={i} position={pos as any} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}

      {stopped && (
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.3} color="#ffaa00" fontWeight="bold">
            {stoppedText}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

function HandheldRemote({ active, cooldown }: { active: boolean, cooldown: boolean }) {
  const { camera } = useThree();
  const ref = useRef<Group>(null);

  useFrame(() => {
    if (ref.current) {
      // Position relative to camera (bottom right)
      const offset = new Vector3(0.5, -0.4, -0.8);
      offset.applyQuaternion(camera.quaternion);
      ref.current.position.copy(camera.position).add(offset);
      ref.current.quaternion.copy(camera.quaternion);
      
      // Slight tilt
      ref.current.rotateX(0.2);
      
      // Shake if active
      if (active) {
        ref.current.position.x += (Math.random() - 0.5) * 0.01;
        ref.current.position.y += (Math.random() - 0.5) * 0.01;
      }
    }
  });

  return (
    <group ref={ref}>
      {/* Remote Body */}
      <mesh>
        <boxGeometry args={[0.2, 0.3, 0.05]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Screen/Indicator */}
      <mesh position={[0, 0.05, 0.026]}>
        <planeGeometry args={[0.15, 0.1]} />
        <meshBasicMaterial color={active ? "#ff0000" : cooldown ? "#ffaa00" : "#0088ff"} />
      </mesh>

      {/* Button */}
      <mesh position={[0, -0.1, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        <meshStandardMaterial color={active ? "#ff4444" : "#ff0000"} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0.05, 0.15, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.1, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}

function Level5Logic({ 
  gameOver, 
  playerPos, 
  initialPlayerPos,
  hasPlayerMoved,
  setHasPlayerMoved,
  currentBeaconIndex, 
  setCurrentBeaconIndex, 
  setGameOver, 
  robotPosRef, 
  setRobotPos, 
  setIsRobotStopped, 
  setIsDeviceActive 
}: {
  gameOver: string,
  playerPos: React.MutableRefObject<Vector3>,
  initialPlayerPos: Vector3,
  hasPlayerMoved: boolean,
  setHasPlayerMoved: React.Dispatch<React.SetStateAction<boolean>>,
  currentBeaconIndex: number,
  setCurrentBeaconIndex: React.Dispatch<React.SetStateAction<number>>,
  setGameOver: React.Dispatch<React.SetStateAction<string>>,
  robotPosRef: React.MutableRefObject<Vector3>,
  setRobotPos: React.Dispatch<React.SetStateAction<Vector3>>,
  setIsRobotStopped: React.Dispatch<React.SetStateAction<boolean>>,
  setIsDeviceActive: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const lastHitIndex = useRef(-1);

  useFrame(() => {
    if (gameOver !== 'none') return;

    // Detect first movement
    if (!hasPlayerMoved) {
      if (playerPos.current.distanceTo(initialPlayerPos) > 0.5) {
        setHasPlayerMoved(true);
      }
      return;
    }

    // Check beacon
    if (lastHitIndex.current !== currentBeaconIndex) {
      const distToBeacon = playerPos.current.distanceTo(new Vector3(BEACON_POSITIONS[currentBeaconIndex].x, 1.6, BEACON_POSITIONS[currentBeaconIndex].z));
      if (distToBeacon < 1.5) {
        lastHitIndex.current = currentBeaconIndex;
        soundManager.playSuccess();
        if (currentBeaconIndex === BEACON_POSITIONS.length - 1) {
          setGameOver('success');
        } else {
          setCurrentBeaconIndex(prev => prev + 1);
        }
      }
    }

    // Check collision with robot
    const robotV3 = robotPosRef.current;
    const distToRobot = playerPos.current.distanceTo(new Vector3(robotV3.x, 1.6, robotV3.z));
    if (distToRobot < 1.2) {
      soundManager.playCrash();
      setGameOver('fail');
      setTimeout(() => {
        // Reset level
        setGameOver('none');
        setRobotPos(new Vector3(0, 0, -10));
        robotPosRef.current.set(0, 0, -10);
        setCurrentBeaconIndex(0);
        lastHitIndex.current = -1;
        setIsRobotStopped(false);
        setIsDeviceActive(false);
        setHasPlayerMoved(false);
      }, 2000);
    }
  });
  return null;
}
