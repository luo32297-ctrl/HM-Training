import { useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';
import { Warehouse } from '../components/Warehouse';
import { Robot } from '../components/Robot';
import { Player } from '../components/Player';
import { AlertCircle, Info, RefreshCcw, Clock, Package, RotateCcw, ArrowLeft, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { RobotStatus, RobotData, Language } from '../types';

const SHELF_POSITIONS: Vector3[] = [
  new Vector3(-4, 0, -6), new Vector3(0, 0, -6), new Vector3(4, 0, -6),
  new Vector3(-4, 0, 6), new Vector3(0, 0, 6), new Vector3(4, 0, 6),
];
const WORKSTATIONS = [new Vector3(14, 0, 0), new Vector3(-14, 0, 0)];
const MAINTENANCE_AREA = new Vector3(0, 0, 13);

interface Level1Props {
  language: Language;
  starReq: string;
  onExit: (deliveries: number) => void;
}

export function Level1({ language, starReq, onExit }: Level1Props) {
  const [grabbedRobotId, setGrabbedRobotId] = useState<number | null>(null);
  const [robotData, setRobotData] = useState<RobotData[]>(() => 
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      status: 'picking' as RobotStatus,
      shelfIndex: Math.floor(Math.random() * SHELF_POSITIONS.length),
      wsIndex: i % 2,
      key: Date.now() + i
    }))
  );
  
  const [lastDeliveryTime, setLastDeliveryTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState<'none' | 'all_failed' | 'timeout'>('none');
  const [deliveries, setDeliveries] = useState(0);
  const [hasHelmet, setHasHelmet] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') {
        setHasHelmet(prev => {
          if (!prev) soundManager.playHelmet();
          return true;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRobotStatusChange = useCallback((id: number, status: RobotStatus) => {
    if (status === 'returning') {
      setGrabbedRobotId(null);
      setRobotData(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'picking',
        shelfIndex: Math.floor(Math.random() * SHELF_POSITIONS.length),
        key: Date.now() + id
      } : r));
      return;
    }
    setRobotData(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }, []);

  const handleGrab = useCallback((id: number) => {
    setGrabbedRobotId(prev => {
      if (prev === id) {
        soundManager.playRelease();
        return null;
      }
      soundManager.playGrab();
      return id;
    });
  }, []);

  const handleDeliver = useCallback(() => {
    setDeliveries(d => d + 1);
    setLastDeliveryTime(Date.now());
    soundManager.playSuccess();
  }, []);

  useEffect(() => {
    if (gameOver !== 'none') return;
    const allFailed = robotData.every(r => r.status === 'failed' || r.status === 'critical');
    if (allFailed) setGameOver('all_failed');
    const timer = setInterval(() => {
      if (Date.now() - lastDeliveryTime > 30000) setGameOver('timeout');
    }, 1000);
    return () => clearInterval(timer);
  }, [robotData, lastDeliveryTime, gameOver]);

  const restartGame = () => {
    setGameOver('none');
    setDeliveries(0);
    setLastDeliveryTime(Date.now());
    setGrabbedRobotId(null);
    setHasHelmet(false);
    setRobotData(Array.from({ length: 4 }, (_, i) => ({
      id: i,
      status: 'picking' as RobotStatus,
      shelfIndex: Math.floor(Math.random() * SHELF_POSITIONS.length),
      wsIndex: i % 2,
      key: Date.now() + i
    })));
  };

  const t = {
    en: {
      title: "Hotmeer O&M Training",
      version: "v3.1",
      brand: "Hotmeer Genuine Product",
      status: "SYSTEM STATUS: OPERATIONAL",
      activeRobots: "Active Robots",
      errors: "Critical Errors",
      deliveries: "Deliveries",
      timeout: "Time Since Last Delivery",
      controls: "Controls",
      move: "Move",
      look: "Look",
      lock: "Lock Cursor",
      restartRobot: "Restart Robot",
      pushRobot: "Grab Robot",
      switchLang: "Switch Language",
      failure: "ROBOT FAILURE DETECTED",
      failureDesc: "Locate the red unit and press [R] to reboot.",
      critical: "CRITICAL FAILURE",
      criticalDesc: "Press [P] to grab unit and move to maintenance area.",
      gameOverTitle: "SYSTEM SHUTDOWN",
      allFailedMsg: "All units have ceased operation.",
      timeoutMsg: "Delivery timeout exceeded (30s).",
      restartBtn: "REBOOT SYSTEM",
      helmetReq: "SAFETY FIRST: Press [M] to wear helmet to move",
      helmetHolo: "HELMET REQUIRED",
      back: "Back to Menu",
      starReq: "Star Requirement"
    },
    zh: {
      title: "Hotmeer运维培训软件",
      version: "v3.1",
      brand: "Hotmeer 正品防伪标签",
      status: "系统状态: 运行中",
      activeRobots: "活跃机器人",
      errors: "严重错误",
      deliveries: "已送达货物",
      timeout: "距上次送达",
      controls: "操作指南",
      move: "移动",
      look: "视角",
      lock: "锁定光标",
      restartRobot: "重启机器人",
      pushRobot: "抓取机器人",
      switchLang: "切换语言",
      failure: "检测到机器人故障",
      failureDesc: "找到红色单位并按 [R] 重启。",
      critical: "严重故障",
      criticalDesc: "按 [P] 抓取单位并移向橙色维保区。",
      gameOverTitle: "系统停机",
      allFailedMsg: "所有单位均已停止运行。",
      timeoutMsg: "送达超时 (30秒未送达)。",
      restartBtn: "重启系统",
      helmetReq: "安全第一：请按 [M] 戴上安全帽以开始移动",
      helmetHolo: "请佩戴安全帽",
      back: "返回菜单",
      starReq: "星星获得条件"
    }
  }[language];

  const timeRemaining = Math.max(0, 30 - Math.floor((Date.now() - lastDeliveryTime) / 1000));

  const initialPos = useMemo(() => new Vector3(0, 1.6, 10), []);

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-blue-500/30">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault fov={75} />
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Warehouse language={language} />
        {robotData.map((robot) => (
          <Robot
            key={robot.key}
            id={robot.id}
            initialPosition={[0, 0.5, 0]}
            shelfPos={SHELF_POSITIONS[robot.shelfIndex]}
            workstationPos={WORKSTATIONS[robot.wsIndex]}
            maintenancePos={MAINTENANCE_AREA}
            onStatusChange={handleRobotStatusChange}
            onDeliver={handleDeliver}
            language={language}
            isGrabbed={grabbedRobotId === robot.id}
            onGrab={handleGrab}
            disabled={!hasHelmet}
          />
        ))}
        <Player 
          isGrabbing={grabbedRobotId !== null} 
          canMove={hasHelmet} 
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

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
        <div className="flex justify-between items-start -mt-2 -ml-2 sm:-mt-4 sm:-ml-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/60 backdrop-blur-2xl border border-white/10 p-4 rounded-br-3xl shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-blue-600 text-[8px] px-2 py-0.5 font-bold rounded-bl-lg shadow-lg">
              {t.brand}
            </div>
            <h1 className="text-xl font-black tracking-tight flex items-baseline gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)] self-center" />
              {t.title}
              <span className="text-[10px] opacity-40 font-mono font-normal ml-1">{t.version}</span>
            </h1>
            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <Target size={10} /> {starReq}
            </p>
            <p className="text-[9px] text-white/40 font-mono mt-0.5 tracking-widest uppercase">{t.status}</p>
          </motion.div>

          <div className="flex flex-col gap-3 items-end">
            <button 
              onClick={() => onExit(deliveries)}
              className="pointer-events-auto bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 p-3 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <ArrowLeft size={14} />
              {t.back}
            </button>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-2xl flex items-center gap-6"
            >
              <div className="text-right">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.deliveries}</p>
                <div className="flex items-center justify-end gap-2">
                  <Package size={16} className="text-blue-400" />
                  <p className="text-2xl font-mono leading-none">{deliveries}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-white/5" />
              <div className="text-right">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.timeout}</p>
                <div className="flex items-center justify-end gap-2">
                  <Clock size={16} className={timeRemaining < 15 ? 'text-red-500 animate-pulse' : 'text-white/60'} />
                  <p className={`text-2xl font-mono leading-none ${timeRemaining < 15 ? 'text-red-500' : ''}`}>
                    {timeRemaining}s
                  </p>
                </div>
              </div>
              <div className="w-px h-10 bg-white/5" />
              <div className="text-right">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{t.starReq}</p>
                <div className="flex items-center justify-end gap-2">
                  <Target size={16} className="text-yellow-400" />
                  <p className="text-xs font-bold text-white/80">{starReq}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {!hasHelmet && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="text-6xl font-black text-blue-500/20 uppercase tracking-[0.3em] blur-sm absolute">
                {t.helmetHolo}
              </div>
              <div className="text-4xl font-black text-white uppercase tracking-[0.2em] relative drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]">
                {t.helmetHolo}
              </div>
              <div className="bg-yellow-500 text-black px-8 py-3 rounded-full font-black animate-bounce shadow-2xl border-4 border-black text-xl">
                {t.helmetReq}
              </div>
            </motion.div>
          </div>
        )}

        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {robotData.some(r => r.status === 'failed' || r.status === 'critical') && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 p-5 rounded-2xl flex items-center gap-4 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                >
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">{t.failure}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {robotData.some(r => r.status === 'critical') ? t.criticalDesc : t.failureDesc}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl max-w-xs">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
                <Info size={12} /> {t.controls}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                <span className="text-white/30 uppercase tracking-tighter">{t.move}</span>
                <span className="text-white/80">WASD / ARROWS</span>
                <span className="text-white/30 uppercase tracking-tighter">{t.look}</span>
                <span className="text-white/80">MOUSE</span>
                <span className="text-white/30 uppercase tracking-tighter">{t.restartRobot}</span>
                <span className="text-white/80 font-bold text-blue-400">[R]</span>
                <span className="text-white/30 uppercase tracking-tighter">{t.pushRobot}</span>
                <span className="text-white/80 font-bold text-orange-400">[P]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {gameOver !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center max-w-md"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/30">
                <RotateCcw className="text-red-500" size={40} />
              </div>
              <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase">{t.gameOverTitle}</h2>
              <p className="text-white/60 mb-10 text-lg leading-relaxed">
                {gameOver === 'all_failed' ? t.allFailedMsg : t.timeoutMsg}
                <br />
                <span className="text-sm font-mono mt-4 block opacity-50">
                  {t.deliveries}: {deliveries}
                </span>
              </p>
              <button 
                onClick={() => onExit(deliveries)}
                className="pointer-events-auto w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                <RefreshCcw size={20} />
                {t.restartBtn}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
