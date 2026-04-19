import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';
import { Warehouse } from '../components/Warehouse';
import { Robot } from '../components/Robot';
import { Player } from '../components/Player';
import { ChargingStation } from '../components/ChargingStation';
import { AlertCircle, Info, RefreshCcw, Clock, ArrowLeft, CheckCircle2, Terminal, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { RobotStatus, Language } from '../types';

const CHARGING_STATION_POS = new Vector3(0, 0, -12);
const ROBOT_START_POS = new Vector3(0, 0.5, 0);

interface Level2Props {
  language: Language;
  starReq: string;
  onExit: (success: boolean) => void;
}

export function Level2({ language, starReq, onExit }: Level2Props) {
  const playerPos = useRef(new Vector3(0, 1.6, 10));
  const [robotPos, setRobotPos] = useState(ROBOT_START_POS.clone());
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [status, setStatus] = useState<RobotStatus>('setup');
  
  const [step, setStep] = useState(1); // 1: Number, 2: IP, 3: Push, 4: Station Password, 5: Station Mode, 6: Complete
  const [targetNumber] = useState(() => "155" + Math.floor(Math.random() * 90 + 10));
  const [targetIP] = useState(() => "192.168.1." + Math.floor(Math.random() * 254 + 1));
  
  const [inputBuffer, setInputBuffer] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalType, setTerminalType] = useState<'number' | 'ip' | 'password' | 'none'>('none');
  
  const [isStationUnlocked, setIsStationUnlocked] = useState(false);
  const [isStationManual, setIsStationManual] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState<'none' | 'timeout' | 'success'>('none');

  // Stable refs for event listeners
  const stepRef = useRef(step);
  const robotPosRef = useRef(robotPos);
  const showTerminalRef = useRef(showTerminal);
  const isStationUnlockedRef = useRef(isStationUnlocked);
  const inputBufferRef = useRef(inputBuffer);
  const terminalTypeRef = useRef(terminalType);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { robotPosRef.current = robotPos; }, [robotPos]);
  useEffect(() => { showTerminalRef.current = showTerminal; }, [showTerminal]);
  useEffect(() => { isStationUnlockedRef.current = isStationUnlocked; }, [isStationUnlocked]);
  useEffect(() => { inputBufferRef.current = inputBuffer; }, [inputBuffer]);
  useEffect(() => { terminalTypeRef.current = terminalType; }, [terminalType]);

  // Timer
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

  const handleInteract = useCallback((target: 'robot' | 'station') => {
    const currentStep = stepRef.current;
    if (target === 'robot') {
      const distToRobot = playerPos.current.distanceTo(new Vector3(robotPosRef.current.x, 1.6, robotPosRef.current.z));
      if (distToRobot < 2.5) {
        if (currentStep === 1) {
          setTerminalType('number');
          setShowTerminal(true);
          setInputBuffer("");
        } else if (currentStep === 2) {
          setTerminalType('ip');
          setShowTerminal(true);
          setInputBuffer("");
        }
      }
    } else if (target === 'station') {
      const distToStation = playerPos.current.distanceTo(new Vector3(CHARGING_STATION_POS.x, 1.6, CHARGING_STATION_POS.z));
      if (distToStation < 2.5) {
        if (currentStep === 4) {
          setTerminalType('password');
          setShowTerminal(true);
          setInputBuffer("");
        } else if (currentStep === 5 && isStationUnlockedRef.current) {
          setIsStationManual(true);
          setStep(6);
          setGameOver('success');
          soundManager.playSuccess();
        }
      }
    }
  }, []); // Static callback

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (showTerminalRef.current) {
        if (e.key === 'Enter') {
          const buffer = inputBufferRef.current;
          const type = terminalTypeRef.current;
          if (type === 'number' && buffer === targetNumber) {
            setStep(2);
            setShowTerminal(false);
            soundManager.playSuccess();
          } else if (type === 'ip' && buffer === targetIP) {
            setStep(3);
            setShowTerminal(false);
            soundManager.playSuccess();
          } else if (type === 'password' && buffer === "12345") {
            setIsStationUnlocked(true);
            setStep(5);
            setShowTerminal(false);
            soundManager.playSuccess();
          } else {
            soundManager.playReboot(); // Error sound
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
        if (e.key.length === 1 && /[0-9.]/.test(e.key)) {
          setInputBuffer(prev => prev + e.key);
        }
        return;
      }

      if (key === 'e') {
        handleInteract('robot');
      }
      if (key === 'c') {
        handleInteract('station');
      }
      if (key === 'p' && stepRef.current === 3) {
        setIsGrabbed(prev => !prev);
        // Note: isGrabbed state is async, so sound might be off by 1 click if using it directly here
        // but for sounds it's usually okay. Better to use the setter callback or ref.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInteract, targetNumber, targetIP]); // Stable dependencies

  // Step 3 logic: Check if robot is at station
  useEffect(() => {
    if (step === 3 && !isGrabbed) {
      if (robotPos.distanceTo(CHARGING_STATION_POS) < 2) {
        setStep(4);
        soundManager.playSuccess();
      }
    }
  }, [robotPos, step, isGrabbed]);

  const t = {
    en: {
      title: "Factory Reset Mode",
      brand: "Hotmeer Genuine Product",
      step1: `Step 1: Enter ID (${targetNumber})`,
      step2: `Step 2: Enter IP (${targetIP})`,
      step3: "Step 3: Push to Charging Station",
      step4: "Step 4: Enter Station Password (12345)",
      step5: "Step 5: Switch to Manual Mode",
      success: "FACTORY RESET COMPLETE",
      timeout: "TIME EXPIRED",
      restart: "RETRY",
      back: "Back to Menu",
      terminal: "TERMINAL INPUT",
      enter: "Press ENTER to confirm",
      esc: "Press ESC to cancel",
      controls: "Controls",
      move: "Move",
      look: "Look",
      interactRobot: "Interact Unit",
      interactStation: "Interact Station",
      push: "Push (P) / Place (P)"
    },
    zh: {
      title: "出厂设置模式",
      brand: "Hotmeer 正品防伪标签",
      step1: `第一步：输入编号 (${targetNumber})`,
      step2: `第二步：输入IP地址 (${targetIP})`,
      step3: "第三步：推至充电桩",
      step4: "第四步：输入充电桩密码 (12345)",
      step5: "第五步：切换至手动模式",
      success: "出厂设置完成",
      timeout: "时间耗尽",
      restart: "重试",
      back: "返回菜单",
      terminal: "终端输入",
      enter: "按回车键确认",
      esc: "按退出键取消",
      controls: "操作指南",
      move: "移动",
      look: "视角",
      interactRobot: "交互单位",
      interactStation: "交互充电桩",
      push: "推动 (P) / 放置 (P)"
    }
  }[language];

  const initialPos = useMemo(() => new Vector3(0, 1.6, 10), []);

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

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault fov={75} />
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Warehouse language={language} />
        
        <ChargingStation 
          position={[CHARGING_STATION_POS.x, 0, CHARGING_STATION_POS.z]} 
          isManual={isStationManual}
          isUnlocked={isStationUnlocked}
          onInteract={() => {}}
        />

        <Robot
          id={99}
          initialPosition={[ROBOT_START_POS.x, 0.5, ROBOT_START_POS.z]}
          shelfPos={ROBOT_START_POS}
          workstationPos={ROBOT_START_POS}
          maintenancePos={ROBOT_START_POS}
          onStatusChange={() => {}}
          onDeliver={() => {}}
          language={language}
          isGrabbed={isGrabbed}
          onGrab={() => {}}
          onPositionUpdate={(_, pos) => setRobotPos(pos.clone())}
          disabled={false}
          initialStatus="setup"
        />

        <Player 
          onPositionUpdate={(pos) => playerPos.current.copy(pos)} 
          isGrabbing={isGrabbed} 
          canMove={!showTerminal && gameOver === 'none'} 
          initialPosition={initialPos}
          obstacles={[
            { x: -4, z: -6, w: 2, h: 2 }, { x: 0, z: -6, w: 2, h: 2 }, { x: 4, z: -6, w: 2, h: 2 },
            { x: -4, z: 6, w: 2, h: 2 }, { x: 0, z: 6, w: 2, h: 2 }, { x: 4, z: 6, w: 2, h: 2 },
          ]}
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
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-4 rounded-br-3xl shadow-2xl relative overflow-hidden">
            {/* Hotmeer Label */}
            <div className="absolute top-0 right-0 bg-blue-600 text-[8px] px-2 py-0.5 font-bold rounded-bl-lg shadow-lg">
              {t.brand}
            </div>
            
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Terminal size={20} className="text-blue-500" />
              {t.title}
            </h1>
            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <Target size={10} /> {starReq}
            </p>
            <div className="mt-4 space-y-2">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className={`flex items-center gap-2 text-sm ${step > s ? 'text-green-500' : step === s ? 'text-white' : 'text-white/20'}`}>
                  {step > s ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                  <span>{t[`step${s}` as keyof typeof t]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <button onClick={() => onExit(gameOver === 'success')} className="pointer-events-auto bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase">
              <ArrowLeft size={14} /> {t.back}
            </button>
            <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <Clock size={20} className={timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'} />
              <p className={`text-3xl font-mono ${timeLeft < 10 ? 'text-red-500' : ''}`}>{timeLeft}s</p>
            </div>
          </div>
        </div>

        {/* Footer */}
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
              <span className="text-white/30 uppercase tracking-tighter">{t.interactRobot}</span>
              <span className="text-white/80 font-bold text-blue-400">[E]</span>
              <span className="text-white/30 uppercase tracking-tighter">{t.interactStation}</span>
              <span className="text-white/80 font-bold text-blue-400">[C]</span>
              <span className="text-white/30 uppercase tracking-tighter">{t.push}</span>
              <span className="text-white/80 font-bold text-orange-400">[P]</span>
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
                <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">
                  {terminalType === 'number' ? "ENTER UNIT ID" : terminalType === 'ip' ? "ENTER IP ADDRESS" : "ENTER STATION PASSWORD"}
                </p>
                <div className="text-3xl font-mono tracking-widest text-blue-400 min-h-[1.5em]">
                  {inputBuffer}<span className="animate-pulse">_</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-white/30 font-mono uppercase">
                <span>{t.enter}</span>
                <span>{t.esc}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {gameOver !== 'none' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100]">
            <div className="text-center">
              {gameOver === 'success' ? (
                <CheckCircle2 size={80} className="text-green-500 mx-auto mb-6" />
              ) : (
                <AlertCircle size={80} className="text-red-500 mx-auto mb-6" />
              )}
              <h2 className="text-5xl font-black mb-10 tracking-tighter uppercase">
                {gameOver === 'success' ? t.success : t.timeout}
              </h2>
              <button onClick={() => onExit(gameOver === 'success')} className="bg-white text-black font-black px-12 py-4 rounded-2xl hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest">
                {t.restart}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
