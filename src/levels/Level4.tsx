import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars, PerspectiveCamera, Box, Plane, Text, Billboard } from '@react-three/drei';
import { Vector3, Group, Mesh, Color } from 'three';
import { Warehouse } from '../components/Warehouse';
import { Player } from '../components/Player';
import { ArrowLeft, CheckCircle2, Info, Activity, AlertTriangle, Terminal, RefreshCw, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { Language } from '../types';

interface Level4Props {
  language: Language;
  starReq: string;
  onExit: (score: number) => void;
}

const CONVEYOR_START = new Vector3(-8, 0.8, 0);
const CONVEYOR_END = new Vector3(8, 0.8, 0);
const CONTROL_PANEL_POS = new Vector3(0, 0, -5);

export function Level4({ language, starReq, onExit }: Level4Props) {
  const playerPos = useRef(new Vector3(0, 1.6, 12));
  const isConveyorRunningRef = useRef(true);
  const isSystemLockedRef = useRef(false);
  const gameOverRef = useRef<'none' | 'timeout' | 'success' | 'hunger'>('none');
  const cargoRef = useRef<{ id: number; pos: number; isJammed: boolean }[]>([]);

  const [isConveyorRunning, setIsConveyorRunning] = useState(true);
  const [isSystemLocked, setIsSystemLocked] = useState(false);
  const [jamCount, setJamCount] = useState(0);
  const [cargoList, setCargoList] = useState<{ id: number; pos: number; isJammed: boolean }[]>([]);
  const [nextCargoId, setNextCargoId] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  
  const [showTerminal, setShowTerminal] = useState(false);
  const [inputBuffer, setInputBuffer] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameOver, setGameOver] = useState<'none' | 'timeout' | 'success' | 'hunger'>('none');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [hunger, setHunger] = useState(10);

  // Sync refs with state for useFrame access
  useEffect(() => { isConveyorRunningRef.current = isConveyorRunning; }, [isConveyorRunning]);
  useEffect(() => { isSystemLockedRef.current = isSystemLocked; }, [isSystemLocked]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const t = {
    en: {
      title: "Conveyor Maintenance",
      status: "SYSTEM STATUS",
      running: "RUNNING",
      stopped: "STOPPED",
      locked: "SYSTEM LOCKED",
      jammed: "CARGO JAMMED",
      resetRequired: "RESET REQUIRED AT CONSOLE",
      terminal: "CONTROL CONSOLE",
      enterCode: "ENTER RESET CODE (12345)",
      jams: "Cumulative Jams",
      delivered: "Processed",
      timeout: "SYSTEM TIMEOUT",
      hunger: "STARVATION",
      restart: "RETRY",
      back: "Back to Menu",
      controls: "Controls",
      interact: "Interact",
      fix: "Fix Jam",
      reset: "Reset Console",
      move: "Move",
      look: "Look",
      coins: "Coins",
      hungerLabel: "Hunger",
      vending: "Vending Machine",
      buyBread: "Buy Bread (5 Coins)",
      eat: "Eat [F]",
      lowHunger: "LOW ENERGY! GO TO VENDING MACHINE"
    },
    zh: {
      title: "输送线维护实操",
      status: "系统状态",
      running: "运行中",
      stopped: "已停止",
      locked: "系统锁定",
      jammed: "货物堵塞",
      resetRequired: "需到中控台重置",
      terminal: "中控台终端",
      enterCode: "输入重置代码 (12345)",
      jams: "累计故障",
      delivered: "已处理",
      timeout: "系统超时",
      hunger: "饥饿过度",
      restart: "重试",
      back: "返回菜单",
      controls: "操作指南",
      interact: "交互",
      fix: "清理堵塞",
      reset: "中控台重置",
      move: "移动",
      look: "视角",
      coins: "金币",
      hungerLabel: "饥饿度",
      vending: "自动贩卖机",
      buyBread: "购买面包 (5金币)",
      eat: "食用 [F]",
      lowHunger: "能量不足！请前往贩卖机"
    }
  }[language];

  // Hunger logic - removed time-based decrease per user request
  useEffect(() => {
    if (gameOver !== 'none') return;
    // Hunger only decreases when processing a box (fixing a jam)
  }, [gameOver]);

  // Timer logic for timeout - Persistent countdown
  useEffect(() => {
    if (gameOver !== 'none') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver('timeout');
          soundManager.playReboot();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver]);

  // Cargo spawning and movement logic moved to a stabilized structure
  useEffect(() => {
    if (gameOver !== 'none') return;

    const spawnInterval = setInterval(() => {
      if (!isConveyorRunningRef.current || isSystemLockedRef.current || gameOverRef.current !== 'none') return;
      
      setCargoList(prev => {
        if (prev.length >= 8) return prev;
        const newCargo = { id: Math.random(), pos: 0, isJammed: false };
        const newList = [...prev, newCargo];
        cargoRef.current = newList;
        return newList;
      });
    }, 1200);

    return () => clearInterval(spawnInterval);
  }, [gameOver]);

  // Main game logic controller to handle frame updates within Canvas context
  const GameController = () => {
    const lastUpdate = useRef(0);
    useFrame((state, delta) => {
      if (gameOverRef.current !== 'none' || !isConveyorRunningRef.current || isSystemLockedRef.current) return;

      const now = state.clock.elapsedTime;
      if (now - lastUpdate.current < 0.01) return;
      lastUpdate.current = now;

      let deliveredCount = 0;

      const newList = cargoRef.current.map(cargo => {
        if (cargo.isJammed) return cargo;
        
        const isAnyAheadJammed = cargoRef.current.some(c => c.isJammed && c.pos > cargo.pos);
        if (isAnyAheadJammed) return cargo;

        if (cargo.pos > 0.2 && cargo.pos < 0.8 && Math.random() < 0.003) {
          soundManager.playReboot();
          return { ...cargo, isJammed: true };
        }

        const speed = 0.8; // traversal in ~1.25s
        const nextPos = cargo.pos + delta * speed;
        if (nextPos >= 1) {
          deliveredCount++;
          return null;
        }
        return { ...cargo, pos: nextPos };
      }).filter((c): c is { id: number; pos: number; isJammed: boolean } => c !== null);

      cargoRef.current = newList;
      setCargoList(newList);
      
      if (deliveredCount > 0) {
        setScore(s => s + deliveredCount);
        setTimeLeft(15);
        soundManager.playSuccess();
      }
    });
    return null;
  };

  const handleInteract = useCallback(() => {
    if (gameOver !== 'none') return;

    // Find closest jammed cargo
    let closestJammed: any = null;
    let minDist = Infinity;

    cargoList.forEach(c => {
      if (c.isJammed) {
        const cargoWorldPos = new Vector3().lerpVectors(CONVEYOR_START, CONVEYOR_END, c.pos);
        const dist = playerPos.current.distanceTo(new Vector3(cargoWorldPos.x, 1.6, cargoWorldPos.z));
        if (dist < 2.5 && dist < minDist) {
          minDist = dist;
          closestJammed = c;
        }
      }
    });

    if (closestJammed) {
      // 1:1:1:1 Data Alignment
      setCoins(c => c + 1);
      setScore(s => s + 1);
      setTimeLeft(15); // Reset timer on fix
      setJamCount(prevCount => {
        const nextCount = prevCount + 1;
        if (nextCount % 10 === 0 && nextCount > 0) {
          setIsSystemLocked(true);
          setIsConveyorRunning(false);
          soundManager.playReboot();
        }
        return nextCount;
      });
      setHunger(h => {
        const nextHunger = h - 1;
        if (nextHunger <= 0) {
          setGameOver('hunger');
          soundManager.playReboot();
          return 0;
        }
        return nextHunger;
      });

      const nextList = cargoList.map(c => c.id === closestJammed.id ? { ...c, isJammed: false } : c);
      cargoRef.current = nextList;
      setCargoList(nextList);
      
      const remainingJams = nextList.filter(c => c.isJammed).length;
      if (remainingJams === 0 && !isSystemLocked) {
        setIsConveyorRunning(true);
      }
      
      soundManager.playSuccess();
      return;
    }

    // Check distance to control panel
    const distToPanel = playerPos.current.distanceTo(new Vector3(CONTROL_PANEL_POS.x, 1.6, CONTROL_PANEL_POS.z));
    if (distToPanel < 2.5 && isSystemLocked) {
      setShowTerminal(true);
      setInputBuffer("");
      return;
    }

    // Check distance to vending machine
    const distToVending = playerPos.current.distanceTo(new Vector3(5, 1.6, 5));
    if (distToVending < 2.5) {
      if (coins >= 5) {
        setCoins(prev => prev - 5);
        setHunger(prev => Math.min(10, prev + 5));
        soundManager.playSuccess();
      } else {
        soundManager.playReboot();
      }
      return;
    }
  }, [cargoList, isSystemLocked, gameOver, coins]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showTerminal) {
        if (e.key === 'Enter') {
          if (inputBuffer === "12345") {
            setIsSystemLocked(false);
            setIsConveyorRunning(true);
            setJamCount(0);
            setShowTerminal(false);
            soundManager.playSuccess();
          } else {
            soundManager.playReboot();
            setInputBuffer("");
          }
          return;
        }
        if (e.key === 'Backspace') {
          setInputBuffer(prev => prev.slice(0, -1));
          return;
        }
        if (e.key === 'Escape') {
          setShowTerminal(false);
          return;
        }
        if (/[0-9]/.test(e.key) && inputBuffer.length < 10) {
          setInputBuffer(prev => prev + e.key);
        }
        return;
      }

      if (e.key.toLowerCase() === 'e') {
        handleInteract();
      }
      if (e.key.toLowerCase() === 'f') {
        // Vending machine interaction
        const distToVending = playerPos.current.distanceTo(new Vector3(5, 1.6, 5));
        if (distToVending < 2.5) {
          handleInteract();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTerminal, inputBuffer, handleInteract]);

  const initialPos = useMemo(() => new Vector3(0, 1.6, 5), []);

  const obstacles = useMemo(() => [
    { x: 0, z: 0, w: 16.5, h: 0.8 }, // Conveyor - reduced collision depth for better maneuverability
    { x: 0, z: -5, w: 0.8, h: 0.4 }, // Control Panel
    { x: 5, z: 5, w: 1, h: 1 }      // Vending Machine
  ], []);

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Sky sunPosition={[100, 20, 100]} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Warehouse language={language} showFacilities={false} />
          <GameController />
          
          <ConveyorBelt start={CONVEYOR_START} end={CONVEYOR_END} running={isConveyorRunning && !isSystemLocked} />
          <ControlPanel position={CONTROL_PANEL_POS} locked={isSystemLocked} />
          <VendingMachine position={new Vector3(5, 0, 5)} coins={coins} t={t} />

          {cargoList.map(cargo => (
            <Cargo 
              key={cargo.id} 
              pos={cargo.pos} 
              isJammed={cargo.isJammed} 
              start={CONVEYOR_START} 
              end={CONVEYOR_END} 
            />
          ))}

          <Player 
            onPositionUpdate={(pos) => playerPos.current.copy(pos)} 
            isGrabbing={false} 
            canMove={gameOver === 'none' && !showTerminal} 
            initialPosition={initialPos}
            obstacles={obstacles}
            onLockChange={setIsLocked}
          />
        </Suspense>
      </Canvas>

      {/* Crosshair */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-40 transition-opacity duration-300 ${isLocked ? 'opacity-100' : 'opacity-0'}`}>
        <div className="relative">
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white/40 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/60 -mt-2.5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-0.5 bg-white/60 -ml-2.5" />
        </div>
      </div>

      {/* Instructions Overlay - Removed redundant key-based start logic */}

      {/* UI */}
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-10 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-4 rounded-br-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-[8px] px-2 py-0.5 font-bold rounded-bl-lg shadow-lg">
              {language === 'zh' ? "Hotmeer 正品防伪标签" : "Hotmeer Genuine Product"}
            </div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Activity size={20} className="text-blue-500" />
              {t.title}
            </h1>
            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <Target size={10} /> {starReq}
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.status}</p>
                <div className={`flex items-center gap-2 font-black ${isSystemLocked ? 'text-red-500' : isConveyorRunning ? 'text-green-500' : 'text-orange-500'}`}>
                  {isSystemLocked ? <AlertTriangle size={16} /> : <RefreshCw size={16} className={isConveyorRunning ? 'animate-spin' : ''} />}
                  <span className="tracking-tighter uppercase">
                    {isSystemLocked ? t.locked : isConveyorRunning ? t.running : t.stopped}
                  </span>
                </div>
              </div>

              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.delivered}</p>
                  <p className="text-xl font-mono text-blue-400">{score}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.jams}</p>
                  <p className="text-xl font-mono">{jamCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.coins}</p>
                  <p className="text-xl font-mono text-yellow-400">{coins}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.hungerLabel}</p>
                  <div className="w-24 h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${hunger < 3 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${(hunger / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <button onClick={() => onExit(score)} className="pointer-events-auto bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase">
              <ArrowLeft size={14} /> {t.back}
            </button>
            
            <div className={`bg-red-500/20 backdrop-blur-xl border border-red-500/30 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-pulse pointer-events-auto ${timeLeft > 5 ? 'opacity-40' : 'opacity-100'}`}>
              <AlertTriangle size={20} className="text-red-500" />
              <div>
                <p className="text-xs font-black text-red-500 uppercase tracking-widest">{t.timeout}</p>
                <p className="text-2xl font-mono text-white">{timeLeft}s</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {hunger < 4 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-orange-500/20 backdrop-blur-xl border border-orange-500/30 p-4 rounded-2xl flex items-center gap-3 text-orange-400 shadow-2xl"
                >
                  <Info size={18} />
                  <p className="text-xs font-black uppercase tracking-widest">{t.lowHunger}</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl max-w-xs text-left pointer-events-auto">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
                <Info size={12} /> {t.controls}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                <span className="text-white/30 uppercase tracking-tighter">{t.move}</span>
                <span className="text-white/80">WASD / ARROWS</span>
                <span className="text-white/30 uppercase tracking-tighter">{t.look}</span>
                <span className="text-white/80">MOUSE</span>
                <span className="text-white/30 uppercase tracking-tighter">{t.fix}</span>
                <span className="text-white/80 font-bold text-blue-400">[E]</span>
                <span className="text-white/30 uppercase tracking-tighter">{t.vending}</span>
                <span className="text-white/80 font-bold text-orange-400">[F]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Modal */}
      <AnimatePresence>
        {showTerminal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#0a0a0a] border border-blue-500/30 p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(59,130,246,0.1)]">
              <div className="flex items-center gap-3 mb-6 text-blue-500">
                <Terminal size={24} />
                <h3 className="text-lg font-black uppercase tracking-widest">{t.terminal}</h3>
              </div>
              <div className="bg-black p-6 rounded-xl border border-white/5 mb-6">
                <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">{t.enterCode}</p>
                <div className="text-3xl font-mono tracking-widest text-blue-400 min-h-[1.5em]">
                  {inputBuffer}<span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {(gameOver === 'timeout' || gameOver === 'hunger') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100]">
            <div className="text-center">
              <AlertTriangle size={80} className="text-red-500 mx-auto mb-6" />
              <h2 className="text-5xl font-black mb-10 tracking-tighter uppercase">
                {gameOver === 'timeout' ? t.timeout : t.hunger}
              </h2>
              <button onClick={() => onExit(score)} className="bg-white text-black font-black px-12 py-4 rounded-2xl hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest">
                {t.restart}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConveyorBelt({ start, end, running }: { start: Vector3, end: Vector3, running: boolean }) {
  const ref = useRef<Group>(null);
  const textureRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (running && textureRef.current && textureRef.current.material) {
      const material = textureRef.current.material as any;
      if (material.map) {
        material.map.offset.x -= 0.015;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Main Structure */}
      <Box ref={textureRef} args={[16.5, 0.2, 1.2]} position={[0, 0.7, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      
      {/* Rollers */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Box key={i} args={[0.1, 0.1, 1.1]} position={[-7.5 + i * 0.8, 0.75, 0]}>
          <meshStandardMaterial color="#666" />
        </Box>
      ))}

      {/* Side Rails */}
      <Box args={[16.5, 0.4, 0.1]} position={[0, 0.9, 0.6]}>
        <meshStandardMaterial color="#0066ff" />
      </Box>
      <Box args={[16.5, 0.4, 0.1]} position={[0, 0.9, -0.6]}>
        <meshStandardMaterial color="#0066ff" />
      </Box>

      {/* Legs */}
      {[-7, -3, 3, 7].map(x => (
        <Box key={x} args={[0.2, 0.7, 0.2]} position={[x, 0.35, 0.4]}>
          <meshStandardMaterial color="#444" />
        </Box>
      ))}
      {[-7, -3, 3, 7].map(x => (
        <Box key={x} args={[0.2, 0.7, 0.2]} position={[x, 0.35, -0.4]}>
          <meshStandardMaterial color="#444" />
        </Box>
      ))}
    </group>
  );
}

function Cargo({ pos, isJammed, start, end }: { pos: number, isJammed: boolean, start: Vector3, end: Vector3 }) {
  const worldPos = useMemo(() => new Vector3().lerpVectors(start, end, pos), [pos, start, end]);
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && !isJammed) {
      // Gentle wobble while moving
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.05;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 8) * 0.05;
      meshRef.current.position.y = 0.3 + Math.abs(Math.sin(state.clock.elapsedTime * 12)) * 0.05;
    } else if (meshRef.current && isJammed) {
      // Violent shake when jammed
      meshRef.current.rotation.x = (Math.random() - 0.5) * 0.2;
      meshRef.current.rotation.z = (Math.random() - 0.5) * 0.2;
    }
  });
  
  return (
    <group position={[worldPos.x, worldPos.y, worldPos.z]}>
      <Box ref={meshRef} args={[0.6, 0.6, 0.6]}>
        <meshStandardMaterial color={isJammed ? "#ff3300" : "#ffaa00"} />
      </Box>
      {isJammed && (
        <Billboard position={[0, 1.2, 0]}>
          <Text fontSize={0.2} color="#ff3300" fontWeight="bold">
            JAMMED! [E] TO FIX
          </Text>
        </Billboard>
      )}
    </group>
  );
}

function ControlPanel({ position, locked }: { position: Vector3, locked: boolean }) {
  return (
    <group position={position}>
      <Box args={[0.8, 1.2, 0.4]} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#222" />
      </Box>
      <group position={[0, 1, 0.21]} rotation={[-0.2, 0, 0]}>
        <Box args={[0.6, 0.4, 0.05]}>
          <meshStandardMaterial color={locked ? "#ff0000" : "#00ff00"} emissive={locked ? "#ff0000" : "#00ff00"} emissiveIntensity={0.5} />
        </Box>
        <Text position={[0, 0, 0.03]} fontSize={0.05} color="white" fontWeight="bold">
          {locked ? "SYSTEM LOCKED\n[E] TO RESET" : "SYSTEM OK"}
        </Text>
      </group>
    </group>
  );
}

function VendingMachine({ position, coins, t }: { position: Vector3, coins: number, t: any }) {
  return (
    <group position={position}>
      {/* Body */}
      <Box args={[1, 2, 1]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#0044cc" />
      </Box>
      {/* Glass */}
      <Box args={[0.8, 1, 0.1]} position={[0, 1.2, 0.46]}>
        <meshStandardMaterial color="#88ccff" transparent opacity={0.6} />
      </Box>
      {/* Panel */}
      <Box args={[0.8, 0.4, 0.1]} position={[0, 0.4, 0.46]}>
        <meshStandardMaterial color="#111" />
      </Box>
      {/* Text */}
      <Billboard position={[0, 2.2, 0]}>
        <Text fontSize={0.2} color="white" fontWeight="bold">
          {t.vending}
        </Text>
        <Text fontSize={0.1} color={coins >= 5 ? "#00ff00" : "#ff3300"} position={[0, -0.2, 0]}>
          {t.buyBread}
        </Text>
        <Text fontSize={0.08} color="white" position={[0, -0.35, 0]} fillOpacity={0.6}>
          {t.eat}
        </Text>
      </Billboard>
    </group>
  );
}
