import { useState, useCallback, useEffect, useRef, useMemo, RefObject, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, PerspectiveCamera, Box, Plane, Text, Billboard, Line } from '@react-three/drei';
import { Vector2, Vector3, Group, Mesh, Color, Plane as ThreePlane, PerspectiveCamera as ThreePerspectiveCamera } from 'three';
import { Warehouse } from '../components/Warehouse';
import { Player } from '../components/Player';
import { ArrowLeft, CheckCircle2, Info, MapPin, Ruler, Target, ShieldAlert, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { Language } from '../types';

interface Level6Props {
  language: Language;
  starReq: string;
  onExit: (success: boolean) => void;
}

type Phase = 'LINE_DRAWING' | 'ALIGNMENT' | 'STICKING' | 'COMPLETE';

export function Level6({ language, starReq, onExit }: Level6Props) {
  const [phase, setPhase] = useState<Phase>('LINE_DRAWING');
  const [message, setMessage] = useState("");
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Phase 1: Line Drawing
  const [lineStart, setLineStart] = useState<Vector3 | null>(null);
  const [lineEnd, setLineEnd] = useState<Vector3 | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Phase 2: Alignment & Sticking
  const [activeQRIndex, setActiveQRIndex] = useState(0);
  const [alignmentScore, setAlignmentScore] = useState(0); // 0 to 1
  const [stickProgress, setStickProgress] = useState(0); // 0 to 1
  const [completedQRs, setCompletedQRs] = useState<boolean[]>([false, false, false, false]);
  
  // High-frequency data refs for synchronized access in useFrame
  const lineStartRef = useRef<Vector3 | null>(null);
  const lineEndRef = useRef<Vector3 | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const activeQRIndexRef = useRef(0);
  const stickProgressValueRef = useRef(0);
  const alignmentScoreValueRef = useRef(0);

  // Setters that sync to refs immediately for useFrame
  const setPhaseWithRef = (p: Phase) => {
    setPhase(p);
    phaseRef.current = p;
  };
  
  const setActiveQRIndexWithRef = (i: number) => {
    setActiveQRIndex(i);
    activeQRIndexRef.current = i;
  };
  
  const setStickProgressWithRef = (p: number) => {
    setStickProgress(p);
    stickProgressValueRef.current = p;
  };
  
  const setAlignmentScoreWithRef = (s: number) => {
    setAlignmentScore(s);
    alignmentScoreValueRef.current = s;
  };

  const qrPositions = useMemo(() => {
    if (!lineStart || !lineEnd) return [];
    
    const positions = [];
    const count = 4;
    // Calculate 4 points along the drawn line
    for (let i = 0; i < count; i++) {
      const lerpT = (i + 1) / (count + 1); // Distribute points evenly along the line
      const pos = new Vector3().lerpVectors(lineStart, lineEnd, lerpT);
      pos.y = 0.01; // Keep on floor
      positions.push(pos);
    }
    return positions;
  }, [lineStart, lineEnd]);

  const translations = {
    en: {
      title: "Line Marking & QR Sticking",
      instruction: "Learn the process of floor marking and QR positioning.",
      phase1: "Phase 1: Establish Reference Line",
      phase1Hint: "Drag from start to end to create a laser reference line (Min 3m)",
      phase2: "Phase 2: Align Sticking Tool",
      phase2Hint: "Align the tool center with the QR point (Green = Good)",
      phase3: "Phase 3: Apply Sticker",
      phase3Hint: "Hold and slide to fix the sticker firmly",
      complete: "PROCESS COMPLETE",
      back: "Back to Menu",
      finalTitle: "Process Familiarization Complete",
      finalMsg: "You have understood the basic flow of QR positioning, alignment, and application.",
      finalWarning: "This level is used to help understand the basic process of QR code positioning, alignment, and sticking. In real-world sites, professional tools such as laser levels need to be used for high-precision calibration to ensure that the sticking position deviation is within a strict range, otherwise it will affect the robot's navigation accuracy and operational safety. This game does not simulate real precision requirements and is only used for process awareness training.",
      restart: "FINISH",
      controls: "Controls",
      draw: "Click & Drag to Draw Line",
      align: "Move Mouse to Align",
      stick: "Hold Left Click to Stick",
      look: "Look",
      move: "Move",
      progress: "Progress",
      lineTooShort: "Line too short! (Min 3m required)",
      ready: "READY",
      aligning: "ALIGNING...",
      manual: "Hotmeer Genuine Product"
    },
    zh: {
      title: "画线贴码流程培训",
      instruction: "学习地面标线与二维码定位贴合的完整流程。",
      phase1: "第一阶段：建立基准线",
      phase1Hint: "点击并拖拽，建立一条穿过所有点位的激光基准线 (需大于3米)",
      phase2: "第二阶段：对齐贴码工具",
      phase2Hint: "将工具中心与地面点位重合（绿色表示对齐）",
      phase3: "第三阶段：贴合二维码",
      phase3Hint: "按住并滑动以完成二维码的固定",
      complete: "流程熟悉完成",
      back: "返回菜单",
      finalTitle: "流程认知达成",
      finalMsg: "你已掌握二维码定位、对齐与贴码的基本操作流程。",
      finalWarning: "本关用于帮助理解二维码定位、对齐及贴码的基本流程，在真实现场中需要使用激光水平仪等专业工具进行高精度校准，确保贴码位置偏差在严格范围内，否则会影响机器人导航精度与运行安全。本游戏未模拟真实精度要求，仅用于流程认知训练。",
      restart: "完成",
      controls: "操作指南",
      draw: "点击并拖拽画线",
      align: "移动鼠标对齐",
      stick: "按住左键贴码",
      look: "视角",
      move: "移动",
      progress: "完成进度",
      lineTooShort: "基准线太短！(需大于3米)",
      ready: "已就绪",
      aligning: "对齐中...",
      manual: "Hotmeer 正品防伪标签"
    }
  }[language];

  useEffect(() => {
    if (phase === 'LINE_DRAWING') setMessage(translations.phase1Hint);
    if (phase === 'ALIGNMENT') setMessage(translations.phase2Hint);
    if (phase === 'STICKING') setMessage(translations.phase3Hint);
  }, [phase, language, translations.phase1Hint, translations.phase2Hint, translations.phase3Hint]);

  const handleLineComplete = useCallback(() => {
    if (lineStartRef.current && lineEndRef.current) {
      const distance = lineStartRef.current.distanceTo(lineEndRef.current);
      if (distance < 3) {
        setMessage(translations.lineTooShort);
        setLineStart(null);
        setLineEnd(null);
        lineStartRef.current = null;
        lineEndRef.current = null;
        soundManager.playError();
        return;
      }
      soundManager.playSuccess();
      setPhaseWithRef('ALIGNMENT');
    }
  }, [translations.lineTooShort]);

  const handleAlignmentComplete = useCallback(() => {
    soundManager.playSuccess();
    setPhaseWithRef('STICKING');
  }, []);

  const handleStickComplete = useCallback((index: number) => {
    if (phaseRef.current !== 'STICKING') return;
    
    setCompletedQRs(prevQRs => {
      const newCompleted = [...prevQRs];
      newCompleted[index] = true;
      
      const allDone = newCompleted.filter(c => c).length >= 4;
      if (allDone) {
        setPhaseWithRef('COMPLETE');
        setShowFinalModal(true);
      } else {
        setPhaseWithRef('ALIGNMENT');
        setActiveQRIndexWithRef(index + 1);
        setAlignmentScoreWithRef(0);
        setStickProgressWithRef(0);
      }
      return newCompleted;
    });
    soundManager.playSuccess();
  }, []);

  const initialPos = useMemo(() => new Vector3(0, 1.6, 10), []);

  return (
    <div className="w-full h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault fov={75} position={[0, 1.6, 10]} />
          <Sky sunPosition={[100, 20, 100]} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Warehouse language={language} showFacilities={false} hideQRs={true} />
          
          <SceneController phase={phase} alignmentScore={alignmentScore} />
        
        {/* Ground QR Points - Only visible after line is drawn */}
        {phase !== 'LINE_DRAWING' && qrPositions.map((pos, i) => (
          <group key={`qr-${i}`} position={pos}>
            <Plane args={[0.4, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
              <meshStandardMaterial 
                color={completedQRs[i] ? "white" : i === activeQRIndex ? "yellow" : "rgba(255,255,255,0.1)"} 
                transparent 
                opacity={0.8}
              />
            </Plane>
            {completedQRs[i] && (
              <group position={[0, 0.001, 0]}>
                <Box args={[0.38, 0.001, 0.38]}>
                  <meshStandardMaterial color="white" />
                </Box>
                {/* Detailed Mock QR Pattern */}
                {[...Array(6)].map((_, row) => 
                  [...Array(6)].map((_, col) => (
                    (row + col) % 3 !== 0 && (
                      <Box key={`${row}-${col}`} args={[0.05, 0.002, 0.05]} position={[-0.125 + col * 0.05, 0.001, -0.125 + row * 0.05]}>
                        <meshStandardMaterial color="black" />
                      </Box>
                    )
                  ))
                )}
                {/* QR Corners (Position Detection Patterns) */}
                <group position={[-0.11, 0.002, -0.11]}>
                  <Box args={[0.1, 0.001, 0.1]}><meshStandardMaterial color="black" /></Box>
                  <Box args={[0.06, 0.002, 0.06]}><meshStandardMaterial color="white" /></Box>
                  <Box args={[0.03, 0.003, 0.03]}><meshStandardMaterial color="black" /></Box>
                </group>
                <group position={[0.11, 0.002, -0.11]}>
                  <Box args={[0.1, 0.001, 0.1]}><meshStandardMaterial color="black" /></Box>
                  <Box args={[0.06, 0.002, 0.06]}><meshStandardMaterial color="white" /></Box>
                  <Box args={[0.03, 0.003, 0.03]}><meshStandardMaterial color="black" /></Box>
                </group>
                <group position={[-0.11, 0.002, 0.11]}>
                  <Box args={[0.1, 0.001, 0.1]}><meshStandardMaterial color="black" /></Box>
                  <Box args={[0.06, 0.002, 0.06]}><meshStandardMaterial color="white" /></Box>
                  <Box args={[0.03, 0.003, 0.03]}><meshStandardMaterial color="black" /></Box>
                </group>
              </group>
            )}
            <Billboard position={[0, 0.5, 0]}>
              <Text fontSize={0.1} color="white">{`P${i+1}`}</Text>
            </Billboard>
          </group>
        ))}

        {/* Laser Line - Only visible during drawing phase */}
        {phase === 'LINE_DRAWING' && lineStart && lineEnd && (
          <Line
            points={[
              [lineStart.x, 0.02, lineStart.z],
              [lineEnd.x, 0.02, lineEnd.z]
            ]}
            color="#ff0000"
            lineWidth={3}
          />
        )}

        {/* Permanent Reference Line (Subtle) */}
        {phase !== 'LINE_DRAWING' && lineStart && lineEnd && (
          <Line
            points={[
              [lineStart.x, 0.015, lineStart.z],
              [lineEnd.x, 0.015, lineEnd.z]
            ]}
            color="#222"
            lineWidth={1}
          />
        )}

        {/* Handheld Tools */}
        <Player 
          isGrabbing={false} 
          canMove={true} 
          initialPosition={initialPos}
          onLockChange={setIsLocked}
        />

        {/* Handheld Ink Fountain / Tool Model */}
        <HandheldTool 
          phase={phase} 
          isLocked={isLocked}
          activeQRIndex={activeQRIndex}
          alignmentScore={alignmentScore} 
          setAlignmentScore={setAlignmentScoreWithRef}
          targetPos={qrPositions[activeQRIndex]}
          stickProgress={stickProgress}
          stickProgressValueRef={stickProgressValueRef}
          setStickProgress={setStickProgressWithRef}
          onStickComplete={handleStickComplete}
          onAlignComplete={handleAlignmentComplete}
          onLineStart={(p) => { setLineStart(p); lineStartRef.current = p; }}
          onLineEnd={(p) => { setLineEnd(p); lineEndRef.current = p; }}
          onLineComplete={handleLineComplete}
        />
        </Suspense>
      </Canvas>

      {/* Crosshair */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-40 transition-opacity duration-300 ${isLocked ? 'opacity-100' : 'opacity-0'}`}>
        <div className="relative">
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white/40 rounded-full" />
        </div>
      </div>

      {/* UI */}
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-10 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl relative overflow-hidden max-w-xs">
              <div className="absolute top-0 right-0 bg-blue-600 text-[8px] px-2 py-0.5 font-bold rounded-bl-lg shadow-lg">
                {translations.manual}
              </div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Ruler size={18} className="text-blue-500" />
                {translations.title}
              </h1>
              <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                <Target size={10} /> {starReq}
              </p>
              <p className="text-[9px] text-white/50 mt-1 uppercase tracking-widest">{translations.instruction}</p>
              
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center gap-8">
                <div>
                  <p className="text-[8px] text-white/30 uppercase tracking-widest">{translations.progress}</p>
                  <p className="text-xl font-mono font-black text-green-500">{completedQRs.filter(c => c).length}/4</p>
                </div>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl max-w-[220px]">
              <div className="space-y-1.5">
                {(['LINE_DRAWING', 'ALIGNMENT', 'STICKING'] as const).map((p, i) => (
                  <div key={p} className={`flex items-center gap-2 text-[10px] ${phase === p ? 'text-white' : i < ['LINE_DRAWING', 'ALIGNMENT', 'STICKING'].indexOf(phase) ? 'text-green-500' : 'text-white/20'}`}>
                    {i < ['LINE_DRAWING', 'ALIGNMENT', 'STICKING'].indexOf(phase) ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    <span className="font-bold uppercase tracking-tight">{translations[`phase${i+1}` as keyof typeof translations]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <button onClick={() => onExit(phase === 'COMPLETE')} className="pointer-events-auto bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase">
              <ArrowLeft size={14} /> {translations.back}
            </button>
          </div>
        </div>

        {/* Message Overlay */}
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

        {/* Alignment/Stick HUD */}
        {(phase === 'ALIGNMENT' || phase === 'STICKING') && (
          <>
            {/* Magnifier Guide - Visual only, helps with precision feel */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <motion.div 
                animate={{ 
                  scale: alignmentScore > 0.5 ? 1 + (alignmentScore * 0.5) : 1,
                  opacity: alignmentScore > 0.2 ? 1 : 0
                }}
                className="w-32 h-32 border-2 border-white/20 rounded-full backdrop-blur-[2px] flex items-center justify-center"
              >
                <div className="w-full h-[1px] bg-white/10 absolute" />
                <div className="h-full w-[1px] bg-white/10 absolute" />
              </motion.div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 flex flex-col items-center gap-4">
            {phase === 'ALIGNMENT' && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden border border-white/20">
                  <motion.div 
                    className="h-full bg-green-500"
                    animate={{ width: `${alignmentScore * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  {alignmentScore > 0.8 ? translations.ready : translations.aligning}
                </p>
              </div>
            )}
            {phase === 'STICKING' && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden border border-white/20">
                  <motion.div 
                    className="h-full bg-blue-500"
                    animate={{ width: `${stickProgress * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  {translations.stick}
                </p>
              </div>
            )}
          </div>
        </>
      )}

        <div className="flex justify-between items-end">
          <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl max-w-xs">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
              <Info size={12} /> {translations.controls}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
              <span className="text-white/30 uppercase tracking-tighter">{translations.move}</span>
              <span className="text-white/80">WASD / ARROWS</span>
              <span className="text-white/30 uppercase tracking-tighter">{translations.look}</span>
              <span className="text-white/80">MOUSE</span>
              <span className="text-white/30 uppercase tracking-tighter">
                {phase === 'LINE_DRAWING' ? translations.draw : phase === 'ALIGNMENT' ? translations.align : translations.stick}
              </span>
              <span className="text-white/80 font-bold text-blue-400">[LEFT CLICK]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Final Modal */}
      <AnimatePresence>
        {showFinalModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
            <div className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] shadow-2xl relative scrollbar-none">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-orange-500 to-blue-500" />
              
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-8 border border-green-500/30">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              
              <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase">{translations.finalTitle}</h2>
              
              <div className="space-y-6 text-white/70 leading-relaxed">
                <p className="text-lg font-medium text-white">{translations.finalMsg}</p>
                
                <div className="bg-orange-500/10 border border-orange-500/30 p-6 rounded-2xl flex gap-4">
                  <ShieldAlert className="text-orange-500 shrink-0" size={24} />
                  <p className="text-sm italic text-orange-200/80">
                    {translations.finalWarning}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => onExit(true)}
                className="pointer-events-auto w-full mt-10 bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {translations.restart}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HandheldTool({ 
  phase, 
  isLocked,
  activeQRIndex,
  alignmentScore, 
  setAlignmentScore, 
  targetPos, 
  stickProgress, 
  stickProgressValueRef,
  setStickProgress, 
  onStickComplete,
  onAlignComplete,
  onLineStart,
  onLineEnd,
  onLineComplete
}: { 
  phase: Phase, 
  isLocked: boolean,
  activeQRIndex: number,
  alignmentScore: number, 
  setAlignmentScore: (s: number) => void, 
  targetPos?: Vector3,
  stickProgress: number,
  stickProgressValueRef: RefObject<number | null>,
  setStickProgress: (p: number) => void,
  onStickComplete: (idx: number) => void,
  onAlignComplete: () => void,
  onLineStart: (p: Vector3) => void,
  onLineEnd: (p: Vector3) => void,
  onLineComplete: () => void
}) {
  const group = useRef<Group>(null);
  const lineStartSet = useRef(false);
  const isCompleting = useRef(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const floorPlaneRef = useRef(new ThreePlane(new Vector3(0, 1, 0), 0));
  const phaseStartTimeRef = useRef(Date.now());

  // Reset completion guard when phase changes
  useEffect(() => {
    isCompleting.current = false;
    phaseStartTimeRef.current = Date.now();
  }, [phase, activeQRIndex]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (e.button === 0 && isLocked) {
        setIsMouseDown(true);
      }
    };
    const up = (e: MouseEvent) => {
      if (e.button === 0) {
        setIsMouseDown(false);
        if (phase === 'LINE_DRAWING' && lineStartSet.current) {
          onLineComplete();
        }
      }
    };
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, [phase, onLineComplete, isLocked]);

  useFrame((state) => {
    if (!group.current) return;

    // Position tool in front of camera
    const activeCamera = state.camera;
    const { raycaster, pointer, scene } = state;

    const toolOffset = new Vector3(0.3, -0.4, -0.8); // Offset to the right slightly
    toolOffset.applyQuaternion(activeCamera.quaternion);
    toolOffset.add(activeCamera.position);
    group.current.position.lerp(toolOffset, 0.1);
    group.current.quaternion.slerp(activeCamera.quaternion, 0.1);

    // Ensure raycaster is always centered (for crosshair interaction)
    const center = new Vector2(0, 0);
    raycaster.setFromCamera(center, activeCamera);
    
    // Intersection point logic
    const intersects = raycaster.intersectObjects(scene.children, true);
    const groundIntersect = intersects.find(i => i.object.name === 'ground');
    const point = new Vector3();

    const intersectResult = groundIntersect ? point.copy(groundIntersect.point) : raycaster.ray.intersectPlane(floorPlaneRef.current, point);

    if (intersectResult) {
      if (phase === 'LINE_DRAWING') {
        if (isMouseDown && isLocked) {
          if (!lineStartSet.current) {
            onLineStart(point.clone());
            lineStartSet.current = true;
          }
          onLineEnd(point.clone());
        } else {
          lineStartSet.current = false;
        }
      }

      const timeInPhase = Date.now() - phaseStartTimeRef.current;

      if (phase === 'ALIGNMENT' && targetPos) {
        // Pointer-based alignment (using raycast point)
        const dist = Math.sqrt(
          Math.pow(point.x - targetPos.x, 2) + 
          Math.pow(point.z - targetPos.z, 2)
        );
        
        // Relaxed sensitivity: Bar starts filling at 100cm, completes at 10cm
        const score = Math.max(0, 1 - dist * 2);
        setAlignmentScore(score);
        // Only complete alignment if we've been in the phase for at least 1s 
        // to prevent auto-triggering the next one too fast
        if (score > 0.85 && timeInPhase > 1000) {
          onAlignComplete();
        }
      }

      if (phase === 'STICKING' && targetPos) {
        if (isMouseDown && isLocked) {
          // Pointer-based check during sticking
          const dist = Math.sqrt(
            Math.pow(point.x - targetPos.x, 2) + 
            Math.pow(point.z - targetPos.z, 2)
          );
          
          if (dist < 0.4) { // Even more generous radius (40cm - matches QR size)
            const nextProgress = Math.min(1, stickProgressValueRef.current + 0.02);
            setStickProgress(nextProgress);
            if (nextProgress >= 1 && !isCompleting.current) {
              isCompleting.current = true;
              onStickComplete(activeQRIndex);
            }
          } else {
            setStickProgress(Math.max(0, stickProgressValueRef.current - 0.05));
          }
        } else {
          setStickProgress(Math.max(0, stickProgressValueRef.current - 0.02));
        }
      }
    }
  });

  return (
    <group ref={group}>
      {/* Laser Instrument Model */}
      <group rotation={[0, 0, 0]}>
        {/* Main Body */}
        <Box args={[0.15, 0.15, 0.3]}>
          <meshStandardMaterial 
            color="#222" 
            metalness={0.9} 
            roughness={0.1} 
            transparent={phase === 'ALIGNMENT' || phase === 'STICKING'}
            opacity={phase === 'ALIGNMENT' || phase === 'STICKING' ? 0.3 : 1}
          />
        </Box>
        {/* Top Screen/Sensor */}
        <Box args={[0.1, 0.02, 0.1]} position={[0, 0.08, 0.05]}>
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
        </Box>
        
        {/* Side Laser Emitter (Left side only) */}
        <group position={[-0.08, 0, 0]}>
          <Box args={[0.02, 0.05, 0.05]}>
            <meshStandardMaterial color="#ff0000" />
          </Box>
          {/* Side Laser Beam */}
          <Box args={[10, 0.005, 0.005]} position={[-5, 0, 0]}>
            <meshStandardMaterial 
              color="#ff0000" 
              emissive="#ff0000" 
              emissiveIntensity={10} 
              transparent 
              opacity={0.4} 
            />
          </Box>
        </group>

        {/* Alignment Laser/Indicator - Points from camera/pointer to floor */}
        {phase === 'ALIGNMENT' && (
          <group position={[0, -0.05, 0]}>
            <Box args={[0.005, 0.005, 10]} position={[0, 0, -5]}>
              <meshStandardMaterial 
                color={alignmentScore > 0.8 ? "#00ff00" : "#ff0000"} 
                emissive={alignmentScore > 0.8 ? "#00ff00" : "#ff0000"}
                emissiveIntensity={10}
                transparent
                opacity={0.6}
              />
            </Box>
            {/* Viewfinder Crosshair on Tool */}
            <group position={[0, 0, -0.3]}>
              <Box args={[0.2, 0.002, 0.002]}><meshStandardMaterial color="white" /></Box>
              <Box args={[0.002, 0.2, 0.002]}><meshStandardMaterial color="white" /></Box>
            </group>
          </group>
        )}
      </group>
    </group>
  );
}

function SceneController({ phase, alignmentScore }: { phase: Phase, alignmentScore: number }) {
  const { camera } = useThree();

  // Reset FOV on unmount
  useEffect(() => {
    return () => {
      if (camera instanceof ThreePerspectiveCamera) {
        camera.fov = 75;
        camera.updateProjectionMatrix();
      }
    };
  }, [camera]);

  useFrame((state) => {
    // Dynamic FOV: Zoom in when aligning to help with precision
    // We also check the camera pitch - if looking down, zoom more
    const pitch = state.camera.rotation.x;
    const isLookingDown = pitch < -0.5;
    
    let targetFOV = 75;
    if (phase === 'ALIGNMENT' || phase === 'STICKING') {
      // Base zoom when in phase
      targetFOV = 65;
      // Extra zoom based on alignment progress and looking down
      if (isLookingDown) {
        targetFOV -= (alignmentScore * 15); // Reduced from 25
      }
    }
    
    if (state.camera instanceof ThreePerspectiveCamera) {
      const diff = Math.abs(targetFOV - state.camera.fov);
      if (diff > 0.01) {
        state.camera.fov += (targetFOV - state.camera.fov) * 0.02;
        state.camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}
