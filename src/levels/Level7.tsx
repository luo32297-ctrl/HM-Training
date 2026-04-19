import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Environment, Float, ContactShadows, Text } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Eye, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert,
  Info,
  ChevronRight,
  Battery,
  Camera,
  Layers,
  Zap,
  RotateCcw,
  Activity,
  Target
} from 'lucide-react';
import { Vector3, Euler, Mesh, MeshStandardMaterial, Group } from 'three';
import { soundManager } from '../lib/sounds';

interface Level7Props {
  language: 'en' | 'zh';
  starReq: string;
  onExit: (success: boolean) => void;
}

type Step = 'INITIAL' | 'INSPECT' | 'DISASSEMBLE' | 'REPAIR';
type FaultType = 
  | 'light_strip' 
  | 'bumper' 
  | 'camera' 
  | 'drive_wheel_jam' 
  | 'debris_wheel' 
  | 'charging_port' 
  | 'battery' 
  | 'lubrication';

interface RobotState {
  id: number;
  fault: FaultType;
  isInspected: boolean;
  isDisassembled: boolean;
  isRepaired: boolean;
  hasSafetyRisk: boolean;
}

const FAULTS: Record<FaultType, {
  en: { name: string, description: string, symptom: string, fix: string, reading: string, normal: string },
  zh: { name: string, description: string, symptom: string, fix: string, reading: string, normal: string },
  dangerZone?: string;
}> = {
  light_strip: {
    en: { name: 'Light Strip Failure', description: 'The status LED is flickering or completely dark.', symptom: 'Inspect lighting circuit', fix: 'Replace LED component', reading: '0.2mA', normal: '20mA' },
    zh: { name: '灯带故障', description: '状态指示灯闪烁或完全不亮。', symptom: '检查照明电路', fix: '更换LED组件', reading: '0.2mA', normal: '20mA' }
  },
  bumper: {
    en: { name: 'Bumper Damaged', description: 'Physical damage to the safety bumper.', symptom: 'Check bumper integrity', fix: 'Replace rubber bumper', reading: 'Open Circuit', normal: 'Closed Loop' },
    zh: { name: '防撞条损坏', description: '安全触边物理损坏。', symptom: '检查触边完整性', fix: '更换橡胶防撞组件', reading: '断路', normal: '闭路' }
  },
  camera: {
    en: { name: 'Camera Damaged', description: 'Optical sensors not reporting data.', symptom: 'Inspect vision module', fix: 'Replace camera lens kit', reading: 'Link Down', normal: 'Link Up' },
    zh: { name: '相机损坏', description: '光学识别传感器无数据上报。', symptom: '检查视觉模块', fix: '更换相机镜头套件', reading: '连接断开', normal: '连接正常' }
  },
  drive_wheel_jam: {
    en: { name: 'Drive Wheel Jammed', description: 'Motor overload detected on drive wheel.', symptom: 'Check motor torque', fix: 'Clear gears and reset', reading: 'Over-Torque', normal: 'Nominal' },
    zh: { name: '驱动轮卡死', description: '检测到驱动电机负载过高。', symptom: '检查电机扭矩', fix: '清理齿轮并重置', reading: '扭矩超限', normal: '额定' }
  },
  debris_wheel: {
    en: { name: 'Debris in Wheel', description: 'Foreign objects caught in caster wheel.', symptom: 'Check wheel rotation', fix: 'Remove foreign objects', reading: 'Friction Err', normal: 'Free Spin' },
    zh: { name: '异物卡住轮', description: '万向轮内卷入异物。', symptom: '检查轮子转动情况', fix: '清除缠绕异物', reading: '摩擦异常', normal: '自由转动' }
  },
  charging_port: {
    en: { name: 'Charging Port Damaged', description: 'Poor contact or burnt pins on charging electrode.', symptom: 'Check electrical continuity', fix: 'Replace charging electrode', reading: 'High Resistance', normal: 'Low Resistance' },
    zh: { name: '充电口损坏', description: '充电电极接触不良或烧蚀。', symptom: '检查导通性', fix: '更换充电极板', reading: '高阻抗', normal: '低阻抗' }
  },
  battery: {
    en: { name: 'Battery Damaged', description: 'Voltage instability or capacity drop.', symptom: 'Test battery voltage', fix: 'Replace Lithium battery pack', reading: '1.2V', normal: '24V' },
    zh: { name: '电池损坏', description: '电压不稳定或容量异常下降。', symptom: '测试电池电压', fix: '更换锂电池组', reading: '1.2V', normal: '24V' },
    dangerZone: 'battery'
  },
  lubrication: {
    en: { name: 'Lubrication Needed', description: 'Squeaking noises during lifting operations.', symptom: 'Inspect scissor lift joints', fix: 'Apply BR-C2 grease', reading: 'Vibration Max', normal: 'Stable' },
    zh: { name: '需要上油保养', description: '举升机构操作时伴有异响。', symptom: '检查剪刀叉关节', fix: '涂抹百润BR-C2润滑脂', reading: '震动峰值', normal: '稳定' }
  }
};

const PART_INFO: Record<string, { 
  en: string, zh: string, 
  enDesc: string, zhDesc: string,
  toolEn: string, toolZh: string
}> = {
  chassis: {
    en: 'Main Chassis', zh: '主底盘',
    enDesc: 'High-strength aluminum alloy structural frame.', zhDesc: '高强度铝合金结构框架。',
    toolEn: 'N/A', toolZh: '主结构'
  },
  chassis_accent_l: {
    en: 'Side Panel (L)', zh: '左侧盖板',
    enDesc: 'Decorative and protective side panel.', zhDesc: '装饰与保护性侧边面板。',
    toolEn: 'N/A', toolZh: '外观件'
  },
  chassis_accent_r: {
    en: 'Side Panel (R)', zh: '右侧盖板',
    enDesc: 'Decorative and protective side panel.', zhDesc: '装饰与保护性侧边面板。',
    toolEn: 'N/A', toolZh: '外观件'
  },
  lidar_base: {
    en: 'LiDAR Base', zh: '雷达基座',
    enDesc: 'Stable platform for laser scanner assembly.', zhDesc: '激光扫描仪组件的稳定平台。',
    toolEn: 'Screwdriver', toolZh: '电批'
  },
  lidar_head: { 
    en: 'LiDAR Sensor', zh: '激光雷达', 
    enDesc: 'Scanning Laser Range Finder for obstacle detection.', zhDesc: '用于避障扫描的激光测距雷达。',
    toolEn: 'Multimeter', toolZh: '万用表'
  },
  bumper: { 
    en: 'Safety Bumper', zh: '安全防撞条', 
    enDesc: 'Safety contact strip for collision prevention.', zhDesc: '用于碰撞预防的安全接触传感器。',
    toolEn: 'Wrench / Screwdriver', toolZh: '棘轮扳手 / 电批'
  },
  camera: { 
    en: 'Vision Module', zh: '视觉模块', 
    enDesc: 'Visual navigation module for QR code tracking.', zhDesc: '用于二维码追踪的视觉导航模块。',
    toolEn: 'Screwdriver / Multimeter', toolZh: '电批 (更换) / 万用表 (校准)'
  },
  charging_port: { 
    en: 'Charging Electrode', zh: '充电极板', 
    enDesc: 'Rear electrodes for automated charging stations.', zhDesc: '对接自动充电桩的后部电极。',
    toolEn: 'Wrench / Screwdriver', toolZh: '棘轮扳手 / 电批'
  },
  drive_wheel_left: { 
    en: 'Drive Wheel', zh: '驱动轮', 
    enDesc: 'Primary traction motor and drive assembly.', zhDesc: '主牵引电机及驱动组件。',
    toolEn: 'Wrench (Clearance)', toolZh: '棘轮扳手 (清理)'
  },
  drive_wheel_right: { 
    en: 'Drive Wheel', zh: '驱动轮', 
    enDesc: 'Primary traction motor and drive assembly.', zhDesc: '主牵引电机及驱动组件。',
    toolEn: 'Wrench (Clearance)', toolZh: '棘轮扳手 (清理)'
  },
  caster_front: { 
    en: 'Front Caster Wheel', zh: '前万向轮', 
    enDesc: 'Multi-directional support wheel for balance.', zhDesc: '提供多向支撑与平衡的万向轮。',
    toolEn: 'Wrench (Debris)', toolZh: '棘轮扳手 (清除异物)'
  },
  caster_back: { 
    en: 'Rear Caster Wheel', zh: '后万向轮', 
    enDesc: 'Multi-directional support wheel for balance.', zhDesc: '提供多向支撑与平衡的万向轮。',
    toolEn: 'Wrench (Debris)', toolZh: '棘轮扳手 (清除异物)'
  },
  light_strip: { 
    en: 'Status LED Strip', zh: '状态指示灯带', 
    enDesc: 'Visual status indicator (Operational/Error).', zhDesc: '运行状态指示灯（正常/故障）。',
    toolEn: 'Multimeter (Reset)', toolZh: '万用表 (重置)'
  },
  lift: { 
    en: 'Scissor Lift', zh: '剪刀叉举升机构', 
    enDesc: 'Hydraulic/Mechanical scissor lift mechanism.', zhDesc: '液压/机械剪刀叉举升机构。',
    toolEn: 'Screwdriver (Open) / Grease', toolZh: '电批 (开盖) / 润滑脂 (保养)'
  },
  battery: { 
    en: 'Battery Pack', zh: '电池组', 
    enDesc: 'Lithium iron phosphate high-density energy pack.', zhDesc: '磷酸铁锂高能量密度电池组。',
    toolEn: 'Screwdriver (Replace)', toolZh: '电批 (更换电池组)'
  },
  logic_board: { 
    en: 'Control Board', zh: '控制主板', 
    enDesc: 'Main control unit processing sensor telemetry.', zhDesc: '处理传感器遥测数据的主控制单元。',
    toolEn: 'N/A', toolZh: '内部组件'
  },
  wiring: { 
    en: 'Wiring Harness', zh: '线束', 
    enDesc: 'Internal power and signal cable harness.', zhDesc: '内部电源和信号线束。',
    toolEn: 'Screwdriver (Fix)', toolZh: '电批 (紧固)'
  }
};

interface PartProps {
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  args: [number, number, number] | [number, number, number, number];
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  visible?: boolean;
  onClick?: () => void;
  onHover?: (name: string | null) => void;
  type?: 'box' | 'cylinder' | 'plane' | 'sphere';
}

function RobotPart({ name, position, rotation = [0, 0, 0], args, color, emissive, emissiveIntensity, visible = true, onClick, onHover, type = 'box' }: PartProps) {
  const [hovered, setHovered] = useState(false);
  
  if (!visible) return null;

  return (
    <mesh 
      position={position} 
      rotation={rotation} 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(name);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(null);
      }}
    >
      {type === 'box' && <boxGeometry args={args as [number, number, number]} />}
      {type === 'cylinder' && <cylinderGeometry args={args as [number, number, number, number]} />}
      {type === 'plane' && <planeGeometry args={args as [number, number, number]} />}
      {type === 'sphere' && <sphereGeometry args={args as [number, number, number]} />}
      
      <meshStandardMaterial 
        color={hovered ? "#3b82f6" : color} 
        emissive={emissive || (hovered ? "#3b82f6" : color)}
        emissiveIntensity={hovered ? 0.8 : (emissiveIntensity || 0)}
        metalness={0.7}
        roughness={0.2}
      />
    </mesh>
  );
}

function Lidar({ isDisassembled, onHover }: { isDisassembled: boolean, onHover: (name: string | null) => void }) {
  const headRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (headRef.current) {
      headRef.current.rotation.y += 0.05;
    }
  });

  return (
    <group position={[0, 0.45, 0]}>
      <RobotPart 
        name="lidar_base"
        position={[0, isDisassembled ? 0.65 : 0.1, -0.7]}
        args={[0.2, 0.1, 0.2, 32]}
        type="cylinder"
        color="#111"
        onHover={onHover}
      />
      <group ref={headRef} position={[0, isDisassembled ? 0.75 : 0.2, -0.7]}>
        <RobotPart 
          name="lidar_head"
          position={[0, 0, 0]}
          args={[0.18, 0.18, 0.1, 32]}
          type="cylinder"
          color="#000"
          emissive="#0cf"
          emissiveIntensity={0.5}
          onHover={onHover}
        />
        <mesh position={[0.08, 0, 0]}>
           <boxGeometry args={[0.05, 0.05, 0.05]} />
           <meshStandardMaterial color="#0ff" emissive="#0ff" emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  );
}

function StatusLight({ position, fault, isRepaired, isInspected, currentTool, onPartClick, onPartHover }: { 
  position: [number, number, number], 
  fault: FaultType, 
  isRepaired: boolean,
  isInspected: boolean,
  currentTool: ToolType,
  onPartClick: (part: string) => void,
  onPartHover: (part: string | null) => void
}) {
  const meshRef = useRef<Mesh>(null);
  const isMultimeter = currentTool === 'MULTIMETER';

  useFrame((state) => {
    if (meshRef.current) {
      if (fault === 'light_strip' && !isRepaired) {
        // Flickering/Flashing effect for fault
        const time = state.clock.getElapsedTime();
        const intensity = Math.sin(time * 15) > 0 ? 0.8 : 0.1;
        (meshRef.current.material as MeshStandardMaterial).emissiveIntensity = intensity;
      } else {
        (meshRef.current.material as MeshStandardMaterial).emissiveIntensity = 1.0;
      }
    }
  });

  return (
    <mesh 
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onPartClick('light_strip');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPartHover('light_strip');
      }}
      onPointerOut={() => onPartHover(null)}
    >
      <boxGeometry args={[1.5, 0.04, 0.04]} />
      <meshStandardMaterial 
        color={fault === 'light_strip' && !isRepaired ? "#ffaa00" : "#00ff44"}
        emissive={fault === 'light_strip' && !isRepaired ? "#ff6600" : "#00ff44"}
        emissiveIntensity={1}
        metalness={0.8}
        roughness={0.1}
        transparent
        opacity={0.9}
      />
      {/* Decorative casing for the LED strip */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.52, 0.06, 0.02]} />
        <meshStandardMaterial color="#222" metalness={1} roughness={0} />
      </mesh>
    </mesh>
  );
}

function RobotModel({ isDisassembled, fault, isRepaired, onPartClick, onPartHover, currentTool, isInspected }: { 
  isDisassembled: boolean, 
  fault: FaultType, 
  isRepaired: boolean,
  onPartClick: (part: string) => void,
  onPartHover: (part: string | null) => void,
  currentTool: ToolType,
  isInspected: boolean
}) {
  const isMultimeter = currentTool === 'MULTIMETER';

  return (
    <group>
      {/* Logos & Text */}
      <group position={[0, 0.41, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
         <mesh>
            <planeGeometry args={[0.6, 0.2]} />
            <meshStandardMaterial color="white" />
         </mesh>
         <Text position={[0, 0, 0.01]} fontSize={0.08} color="#0055ff" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf" anchorX="center" anchorY="middle">
            HOTMEER
         </Text>
      </group>

      {/* Chassis Base - Blue/White Industrial Theme */}
      <group>
        <RobotPart 
          name="chassis"
          position={[0, 0.2, 0]}
          args={[1.6, 0.4, 2.2]}
          color="#ffffff" 
          onHover={onPartHover}
        />
        {/* Accent Side Panels */}
        <RobotPart 
          name="chassis_accent_l"
          position={[0.81, 0.2, 0]}
          args={[0.02, 0.3, 1.8]}
          color="#0055ff" 
          onHover={onPartHover}
        />
        <RobotPart 
          name="chassis_accent_r"
          position={[-0.81, 0.2, 0]}
          args={[0.02, 0.3, 1.8]}
          color="#0055ff" 
          onHover={onPartHover}
        />
      </group>
      
      {/* Bumper - Front */}
      <RobotPart 
        name="bumper"
        position={[0, 0.15, 1.15]}
        args={[1.7, 0.15, 0.1]}
        color={fault === 'bumper' && !isRepaired ? "#cc0000" : "#0055ff"}
        emissive={isMultimeter && !isInspected ? "#fff" : undefined}
        emissiveIntensity={isMultimeter && !isInspected ? 0.2 : 0}
        onClick={() => onPartClick('bumper')}
        onHover={onPartHover}
      />
      
      {/* Camera Module - Front Top */}
      <RobotPart 
        name="camera"
        position={[0, 0.45, 1]}
        args={[0.3, 0.2, 0.1]}
        color={fault === 'camera' && !isRepaired ? "#ff3333" : "#0044cc"}
        emissive={isMultimeter && !isInspected ? "#fff" : undefined}
        emissiveIntensity={isMultimeter && !isInspected ? 0.2 : 0}
        onClick={() => onPartClick('camera')}
        onHover={onPartHover}
      />

      {/* Charging Electrodes - Rear */}
      <RobotPart 
        name="charging_port"
        position={[0, 0.15, -1.15]}
        args={[0.8, 0.05, 0.1]}
        color={fault === 'charging_port' && !isRepaired ? "#860" : "#0055ff"}
        emissive={isMultimeter && !isInspected ? "#fff" : (fault === 'charging_port' && !isRepaired ? "#000" : "#f8a")}
        emissiveIntensity={0.5}
        onClick={() => onPartClick('charging_port')}
        onHover={onPartHover}
      />
      
      {/* Drive Wheels */}
      <RobotPart 
        name="drive_wheel_left"
        position={[0.8, 0.15, 0]}
        rotation={[0, 0, Math.PI/2]}
        args={[0.25, 0.25, 0.15, 32]}
        type="cylinder"
        color={fault === 'drive_wheel_jam' && !isRepaired ? "#500" : "#222"}
        emissive={isMultimeter && !isInspected ? "#fff" : undefined}
        emissiveIntensity={isMultimeter && !isInspected ? 0.2 : 0}
        onClick={() => onPartClick('drive_wheel_jam')}
        onHover={onPartHover}
      />
      <RobotPart 
        name="drive_wheel_right"
        position={[-0.8, 0.15, 0]}
        rotation={[0, 0, Math.PI/2]}
        args={[0.25, 0.25, 0.15, 32]}
        type="cylinder"
        color="#222"
        emissive={isMultimeter && !isInspected ? "#fff" : undefined}
        emissiveIntensity={isMultimeter && !isInspected ? 0.2 : 0}
        onClick={() => onPartClick('drive_wheel_jam')}
        onHover={onPartHover}
      />

      {/* Caster Wheels - Redesigned as larger spheres for better visibility and "Omni-wheel" appearance */}
      <group>
        {/* Front Caster */}
        <RobotPart 
          name="caster_front"
          position={[0, 0.1, 0.95]}
          args={[0.15, 32, 32]}
          type="sphere"
          color={fault === 'debris_wheel' && !isRepaired ? "#550" : "#222"}
          emissive={isMultimeter && !isInspected ? "#fff" : (fault === 'debris_wheel' && !isRepaired ? "#cc0" : undefined)}
          emissiveIntensity={0.3}
          onClick={() => onPartClick('caster_front')}
          onHover={onPartHover}
        />
        {/* Rear Caster */}
        <RobotPart 
          name="caster_back"
          position={[0, 0.1, -0.95]}
          args={[0.15, 32, 32]}
          type="sphere"
          color="#222"
          emissive={isMultimeter && !isInspected ? "#fff" : undefined}
          emissiveIntensity={0.2}
          onClick={() => onPartClick('caster_back')}
          onHover={onPartHover}
        />
      </group>
      
      {/* Visual Indicator Lights (Now Physical Components) */}
      <StatusLight 
        position={[0, 0.38, 1.08]} 
        fault={fault} 
        isRepaired={isRepaired} 
        isInspected={isInspected}
        currentTool={currentTool}
        onPartClick={onPartClick}
        onPartHover={onPartHover}
      />
      <StatusLight 
        position={[0, 0.38, -1.08]} 
        fault={fault} 
        isRepaired={isRepaired} 
        isInspected={isInspected}
        currentTool={currentTool}
        onPartClick={(p) => onPartClick(p)}
        onPartHover={onPartHover}
      />

      {/* Scissor Lift Top Plate */}
      <group position={[0, 0.45, 0]}>
        <RobotPart 
          name="lift"
          position={[0, isDisassembled ? 0.6 : 0.05, 0]}
          args={[1.4, 0.08, 1.8]}
          color="#f0f4f8"
          emissive={currentTool === 'SCREWDRIVER' && !isDisassembled ? "#00f" : undefined}
          emissiveIntensity={currentTool === 'SCREWDRIVER' && !isDisassembled ? 0.3 : 0}
          onClick={() => onPartClick('lift')}
          onHover={onPartHover}
        />
        {/* Scissor Arms (Abstracted) */}
        {!isDisassembled && (
           <RobotPart 
            name="lift_base"
            position={[0, 0, 0]}
            args={[1.3, 0.02, 1.7]}
            color="#0055ff"
            onHover={onPartHover}
          />
        )}
      </group>

      {/* Internal components (Visible if disassembled) */}
      <AnimatePresence>
        {isDisassembled && (
          <group position={[0, 0.35, 0]}>
            {/* Battery Pack */}
            <RobotPart 
              name="battery"
              position={[0, 0, 0]}
              args={[0.6, 0.25, 1]}
              color={fault === 'battery' && !isRepaired ? "#600" : "#1a1"}
              emissive={fault === 'battery' && !isRepaired ? "#f00" : "#0f0"}
              emissiveIntensity={fault === 'battery' && !isRepaired ? 0.2 : 0}
              onClick={() => onPartClick('battery')}
              onHover={onPartHover}
            />
            {/* Logic Board */}
            <RobotPart 
              name="logic_board"
              position={[0, 0.1, -0.6]}
              args={[0.7, 0.02, 0.5]}
              color="#020"
              emissive="#0f0"
              emissiveIntensity={0.1}
              onHover={onPartHover}
            />
            {/* Wiring harness */}
            <RobotPart 
              name="wiring"
              position={[0, -0.05, 0.6]}
              args={[0.4, 0.05, 0.4]}
              color="#333"
              onHover={onPartHover}
            />
          </group>
        )}
      </AnimatePresence>

      {/* LIDAR - Top Center */}
      <Lidar isDisassembled={isDisassembled} onHover={onPartHover} />
    </group>
  );
}

type ToolType = 'NONE' | 'MULTIMETER' | 'SCREWDRIVER' | 'WRENCH' | 'GREASE';

export function Level7({ language, starReq, onExit }: Level7Props) {
  const [step, setStep] = useState<Step>('INITIAL');
  const [feedback, setFeedback] = useState<{ type: 'none' | 'success' | 'info' | 'danger', message: string }>({ type: 'none', message: '' });
  const [robotCount, setRobotCount] = useState(0);
  const [currentRobot, setCurrentRobot] = useState<RobotState | null>(null);
  const [completedRobots, setCompletedRobots] = useState(0);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolType>('NONE');
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<string | null>(null);
  const [wrenchMode, setWrenchMode] = useState<{ active: boolean, progress: number, lastAngle: number }>({ active: false, progress: 0, lastAngle: 0 });
  const [greaseMode, setGreaseMode] = useState<{ active: boolean, progress: number }>({ active: false, progress: 0 });

  const t = useMemo(() => ({
    en: {
      intro: "New AGV arrived. Check the Mission Log for the reported symptom.",
      missionLog: "Mission Log",
      symptomReport: "Reported Symptom: {symptom}",
      inspected: "Data Acquired. Check Reference Table for abnormal values.",
      disassembled: "Chassis opened. Internal subsystems accessible.",
      repaired: "Reading Restored. System nominal.",
      success: "Repair Complete!",
      finish: "Certification Earned.",
      inspect: "Inspect",
      disassemble: "Disassemble",
      pInspect: "Scanning Phase: Probing suspicious modules",
      pDisassemble: "Access Phase: Remove cover (Use Screwdriver)",
      pRepair: "Execution Phase: Fix abnormal component",
      pWrench: "Execution Phase: Correct with Wrench",
      pScrewdriver: "Execution Phase: Replace with Screwdriver",
      pMultimeter: "Phase: Logic Recalibration (Use Multimeter)",
      pLubricate: "Phase: Applying Grease (Use Oil Can)",
      manual: "Troubleshooting Database",
      currentFault: "Diagnostic Log",
      safetyWarning: "WARNING: High voltage / Mechanical risk!",
      wrongOrder: "Sequence Error: Use Multimeter to measure the highlighted components first.",
      wrongFix: "Effect: None. Tool mismatch for target component.",
      noSignal: "Awaiting Probe",
      wrenchInstruction: "Rotate MOUSE CLOCKWISE to tighten/calibrate components.",
      wrenchProgress: "Calibration Progress",
      greaseInstruction: "HOLD MOUSE to apply lubricant pulse.",
      greaseProgress: "Lubrication Status",
      repair: "Repair",
      next: "Next Level",
      needAccess: "ACCESS DENIED: Please remove lift cover first.",
      alreadyFixed: "Component is already in nominal state.",
      needInspectFirst: "Protocol violation: Perform scan with Multimeter first.",
      backHome: "Back",
      back: "Back",
      goal: "Repair Progress: {count}/3",
      toolSelect: "Diagnostic Toolkit",
      multimeter: "Multimeter",
      screwdriver: "Screwdriver",
      wrench: "Impact Wrench",
      grease: "Oil Can",
      partInfo: "Component: {part}",
      statusNormal: "Reading: {val} (Nominal)",
      statusError: "Reading: {val} (Abnormal)",
      statusHidden: "Reading: NO DATA (Blocked)",
      refTable: "Fault Reference Table",
      protocol: "Current Protocol",
      constGuide: "Construction Guide",
      maintTools: "Maintenance Tools",
      mainTool: "Main Tool",
      telemetry: "Live Telemetry",
      awaiting: "Awaiting Signal Acquisition",
      probe: "Probe hardware for readings",
      stationStatus: "Station 42 Status",
      operational: "Operational"
    },
    zh: {
      intro: "新机器人已送达。请根据“任务日志”中的上报症状进行排查。",
      missionLog: "任务日志",
      symptomReport: "上报症状：{symptom}",
      inspected: "数据已采集。请对照参考表查找异常值。",
      disassembled: "外壳已拆卸。内部子系统已开放。",
      repaired: "维护工作已完成。系统处于标称状态。",
      success: "维修完成！",
      finish: "已获得运维认证。",
      inspect: "检查",
      disassemble: "拆卸",
      repair: "修复",
      next: "下一关",
      manual: "故障排查知识库",
      currentFault: "诊断日志",
      safetyWarning: "安全风险：检测到高压或机械挤压风险！",
      wrongOrder: "操作顺序错误：请先使用万用表测量高亮部位进行初步诊断。",
      wrongFix: "无效。所选工具与目标组件不匹配或操作不当。",
      needAccess: "无权限：请先拆卸举升组件。",
      alreadyFixed: "组件状态正常。",
      needInspectFirst: "请使用万用表分析组件运行参数。",
      backHome: "返回",
      back: "返回",
      goal: "维修进度: {count}/3",
      toolSelect: "诊断工具组",
      multimeter: "万用表",
      screwdriver: "电批",
      wrench: "冲击扳手",
      grease: "油壶",
      partInfo: "组件: {part}",
      statusNormal: "读数: {val} (正常)",
      statusError: "读数: {val} (异常)",
      statusHidden: "读数: 无数据 (传感器不可达)",
      refTable: "症状参考对照表",
      protocol: "当前规程",
      pInspect: "扫描阶段: 探测可疑模块",
      pDisassemble: "准入阶段: 拆卸顶盖 (使用电批)",
      pRepair: "执行阶段: 修复异常组件",
      pWrench: "执行阶段: 使用扳手矫正组件",
      pScrewdriver: "执行阶段: 使用电批更换组件",
      pMultimeter: "执行阶段: 使用万用表重置/校准",
      pLubricate: "执行阶段: 使用油壶注油保养",
      noSignal: "等待探测",
      wrenchInstruction: "请顺时针转动鼠标以模拟拧螺丝动作进行矫正。",
      wrenchProgress: "校准进度",
      greaseInstruction: "长按鼠标左键以注入润滑脂。",
      greaseProgress: "注油进度",
      constGuide: "构造指南",
      maintTools: "维护工具组",
      mainTool: "指定工具",
      telemetry: "实时遙测",
      awaiting: "等待信号采集",
      probe: "请探测硬件以获取读数",
      stationStatus: "42号维修站状态",
      operational: "运行中"
    }
  }[language]), [language]);

  const onExitClick = () => {
    setHoveredPart(null);
    onExit(isGameFinished);
  };

  const generateRobot = useCallback(() => {
    const types: FaultType[] = Object.keys(FAULTS) as FaultType[];
    const randomFault = types[Math.floor(Math.random() * types.length)];
    const newRobot: RobotState = {
      id: robotCount + 1,
      fault: randomFault,
      isInspected: false,
      isDisassembled: false,
      isRepaired: false,
      hasSafetyRisk: false
    };
    setCurrentRobot(newRobot);
    setDiagnosticData(null);
    setStep('INITIAL');
    setFeedback({ type: 'info', message: language === 'zh' ? '检测到新故障 AGV。请查阅右侧“任务日志”开始诊断。' : 'New fault AGV detected. Check the "Mission Log" on the right sidebar to begin.' });
    soundManager.playTone(400, 'sine', 0.1, 0.1);
  }, [robotCount, language]);

  const hasInited = useRef(false);

  useEffect(() => {
    if (!currentRobot && !isGameFinished && !hasInited.current && completedRobots < 3) {
      generateRobot();
      hasInited.current = true;
    }
  }, [currentRobot, generateRobot, isGameFinished, completedRobots]);

  const onPartClick = (partName: string) => {
    if (!currentRobot || currentRobot.isRepaired) return;

    const partToFault: Record<string, FaultType> = {
      'light_strip': 'light_strip',
      'bumper': 'bumper',
      'camera': 'camera',
      'drive_wheel_jam': 'drive_wheel_jam',
      'debris_wheel': 'debris_wheel',
      'caster_front': 'debris_wheel',
      'caster_back': 'debris_wheel',
      'charging_port': 'charging_port',
      'battery': 'battery',
      'lift': 'lubrication'
    };

    const targetFault = partToFault[partName];

    // 1. DISASSEMBLY LOGIC - Must come before generic inspection check to avoid deadlock
    if (currentTool === 'SCREWDRIVER' && !currentRobot.isDisassembled) {
      if (partName === 'lift') {
        const canDisassemble = currentRobot.isInspected || diagnosticData || 
                               (currentRobot.fault === 'battery' && !currentRobot.isInspected); 
        
        if (canDisassemble) {
          setCurrentRobot(prev => prev ? { ...prev, isDisassembled: true } : null);
          setFeedback({ type: 'success', message: t.disassembled });
          soundManager.playTone(300, 'square', 0.2, 0.1);
          if (currentRobot.fault === 'battery' && !currentRobot.isInspected) {
            setFeedback({ type: 'info', message: language === 'zh' ? '异常监测：检测到电压不稳，已紧急拆除盖板进行内部排查。' : 'Auto-Alert: Voltage instability detected. Cover removed for internal inspection.' });
          }
        } else {
          setFeedback({ type: 'info', message: t.wrongOrder });
          soundManager.playError();
        }
        return;
      }
    }

    // 2. INSPECTION LOGIC
    if (currentTool === 'MULTIMETER' && !currentRobot.isInspected) {
      const internalProbeTargets = ['battery']; 
      const isHidden = internalProbeTargets.includes(partName);
      
      if (isHidden && !currentRobot.isDisassembled) {
         setFeedback({ type: 'danger', message: language === 'zh' ? '组件不可见：请先拆卸举升板以触及电池组。' : 'Component Unreachable: Remove lift plate to reach battery pack.' });
         soundManager.playError();
         return;
      }

      // Detection logic: Target fault itself OR logically related symptoms
      const isCorrectDetection = 
        targetFault === currentRobot.fault || 
        (currentRobot.fault === 'battery' && (partName === 'charging_port' || partName === 'light_strip')) ||
        (currentRobot.fault === 'light_strip' && partName === 'light_strip');

      if (isCorrectDetection) {
         setCurrentRobot(prev => prev ? { ...prev, isInspected: true } : null);
         const val = FAULTS[currentRobot.fault][language].reading;
         setDiagnosticData(val);
         setFeedback({ type: 'success', message: t.statusError.replace('{val}', val) });
         soundManager.playSuccess();
      } else {
         const val = targetFault ? (FAULTS[targetFault as FaultType]?.[language].normal || 'Nominal') : 'Nominal';
         setFeedback({ type: 'info', message: t.statusNormal.replace('{val}', val) });
         soundManager.playTone(800, 'sine', 0.05, 0.05);
      }
      return;
    }

    // 3. GENERIC PREREQUISITE CHECK
    if (['WRENCH', 'GREASE', 'SCREWDRIVER'].includes(currentTool) && !currentRobot.isInspected) {
      if (currentTool === 'WRENCH' && ['bumper', 'drive_wheel_jam', 'debris_wheel'].includes(targetFault || '')) {
        if (targetFault === currentRobot.fault) {
           setFeedback({ type: 'info', message: language === 'zh' ? "机械观察：组件出现异常阻力。" : "Mechanical observation: Abnormal resistance detected." });
        } else {
           setFeedback({ type: 'info', message: language === 'zh' ? "机械观察：组件连接稳固。" : "Mechanical observation: Component secure." });
        }
      } else {
        setFeedback({ type: 'info', message: t.needInspectFirst });
      }
      soundManager.playError();
      return;
    }

    // 4. REPAIR LOGIC
    if (currentRobot.isInspected && !currentRobot.isRepaired) {
      const repairNeedsOpening: FaultType[] = ['battery', 'camera'];
      if (repairNeedsOpening.includes(currentRobot.fault) && !currentRobot.isDisassembled) {
        setFeedback({ type: 'danger', message: t.needAccess });
        soundManager.playError();
        return;
      }

      const f = currentRobot.fault;
      
      if (currentTool === 'WRENCH') {
        const isMatch = (f === 'drive_wheel_jam' || f === 'debris_wheel' || f === 'bumper' || f === 'charging_port') && 
                        (partName === f || 
                         (f.includes('wheel') && (partName.includes('wheel') || partName.includes('caster'))) || 
                         (f === 'drive_wheel_jam' && partName.includes('drive')));
        if (isMatch) {
          setWrenchMode({ active: true, progress: 0, lastAngle: 0 });
          setFeedback({ type: 'info', message: t.wrenchInstruction });
          return;
        }
      } else if (currentTool === 'GREASE') {
        if (f === 'lubrication' && partName === 'lift') {
          setGreaseMode({ active: true, progress: 0 });
          setFeedback({ type: 'info', message: t.greaseInstruction });
          return;
        }
      } else if (currentTool === 'SCREWDRIVER') {
        // Electronic Replacement - Screwdriver is the primary Physical Swap tool
        const success = (f === 'charging_port' || f === 'battery' || f === 'camera') && (partName === f || partName === 'wiring');
        if (success) {
          completeRepair();
          return;
        }
      } else if (currentTool === 'MULTIMETER') {
        // Calibration Fix - Multimeter only fixes sensors, not heavy battery/electrodes
        const success = (f === 'light_strip' || f === 'camera') && (partName === f);
        if (success) {
          completeRepair();
          return;
        }
      }

      setFeedback({ type: 'info', message: t.wrongFix });
      soundManager.playError();
    }
  };

  const lastCompletedId = useRef<number>(-1);

  const completeRepair = useCallback(() => {
    setCurrentRobot(prev => {
      if (!prev || prev.isRepaired) return prev;
      return { ...prev, isRepaired: true };
    });
    
    setFeedback({ type: 'success', message: t.repaired });
    soundManager.playSuccess();
    setWrenchMode({ active: false, progress: 0, lastAngle: 0 });
    setGreaseMode({ active: false, progress: 0 });
  }, [t]);

  // Handle mission progression when a robot is repaired
  useEffect(() => {
    if (currentRobot?.isRepaired && !isGameFinished && lastCompletedId.current !== currentRobot.id) {
      lastCompletedId.current = currentRobot.id;
      setHoveredPart(null); // Clear hover when repaired to avoid "ghost" text for next robot
      
      setCompletedRobots(c => {
        const next = c + 1;
        if (next >= 3) {
           // Final robot - wait longer to show success before fade to black
           setTimeout(() => setIsGameFinished(true), 2500);
        } else {
           // Not finished - queue next AGV
           setTimeout(() => {
             setCurrentRobot(null);
             setHoveredPart(null);
             setDiagnosticData(null);
             hasInited.current = false;
             setRobotCount(r => r + 1);
           }, 1500);
        }
        return next;
      });
    }
  }, [currentRobot?.isRepaired, currentRobot?.id, isGameFinished, t]);

  useEffect(() => {
    if (!wrenchMode.active) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      
      if (wrenchMode.lastAngle !== 0) {
        let delta = angle - wrenchMode.lastAngle;
        // Normalize delta
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        
        // Clockwise in screen coordinates: y flows down, so we check if delta is positive
        if (delta > 0.05) {
          setWrenchMode(prev => {
            const nextProgress = prev.progress + 2;
            if (nextProgress >= 100) {
              completeRepair();
              return { ...prev, progress: 100, lastAngle: angle };
            }
            return { ...prev, progress: nextProgress, lastAngle: angle };
          });
          soundManager.playTone(400 + wrenchMode.progress * 4, 'sawtooth', 0.02, 0.03);
        }
      } else {
        setWrenchMode(prev => ({ ...prev, lastAngle: angle }));
      }
    };

    const handleMouseUp = () => {
      // Keep mode active until progress reaches 100
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [wrenchMode, completeRepair]);

  useEffect(() => {
    if (!greaseMode.active) return;

    let interval: any;
    const handleMouseDown = () => {
       interval = setInterval(() => {
          setGreaseMode(prev => {
            if (prev.progress >= 100) {
              completeRepair();
              clearInterval(interval);
              return { ...prev, progress: 100 };
            }
            soundManager.playTone(200 + prev.progress * 2, 'square', 0.05, 0.05);
            return { ...prev, progress: prev.progress + 5 };
          });
       }, 100);
    };

    const handleMouseUp = () => {
       if (interval) clearInterval(interval);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (interval) clearInterval(interval);
    };
  }, [greaseMode.active, completeRepair]);

  const tools = [
    { id: 'MULTIMETER', name: t.multimeter, icon: <Activity size={24} />, color: 'bg-blue-500' },
    { id: 'SCREWDRIVER', name: t.screwdriver, icon: <RotateCcw size={24} />, color: 'bg-purple-500' },
    { id: 'WRENCH', name: t.wrench, icon: <Wrench size={24} />, color: 'bg-orange-500' },
    { id: 'GREASE', name: t.grease, icon: <Zap size={24} />, color: 'bg-yellow-500' },
  ];

  if (isGameFinished) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center font-sans">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-12 bg-zinc-900 rounded-[3rem] border border-white/10">
          <CheckCircle2 size={80} className="text-green-500 mx-auto mb-8" />
          <h1 className="text-4xl font-black mb-4 uppercase">{t.success}</h1>
          <p className="text-white/40 mb-12">{t.finish}</p>
          <button onClick={() => onExit(true)} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest">{t.backHome}</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      {/* Full-Screen Canvas Backdrop */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [3, 2, 5], fov: 40 }} gl={{ alpha: false, antialias: true, toneMappingExposure: 1.2 }}>
          <color attach="background" args={['#ffffff']} />
          <ambientLight intensity={1.2} />
          <pointLight position={[5, 10, 5]} intensity={3} color="#ffffff" />
          <pointLight position={[-5, 5, -5]} intensity={2} color="#ffffff" />
          <spotLight position={[0, 10, 10]} angle={0.4} penumbra={1} intensity={4} castShadow />
          <Suspense fallback={null}>
            <RobotModel 
              key={currentRobot?.id || 'idle'}
              isDisassembled={currentRobot?.isDisassembled || false}
              fault={currentRobot?.fault || 'battery'}
              isRepaired={currentRobot?.isRepaired || false}
              onPartClick={onPartClick}
              onPartHover={setHoveredPart}
              currentTool={currentTool}
              isInspected={currentRobot?.isInspected || false}
            />
          </Suspense>
          <OrbitControls makeDefault enablePan={false} maxDistance={10} minDistance={2} target={[0, 0.3, 0]} />
          <ContactShadows opacity={0.3} scale={10} blur={3} far={2} color="#0055ff" />
        </Canvas>
      </div>

      {/* Left Sidebar - Job Info (Overlay) */}
      <div className="absolute top-0 left-0 w-80 h-full border-r border-blue-100 bg-white/95 backdrop-blur-md z-10 flex flex-col p-8 pt-12 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Target size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase tracking-widest text-slate-900">HOTMEER</h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.3em]">Diagnostics Room</p>
          </div>
        </div>

        <div className="space-y-8 flex-grow">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-4 font-bold">Shift Progress</div>
            <div className="flex items-center gap-4">
               <div className="text-3xl font-black font-mono text-slate-900">{completedRobots}/3</div>
               <div className="flex-grow h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${(completedRobots / 3) * 100}%` }} className="h-full bg-blue-600 shadow-sm" />
               </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-4 font-bold">Mission Target</div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
               {t.goal.replace('{count}', completedRobots.toString())}
            </p>
          </div>
        </div>

        <button onClick={() => onExit(false)} className="mt-auto flex items-center gap-3 text-xs font-bold text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest">
           <RotateCcw size={14} /> {t.backHome}
        </button>
      </div>

      {/* Main Viewport UI (Overlays) */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Grease Interaction Overlay */}
        <AnimatePresence>
          {greaseMode.active && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-blue-600/10 backdrop-blur-[2px] pointer-events-auto"
            >
               <div className="text-center p-12 bg-white rounded-[3rem] border-4 border-blue-600 shadow-2xl max-w-sm">
                  <div className="relative w-48 h-48 mx-auto mb-8">
                     <motion.div 
                       animate={{ 
                         scale: [1, 1.1, 1],
                         y: [0, -10, 0]
                       }}
                       transition={{ repeat: Infinity, duration: 0.5 }}
                       className="w-full h-full flex items-center justify-center text-blue-600"
                     >
                        <Zap size={120} strokeWidth={3} />
                     </motion.div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic">{t.greaseProgress}</h3>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-6">
                     <motion.div 
                       animate={{ width: `${greaseMode.progress}%` }} 
                       className="h-full bg-blue-600"
                     />
                  </div>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                    {t.greaseInstruction}
                  </p>
                  <button 
                    onClick={() => setGreaseMode({ active: false, progress: 0 })}
                    className="mt-8 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-200"
                  >
                    Cancel / 取消
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wrench Interaction Overlay */}
        <AnimatePresence>
          {wrenchMode.active && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-blue-600/10 backdrop-blur-[2px] pointer-events-auto"
            >
               <div className="text-center p-12 bg-white rounded-[3rem] border-4 border-blue-600 shadow-2xl max-w-sm">
                  <div className="relative w-48 h-48 mx-auto mb-8">
                     <motion.div 
                       animate={{ rotate: wrenchMode.progress * 3.6 }}
                       className="w-full h-full flex items-center justify-center text-blue-600"
                     >
                        <RotateCcw size={120} strokeWidth={3} />
                     </motion.div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Wrench size={48} className="text-blue-600" />
                     </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic">{t.wrenchProgress}</h3>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-6">
                     <motion.div 
                       animate={{ width: `${wrenchMode.progress}%` }} 
                       className="h-full bg-blue-600"
                     />
                  </div>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                    {t.wrenchInstruction}
                  </p>
                  <button 
                    onClick={() => setWrenchMode({ active: false, progress: 0, lastAngle: 0 })}
                    className="mt-8 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-200"
                  >
                    Cancel / 取消
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Feedback HUD */}
        <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none">
          <AnimatePresence mode="wait">
             {feedback.type !== 'none' && (
               <motion.div 
                 key={feedback.message}
                 initial={{ opacity: 0, y: -20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 className={`px-8 py-4 rounded-3xl border backdrop-blur-xl flex items-center gap-4 shadow-2xl ${
                   feedback.type === 'danger' ? 'bg-red-500 text-white border-red-400 shadow-red-500/20' :
                   feedback.type === 'success' ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/20' :
                   'bg-white text-slate-800 border-slate-200 shadow-slate-200/20'
                 }`}
               >
                 {feedback.type === 'danger' && <ShieldAlert size={18} />}
                 {feedback.type === 'success' && <CheckCircle2 size={18} />}
                 <span className="font-sans text-xs uppercase tracking-widest font-black">{feedback.message}</span>
               </motion.div>
             )}
          </AnimatePresence>
        </div>

        {/* Control Hints */}
        <div className="absolute bottom-12 right-80 pointer-events-none pr-8">
           <motion.div 
             initial={{ x: 50, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="flex flex-col gap-4 px-6 py-4 bg-white/90 backdrop-blur-md border border-blue-100 rounded-[2rem] shadow-2xl shadow-blue-600/10"
           >
             <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                   <div className="flex gap-1 mb-1 items-center">
                     <div className="w-5 h-7 border-2 border-slate-300 rounded-sm" />
                     <div className="w-2.5 h-3.5 bg-blue-600 rounded-full" />
                     <div className="w-5 h-7 border-2 border-slate-300 rounded-sm" />
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Drag to Orbit</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">拖动旋转视图</p>
                </div>
             </div>
             
             <div className="h-px bg-slate-100" />
             
             <div className="flex items-center gap-4">
                <div className="flex gap-1 items-center text-slate-400">
                   <span className="text-[10px] font-black border-2 border-slate-200 rounded px-1 min-w-[30px] text-center">SHIFT</span>
                   <span>+</span>
                   <div className="w-5 h-7 border-2 border-slate-300 rounded-sm" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Shift + Drag to Pan</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Shift+拖动平移视图</p>
                </div>
             </div>
           </motion.div>
        </div>

        {/* Tool Selector - Bottom Floating */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-2xl border border-blue-100 p-2 rounded-[2.5rem] flex gap-2 pointer-events-auto shadow-2xl shadow-blue-500/10">
             {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setCurrentTool(tool.id as ToolType);
                    soundManager.playTone(600, 'sine', 0.05, 0.1);
                  }}
                  className={`p-5 rounded-3xl flex flex-col items-center gap-2 transition-all group min-w-[100px] ${
                    currentTool === tool.id ? `bg-blue-600 text-white shadow-lg shadow-blue-600/30` : 'bg-transparent text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                   {tool.icon}
                   <span className={`text-[9px] font-black uppercase tracking-wider ${currentTool === tool.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                     {tool.name}
                   </span>
                </button>
             ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Maintenance Tablet (Overlay) */}
      <div className="absolute top-0 right-0 w-80 h-full border-l border-blue-100 bg-white/80 backdrop-blur-md z-10 flex flex-col shadow-xl shadow-blue-500/5">
        {/* Component HUD (Construction Guidance) */}
        <div className="p-8 border-b border-blue-50 bg-blue-50/30">
           <div className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] mb-4">{t.constGuide}</div>
           <AnimatePresence mode="wait">
              {hoveredPart ? (
                <motion.div 
                   key={hoveredPart}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0 }}
                   className="space-y-4"
                >
                   <div>
                      <h2 className="text-sm font-black uppercase text-slate-900 leading-tight">
                         {PART_INFO[hoveredPart]?.[language] || (language === 'zh' ? '未知组件' : hoveredPart.replace(/_/g, ' '))}
                      </h2>
                   </div>

                   <div className="space-y-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 mb-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase">
                         <Settings size={12} /> {t.maintTools}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                         <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 underline">{t.mainTool}</p>
                            <p className="text-[10px] text-blue-700 font-black">
                               {language === 'zh' ? PART_INFO[hoveredPart]?.toolZh : PART_INFO[hoveredPart]?.toolEn}
                            </p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="space-y-2 border-l-2 border-blue-100 pl-4 py-1">
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                         {language === 'zh' ? PART_INFO[hoveredPart]?.zhDesc : PART_INFO[hoveredPart]?.enDesc}
                      </p>
                   </div>
                </motion.div>
              ) : (
                <div className="text-[10px] text-slate-300 italic">
                   {language === 'zh' ? '悬停在部件上以扫描结构...' : 'Hover over components to scan structure...'}
                </div>
              )}
           </AnimatePresence>
        </div>

        <div className="flex-grow p-8 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{t.manual}</div>
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          </div>

          <div className="space-y-8 flex-grow">
            {currentRobot ? (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <div className="text-[10px] text-blue-600 uppercase tracking-widest mb-3 font-black italic">{t.missionLog}</div>
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl mb-4">
                       <span className="text-[11px] text-slate-600 leading-relaxed font-bold block">
                          {t.symptomReport.replace('{symptom}', FAULTS[currentRobot.fault][language].description)}
                       </span>
                    </div>
                  </div>

                  {currentRobot.isInspected && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div>
                        <div className="text-[10px] text-blue-600 uppercase tracking-widest mb-3 font-black italic">{t.protocol}</div>
                        <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                           <span className="text-[10px] font-black uppercase tracking-wider">
                              {currentRobot.isDisassembled ? (
                                currentRobot.fault === 'lubrication' ? t.pLubricate : (
                                  ['battery', 'camera', 'charging_port'].includes(currentRobot.fault) ? t.pScrewdriver : t.pRepair
                                )
                              ) : (
                                 ['battery', 'camera'].includes(currentRobot.fault) ? t.pDisassemble : (
                                   currentRobot.fault === 'lubrication' ? t.pLubricate : (
                                     ['drive_wheel_jam', 'debris_wheel', 'bumper'].includes(currentRobot.fault) ? t.pWrench : (
                                       ['light_strip'].includes(currentRobot.fault) ? t.pMultimeter : t.pRepair
                                     )
                                   )
                                 )
                              )}
                           </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-blue-600 uppercase tracking-widest mb-3 font-black italic">{t.telemetry}</div>
                        <div className="p-4 bg-white border border-blue-200 rounded-2xl shadow-sm">
                           <span className="text-xs font-mono font-black text-blue-600 animate-pulse uppercase flex items-center gap-2">
                              <Activity size={14} />
                              {diagnosticData ? `Measured: ${diagnosticData}` : t.noSignal}
                           </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="pt-6 border-t border-slate-100 font-sans">
                     <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-4 font-black">{t.refTable}</div>
                     <div className="space-y-3">
                        {Object.keys(FAULTS).map((key) => {
                           const f = FAULTS[key as FaultType][language];
                           const isActive = currentRobot && key === currentRobot.fault;
                           return (
                             <div key={key} className={`p-4 rounded-2xl border transition-all ${isActive && currentRobot.isInspected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-transparent border-slate-100 opacity-40'}`}>
                                <div className="flex justify-between items-center mb-1">
                                   <span className="text-[10px] font-black uppercase text-slate-900">{f.name}</span>
                                   <span className="text-[9px] font-mono font-bold text-blue-600">Ref: {f.normal}</span>
                                </div>
                                <p className="text-[9px] leading-tight text-slate-400 font-medium">{f.description}</p>
                             </div>
                           );
                        })}
                     </div>
                  </div>
               </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-30 font-sans">
                 <Activity size={40} className="mb-4 text-blue-600" />
                 <p className="text-[10px] uppercase tracking-widest font-black leading-relaxed text-slate-900">
                    {t.awaiting}<br/>{t.probe}
                 </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto p-8 bg-blue-50/20 border-t border-blue-50 font-sans">
           <div className="text-[9px] text-blue-600/50 uppercase tracking-widest mb-2 font-bold italic">{t.stationStatus}</div>
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase italic flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                {t.operational}
              </span>
              <div className="flex gap-1">
                 {[1,1,1].map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-600/20" />)}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
