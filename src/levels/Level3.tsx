import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, PerspectiveCamera, Box, Plane, Text, Billboard } from '@react-three/drei';
import { Vector3, Group, Mesh, PerspectiveCamera as ThreePerspectiveCamera } from 'three';
import { Warehouse } from '../components/Warehouse';
import { Player } from '../components/Player';
import { ArrowLeft, CheckCircle2, Info, Hammer, ShieldAlert, Lock, Unlock, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { Language } from '../types';

interface Level3Props {
  language: Language;
  starReq: string;
  onExit: (success: boolean) => void;
}

export function Level3({ language, starReq, onExit }: Level3Props) {
  const [activeRackIndex, setActiveRackIndex] = useState(0);
  const [completedRacks, setCompletedRacks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(150);
  const [targetFov, setTargetFov] = useState(75);
  const [gameOver, setGameOver] = useState<'none' | 'timeout' | 'success'>('none');
  
  // Rack State
  const [step, setStep] = useState(1); // 1: Base, 2: Structure, 3: Beams, 4: Complete
  const [basePlates, setBasePlates] = useState<boolean[]>([false, false, false, false]);
  const [uprights, setUprights] = useState<boolean[]>([false, false, false, false]);
  const [horizontals, setHorizontals] = useState<boolean[]>([false, false]);
  const [diagonals, setDiagonals] = useState<boolean[]>([false, false]);
  const [bolts, setBolts] = useState<boolean[]>([false, false, false, false]); // New detail: Bolts
  const [beams, setBeams] = useState<boolean[]>([false, false]);
  const [locks, setLocks] = useState<boolean[]>([false, false]);
  const [beamFalling, setBeamFalling] = useState<number | null>(null);

  const [flashPos, setFlashPos] = useState<Vector3 | null>(null);
  const [message, setMessage] = useState("");
  const [showFinalModal, setShowFinalModal] = useState(false);

  const triggerFlash = (pos: Vector3) => {
    setFlashPos(pos);
    setTimeout(() => setFlashPos(null), 300);
  };

  const rackPositions = useMemo(() => [
    new Vector3(-6, 0, -4),
    new Vector3(-3, 0, -4),
    new Vector3(0, 0, -4),
    new Vector3(3, 0, -4),
    new Vector3(6, 0, -4),
  ], []);

  const baseOffsets = useMemo(() => [
    new Vector3(-1, 0, -1), new Vector3(1, 0, -1),
    new Vector3(-1, 0, 1), new Vector3(1, 0, 1)
  ], []);

  // Timer logic
  useEffect(() => {
    if (gameOver !== 'none') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver]);

  const t = {
    en: {
      title: "Rack Installation Challenge",
      instruction: "Install 5 racks within 2 minutes.",
      step1: "Step 1: Base Plates & Bolts",
      step1Hint: "Secure the base before building up",
      step2: "Step 2: Uprights & Bracing",
      step2Hint: "Structure must be stable",
      step3: "Step 3: Beams & Safety Locks",
      step3Hint: "Lock every beam to prevent collapse",
      lock: "LOCK",
      bolt: "BOLT",
      complete: "CHALLENGE COMPLETE",
      timeout: "TIME EXPIRED",
      back: "Back to Menu",
      finalTitle: "Installation Master",
      finalMsg: "You have successfully installed 5 racks with safety protocols. Your speed and precision are commendable.",
      finalWarning: "CRITICAL: In real-world installation, leveling, verticality, and overall precision are vital. Professional tools must be used for measurement and calibration. Failure to do so leads to instability, robot errors, and safety risks.",
      restart: "FINISH",
      controls: "Controls",
      interact: "Click Ghost Parts to Install",
      look: "Look",
      move: "Move",
      time: "Time Left",
      racks: "Racks Installed"
    },
    zh: {
      title: "货架安装竞速挑战",
      instruction: "在2分钟内完成5组货架的安装。",
      step1: "第一步：底座与地脚螺栓",
      step1Hint: "在搭建前先固定底座",
      step2: "第二步：立柱与斜撑",
      step2Hint: "结构必须保持稳定",
      step3: "第三步：横梁与安全锁",
      step3Hint: "锁定每一根横梁以防坍塌",
      lock: "锁定",
      bolt: "螺栓",
      complete: "挑战完成",
      timeout: "时间耗尽",
      back: "返回菜单",
      finalTitle: "安装大师",
      finalMsg: "你已成功按照安全规范完成了5组货架的安装。你的速度与精度值得称赞。",
      finalWarning: "特别提醒：在真实现场安装中，货架的水平度、垂直度和整体精度非常重要。必须使用专业工具进行测量与校准，否则可能带来结构不稳定、机器人运行异常及安全风险。",
      restart: "完成",
      controls: "操作指南",
      interact: "点击虚影部件进行安装",
      look: "视角",
      move: "移动",
      time: "剩余时间",
      racks: "已安装货架"
    }
  }[language];

  const resetRackState = () => {
    setStep(1);
    setBasePlates([false, false, false, false]);
    setUprights([false, false, false, false]);
    setHorizontals([false, false]);
    setDiagonals([false, false]);
    setBolts([false, false, false, false]);
    setBeams([false, false]);
    setLocks([false, false]);
  };

  const handleBaseClick = (index: number) => {
    if (step !== 1 || gameOver !== 'none') return;
    const newBases = [...basePlates];
    newBases[index] = true;
    setBasePlates(newBases);
    soundManager.playGrab();
    triggerFlash(rackPositions[activeRackIndex].clone().add(baseOffsets[index]));
  };

  const handleBoltClick = (index: number) => {
    if (step !== 1 || !basePlates[index] || gameOver !== 'none') return;
    const newBolts = [...bolts];
    newBolts[index] = true;
    setBolts(newBolts);
    soundManager.playSuccess();
    triggerFlash(rackPositions[activeRackIndex].clone().add(baseOffsets[index]));
    if (basePlates.every(b => b) && newBolts.every(b => b)) {
      setStep(2);
      setMessage(t.step1Hint);
    }
  };

  const handleUprightClick = (index: number) => {
    if (step !== 2 || gameOver !== 'none') return;
    const newUprights = [...uprights];
    newUprights[index] = true;
    setUprights(newUprights);
    soundManager.playGrab();
    triggerFlash(rackPositions[activeRackIndex].clone().add(baseOffsets[index]).add(new Vector3(0, 1.5, 0)));
    checkStep2(newUprights, horizontals, diagonals);
  };

  const handleHorizontalClick = (index: number) => {
    if (step !== 2 || gameOver !== 'none') return;
    const newHorizontals = [...horizontals];
    newHorizontals[index] = true;
    setHorizontals(newHorizontals);
    soundManager.playGrab();
    const offset = index === 0 ? new Vector3(-1, 1.5, 0) : new Vector3(1, 1.5, 0);
    triggerFlash(rackPositions[activeRackIndex].clone().add(offset));
    checkStep2(uprights, newHorizontals, diagonals);
  };

  const handleDiagonalClick = (index: number) => {
    if (step !== 2 || gameOver !== 'none') return;
    const newDiagonals = [...diagonals];
    newDiagonals[index] = true;
    setDiagonals(newDiagonals);
    soundManager.playGrab();
    const offset = index === 0 ? new Vector3(-1, 1.5, 0) : new Vector3(1, 1.5, 0);
    triggerFlash(rackPositions[activeRackIndex].clone().add(offset));
    checkStep2(uprights, horizontals, newDiagonals);
  };

  const checkStep2 = (u: boolean[], h: boolean[], d: boolean[]) => {
    if (u.every(x => x) && h.every(x => x) && d.every(x => x)) {
      setStep(3);
      setMessage(t.step2Hint);
    }
  };

  const handleBeamClick = (index: number) => {
    if (step !== 3 || gameOver !== 'none') return;
    const newBeams = [...beams];
    newBeams[index] = true;
    setBeams(newBeams);
    soundManager.playGrab();
    const offset = index === 0 ? new Vector3(0, 1.2, 1) : new Vector3(0, 2.4, 1);
    triggerFlash(rackPositions[activeRackIndex].clone().add(offset));
    
    setTimeout(() => {
      setLocks(prev => {
        if (!prev[index]) {
          setBeamFalling(index);
          soundManager.playReboot();
          setTimeout(() => {
            setBeams(b => {
              const nb = [...b];
              nb[index] = false;
              return nb;
            });
            setBeamFalling(null);
          }, 1000);
        }
        return prev;
      });
    }, 2500); // Faster drop for more challenge
  };

  const handleLockClick = (index: number) => {
    if (step !== 3 || !beams[index] || gameOver !== 'none') return;
    const newLocks = [...locks];
    newLocks[index] = true;
    setLocks(newLocks);
    soundManager.playSuccess();
    if (beams.every(b => b) && newLocks.every(l => l)) {
      const nextCount = completedRacks + 1;
      setCompletedRacks(nextCount);
      if (nextCount >= 5) {
        setGameOver('success');
        setShowFinalModal(true);
      } else {
        setActiveRackIndex(nextCount);
        resetRackState();
        setMessage(`${t.complete} ${nextCount}/5`);
      }
    }
  };

  const initialPos = useMemo(() => new Vector3(0, 1.6, 5), []);

  const rackObstacles = useMemo(() => {
    return rackPositions.slice(0, completedRacks).map((pos) => ({
      x: pos.x,
      z: pos.z,
      w: 2.2,
      h: 2.2
    }));
  }, [completedRacks, rackPositions]);

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]}>
        <SceneController targetFov={targetFov} />
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Warehouse language={language} showFacilities={false} />
        
        {/* Completed Racks */}
        {rackPositions.map((rackPos, rIdx) => (
          rIdx < completedRacks && (
            <group key={`completed-rack-${rIdx}`} position={rackPos}>
              {baseOffsets.map((pos, i) => (
                <group key={`comp-base-${i}`} position={pos}>
                  <Box args={[0.4, 0.05, 0.4]}><meshStandardMaterial color="#333" metalness={0.8} /></Box>
                  <Box args={[0.05, 0.1, 0.05]} position={[0, 0.05, 0]}><meshStandardMaterial color="#888" /></Box>
                  <group position={[0, 1.5, 0]}><RackUpright shaking={false} /></group>
                </group>
              ))}
              <Box args={[0.05, 0.05, 2]} position={[-1, 1.5, 0]}><meshStandardMaterial color="#555" /></Box>
              <Box args={[0.05, 0.05, 2]} position={[1, 1.5, 0]}><meshStandardMaterial color="#555" /></Box>
              <Box args={[0.05, 0.05, 2.8]} position={[-1, 1.5, 0]} rotation={[Math.PI / 4, 0, 0]}><meshStandardMaterial color="#0066ff" /></Box>
              <Box args={[0.05, 0.05, 2.8]} position={[1, 1.5, 0]} rotation={[-Math.PI / 4, 0, 0]}><meshStandardMaterial color="#0066ff" /></Box>
              <Box args={[2, 0.15, 0.1]} position={[0, 1.2, 1]}><meshStandardMaterial color="#ffaa00" /></Box>
              <Box args={[2, 0.15, 0.1]} position={[0, 2.4, 1]}><meshStandardMaterial color="#ffaa00" /></Box>
              <Box args={[2, 0.15, 0.1]} position={[0, 1.2, -1]}><meshStandardMaterial color="#444" /></Box>
              <Box args={[2, 0.15, 0.1]} position={[0, 2.4, -1]}><meshStandardMaterial color="#444" /></Box>
            </group>
          )
        ))}

        {/* Active Rack */}
        {gameOver === 'none' && (
          <group position={rackPositions[activeRackIndex]}>
            {/* Step 1: Base Plates & Bolts */}
            {step === 1 && baseOffsets.map((pos, i) => (
              <group key={`base-${i}`} position={pos}>
                {!basePlates[i] ? (
                  <GhostPart args={[0.4, 0.05, 0.4]} onClick={() => handleBaseClick(i)} color="#00ff00" />
                ) : (
                  <>
                    <Box args={[0.4, 0.05, 0.4]}><meshStandardMaterial color="#333" metalness={0.8} /></Box>
                    {!bolts[i] && <GhostPart args={[0.05, 0.1, 0.05]} position={[0, 0.05, 0]} onClick={() => handleBoltClick(i)} color="#ffff00" />}
                    {bolts[i] && <Box args={[0.05, 0.1, 0.05]} position={[0, 0.05, 0]}><meshStandardMaterial color="#888" /></Box>}
                  </>
                )}
              </group>
            ))}

            {/* Step 2: Structure */}
            {step >= 2 && (
              <group>
                {baseOffsets.map((pos, i) => (
                  <group key={`upright-${i}`} position={[pos.x, 1.5, pos.z]}>
                    {!uprights[i] && step === 2 && (
                      <GhostPart args={[0.1, 3, 0.1]} onClick={() => handleUprightClick(i)} color="#00aaff" />
                    )}
                    {uprights[i] && (
                      <RackUpright shaking={step === 2 && !diagonals.every(d => d)} />
                    )}
                  </group>
                ))}

                {uprights.every(u => u) && [
                  { pos: [-1, 1.5, 0] as [number, number, number] },
                  { pos: [1, 1.5, 0] as [number, number, number] }
                ].map((h, i) => (
                  <group key={`horiz-${i}`} position={h.pos}>
                    {!horizontals[i] && step === 2 && (
                      <GhostPart args={[0.05, 0.05, 2]} onClick={() => handleHorizontalClick(i)} color="#00aaff" />
                    )}
                    {horizontals[i] && (
                      <Box args={[0.05, 0.05, 2]}><meshStandardMaterial color="#555" /></Box>
                    )}
                  </group>
                ))}

                {horizontals.every(h => h) && [
                  { pos: [-1, 1.5, 0] as [number, number, number], rot: [Math.PI / 4, 0, 0] as [number, number, number] },
                  { pos: [1, 1.5, 0] as [number, number, number], rot: [-Math.PI / 4, 0, 0] as [number, number, number] }
                ].map((d, i) => (
                  <group key={`diag-${i}`} position={d.pos} rotation={d.rot}>
                    {!diagonals[i] && step === 2 && (
                      <GhostPart args={[0.05, 0.05, 2.8]} onClick={() => handleDiagonalClick(i)} color="#00aaff" />
                    )}
                    {diagonals[i] && (
                      <Box args={[0.05, 0.05, 2.8]}><meshStandardMaterial color="#0066ff" /></Box>
                    )}
                  </group>
                ))}
              </group>
            )}

            {/* Step 3: Beams */}
            {step >= 3 && (
              <group>
                {[
                  { pos: [0, 1.2, 1] as [number, number, number], id: 0 },
                  { pos: [0, 2.4, 1] as [number, number, number], id: 1 }
                ].map((b, i) => (
                  <group key={`beam-${i}`} position={b.pos}>
                    {!beams[i] && step === 3 && (
                      <GhostPart args={[2, 0.15, 0.1]} onClick={() => handleBeamClick(i)} color="#ffaa00" />
                    )}
                    {beams[i] && (
                      <Beam 
                         falling={beamFalling === i} 
                        locked={locks[i]} 
                        onLock={() => handleLockClick(i)} 
                        language={language}
                      />
                    )}
                  </group>
                ))}
                <Box args={[2, 0.15, 0.1]} position={[0, 1.2, -1]}><meshStandardMaterial color="#444" /></Box>
                <Box args={[2, 0.15, 0.1]} position={[0, 2.4, -1]}><meshStandardMaterial color="#444" /></Box>
              </group>
            )}
          </group>
        )}

        {/* Interaction Flash */}
        {flashPos && (
          <mesh position={flashPos}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="white" transparent opacity={0.5} />
          </mesh>
        )}

        <Player 
          isGrabbing={false} 
          canMove={true} 
          initialPosition={initialPos}
          obstacles={rackObstacles}
        />
      </Canvas>

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        <div className="relative">
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white/40 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/60 -mt-2.5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-0.5 bg-white/60 -ml-2.5" />
        </div>
      </div>

      {/* UI */}
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-10 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl relative overflow-hidden max-w-xs">
              <div className="absolute top-0 right-0 bg-blue-600 text-[8px] px-2 py-0.5 font-bold rounded-bl-lg shadow-lg">
                {language === 'zh' ? "Hotmeer 正品防伪标签" : "Hotmeer Genuine Product"}
              </div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Hammer size={18} className="text-blue-500" />
                {t.title}
              </h1>
              <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                <Target size={10} /> {starReq}
              </p>
              <p className="text-[9px] text-white/50 mt-1 uppercase tracking-widest">{t.instruction}</p>
              
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center gap-8">
                <div>
                  <p className="text-[8px] text-white/30 uppercase tracking-widest">{t.racks}</p>
                  <p className="text-xl font-mono font-black text-green-500">{completedRacks}/5</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-white/30 uppercase tracking-widest">{t.time}</p>
                  <p className={`text-xl font-mono font-black ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</p>
                </div>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl max-w-[180px]">
              <div className="space-y-1.5">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`flex items-center gap-2 text-[10px] ${step > s ? 'text-green-500' : step === s ? 'text-white' : 'text-white/20'}`}>
                    {step > s ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    <span className="font-bold uppercase tracking-tight">{t[`step${s}` as keyof typeof t]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <button onClick={() => onExit(gameOver === 'success')} className="pointer-events-auto bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase">
              <ArrowLeft size={14} /> {t.back}
            </button>
          </div>
        </div>

        {/* Step Hint Overlay */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-50"
            >
              <div className="bg-blue-600/90 backdrop-blur-md text-white px-8 py-3 rounded-xl font-black text-lg shadow-[0_0_30px_rgba(59,130,246,0.3)] uppercase tracking-widest text-center border border-white/20">
                {message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-end">
          <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl max-w-xs">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
              <Info size={12} /> {t.controls}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
              <span className="text-white/30 uppercase tracking-tighter">{t.move}</span>
              <span className="text-white/80">WASD / ARROWS</span>
              <span className="text-white/30 uppercase tracking-tighter">{t.look}</span>
              <span className="text-white/80">MOUSE</span>
              <span className="text-white/30 uppercase tracking-tighter">{t.interact}</span>
              <span className="text-white/80 font-bold text-blue-400">[LEFT CLICK]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {gameOver === 'timeout' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-900/40 backdrop-blur-md flex items-center justify-center z-[100]">
            <div className="text-center">
              <div className="text-8xl font-black text-white mb-4 tracking-tighter uppercase italic">{t.timeout}</div>
              <button onClick={() => window.location.reload()} className="pointer-events-auto bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                {language === 'zh' ? '重试' : 'RETRY'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFinalModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
            <div className="max-w-2xl bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-orange-500 to-blue-500" />
              
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-8 border border-green-500/30">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              
              <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase">{t.finalTitle}</h2>
              
              <div className="space-y-6 text-white/70 leading-relaxed">
                <p className="text-lg font-medium text-white">{t.finalMsg}</p>
                
                <div className="bg-orange-500/10 border border-orange-500/30 p-6 rounded-2xl flex gap-4">
                  <ShieldAlert className="text-orange-500 shrink-0" size={24} />
                  <p className="text-sm italic text-orange-200/80">
                    {t.finalWarning}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => onExit(gameOver === 'success')}
                className="pointer-events-auto w-full mt-10 bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {t.restart}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SceneController({ targetFov }: { targetFov: number }) {
  const { camera } = useThree();

  useEffect(() => {
    return () => {
      if (camera instanceof ThreePerspectiveCamera) {
        camera.fov = 75;
        camera.updateProjectionMatrix();
      }
    };
  }, [camera]);

  useFrame(() => {
    if (camera instanceof ThreePerspectiveCamera) {
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov += (targetFov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }
    }
  });
  return <PerspectiveCamera makeDefault position={[0, 5, 10]} />;
}

function GhostPart({ args, position, rotation, onClick, color = "#00ff00" }: { args: any, position?: any, rotation?: any, onClick: () => void, color?: string }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const material = ref.current.material as any;
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.2 + 0.5;
      material.opacity = hovered ? 0.8 : pulse;
      if (hovered) {
        ref.current.scale.setScalar(1.05);
      } else {
        ref.current.scale.setScalar(1);
      }
    }
  });

  return (
    <Box 
      ref={ref}
      args={args} 
      position={position} 
      rotation={rotation} 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial color={color} transparent opacity={0.5} emissive={color} emissiveIntensity={hovered ? 2 : 0.5} />
    </Box>
  );
}

function RackUpright({ shaking }: { shaking: boolean }) {
  const ref = useRef<Group>(null);
  
  // Use a targeted frame update only if shaking
  useFrame((state) => {
    if (!shaking || !ref.current) return;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.02;
    ref.current.rotation.x = Math.cos(state.clock.elapsedTime * 12) * 0.02;
  });

  return (
    <group ref={ref}>
      <Box args={[0.1, 3, 0.1]}>
        <meshStandardMaterial color="#444" metalness={0.8} />
      </Box>
    </group>
  );
}

function Beam({ falling, locked, onLock, language }: { falling: boolean, locked: boolean, onLock: () => void, language: Language }) {
  const ref = useRef<Group>(null);
  
  useFrame((state, delta) => {
    if (falling && ref.current && ref.current.position.y > -1.2) {
      ref.current.position.y -= delta * 5; // Use delta for smooth descent
    }
  });

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <Box args={[2, 0.15, 0.1]}>
        <meshStandardMaterial color="#ffaa00" metalness={0.5} />
      </Box>
      {!locked && !falling && (
        <Billboard position={[0, 0.5, 0]}>
          <group onClick={(e) => { e.stopPropagation(); onLock(); }}>
            <Box args={[0.8, 0.3, 0.05]}>
              <meshStandardMaterial color="#ff0000" />
            </Box>
            <Text position={[0, 0, 0.03]} fontSize={0.1} color="white" fontWeight="bold">
              {language === 'zh' ? "点击锁定" : "CLICK TO LOCK"}
            </Text>
          </group>
        </Billboard>
      )}
      {locked && (
        <Billboard position={[0, 0.4, 0]}>
          <Text fontSize={0.2} color="#00ff00" fontWeight="bold">
            {language === 'zh' ? "已锁定" : "LOCKED"}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
