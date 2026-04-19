import { useMemo } from 'react';
import { Plane, Box, Text } from '@react-three/drei';

interface WarehouseProps {
  language: 'en' | 'zh';
  showFacilities?: boolean;
  hideQRs?: boolean;
}

export function Warehouse({ language, showFacilities = true, hideQRs = false }: WarehouseProps) {
  const qrCodes = useMemo(() => {
    if (hideQRs) return [];
    const codes = [];
    for (let x = -12; x <= 12; x += 3) {
      for (let z = -12; z <= 12; z += 3) {
        codes.push([x, z]);
      }
    }
    return codes;
  }, [hideQRs]);

  const t = {
    en: { ws: "WORKSTATION", maint: "MAINTENANCE AREA" },
    zh: { ws: "工作站", maint: "维保区域" }
  }[language];

  return (
    <group>
      {/* Floor - Solid Blue */}
      <Plane name="ground" args={[32, 32]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#0033aa" roughness={0.8} />
      </Plane>

      {/* Grid Lines */}
      <gridHelper args={[32, 32, 0x000000, 0x55aaff]} position={[0, 0.01, 0]} />

      {/* QR Codes - White with black pattern, raised slightly to avoid z-fighting */}
      {qrCodes.map(([x, z], i) => (
        <group key={i} position={[x, 0.03, z]}>
          <Plane args={[0.5, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="white" />
          </Plane>
          {/* Simple pattern to look like QR */}
          <Box args={[0.1, 0.01, 0.1]} position={[0.1, 0.01, 0.1]}>
            <meshBasicMaterial color="black" />
          </Box>
          <Box args={[0.1, 0.01, 0.1]} position={[-0.1, 0.01, -0.1]}>
            <meshBasicMaterial color="black" />
          </Box>
          <Box args={[0.1, 0.01, 0.1]} position={[0.1, 0.01, -0.1]}>
            <meshBasicMaterial color="black" />
          </Box>
        </group>
      ))}

      {/* Workstations */}
      {showFacilities && (
        <>
          <Workstation position={[14, 0, 0]} label={`${t.ws} A`} color="#44ff44" />
          <Workstation position={[-14, 0, 0]} label={`${t.ws} B`} color="#44ff44" />
        </>
      )}

      {/* Maintenance Area */}
      {showFacilities && (
        <group position={[0, 0.02, 13]}>
          <Plane args={[4, 4]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.5} />
          </Plane>
          {/* Glow effect */}
          <Plane args={[4.2, 4.2]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.2} />
          </Plane>
          <Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.3} color="white" fontWeight="bold">
            {t.maint}
          </Text>
        </group>
      )}

      {/* Shelves - 6 total */}
      {showFacilities && [-4, 0, 4].map((x) => (
        <group key={x}>
          <Shelf position={[x, 0, -6]} />
          <Shelf position={[x, 0, 6]} />
        </group>
      ))}

      {/* Walls - White */}
      <Box args={[32, 4, 0.5]} position={[0, 2, -16]}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      <Box args={[32, 4, 0.5]} position={[0, 2, 16]}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      <Box args={[0.5, 4, 32]} position={[-16, 2, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>
      <Box args={[0.5, 4, 32]} position={[16, 2, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </Box>

      {/* Hotmeer Logos on Walls - Prominent Blue */}
      <Text
        position={[0, 3, -15.7]}
        fontSize={2.2}
        color="#0066ff"
        fontWeight="bold"
      >
        HOTMEER
      </Text>
      <Text
        position={[0, 1.5, -15.7]}
        fontSize={0.8}
        color="#ff3300"
        fontWeight="bold"
      >
        SAFETY FIRST
      </Text>

      <Text
        position={[0, 3, 15.7]}
        rotation={[0, Math.PI, 0]}
        fontSize={2.2}
        color="#0066ff"
        fontWeight="bold"
      >
        HOTMEER
      </Text>
      <Text
        position={[0, 1.5, 15.7]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.8}
        color="#ff3300"
        fontWeight="bold"
      >
        SAFETY FIRST
      </Text>

      <Text
        position={[-15.7, 3, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={2.2}
        color="#0066ff"
        fontWeight="bold"
      >
        HOTMEER
      </Text>
      <Text
        position={[15.7, 3, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={2.2}
        color="#0066ff"
        fontWeight="bold"
      >
        HOTMEER
      </Text>

      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.4} />
    </group>
  );
}

function Workstation({ position, label, color }: { position: [number, number, number], label: string, color: string }) {
  return (
    <group position={position}>
      {/* Base Structure - Bright Industrial Grey */}
      <Box args={[3.2, 0.2, 4.2]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#eeeeee" metalness={0.4} roughness={0.2} />
      </Box>
      <Box args={[2.8, 1.1, 3.2]} position={[0, 0.65, 0]}>
        <meshStandardMaterial color="#dddddd" metalness={0.3} roughness={0.3} />
      </Box>
      
      {/* Top Surface / Conveyor Belt Area - Bright Blue */}
      <Box args={[2.4, 0.1, 3.8]} position={[0, 1.2, 0]}>
        <meshStandardMaterial color="#00aaff" roughness={0.5} />
      </Box>
      
      {/* Side Panels - Bright Blue */}
      <Box args={[0.1, 1, 3.5]} position={[1.45, 0.6, 0]}>
        <meshStandardMaterial color="#0088ff" />
      </Box>
      <Box args={[0.1, 1, 3.5]} position={[-1.45, 0.6, 0]}>
        <meshStandardMaterial color="#0088ff" />
      </Box>

      {/* Label Display */}
      <group position={[0, 1.8, -1.5]}>
        <Box args={[1.5, 0.6, 0.1]}>
          <meshStandardMaterial color="#222222" />
        </Box>
        <Text position={[0, 0, 0.06]} fontSize={0.25} color={color} fontWeight="bold">
          {label}
        </Text>
      </group>

      {/* Status Light Pole */}
      <Box args={[0.05, 1.5, 0.05]} position={[1.2, 1.8, 1.5]}>
        <meshStandardMaterial color="#888" />
      </Box>
      <Box args={[0.2, 0.2, 0.2]} position={[1.2, 2.6, 1.5]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </Box>
    </group>
  );
}

function Shelf({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Vertical Supports */}
      <Box args={[0.1, 3, 0.1]} position={[0.9, 1.5, 0.9]}><meshStandardMaterial color="#444" /></Box>
      <Box args={[0.1, 3, 0.1]} position={[-0.9, 1.5, 0.9]}><meshStandardMaterial color="#444" /></Box>
      <Box args={[0.1, 3, 0.1]} position={[0.9, 1.5, -0.9]}><meshStandardMaterial color="#444" /></Box>
      <Box args={[0.1, 3, 0.1]} position={[-0.9, 1.5, -0.9]}><meshStandardMaterial color="#444" /></Box>
      
      {/* Horizontal Shelves */}
      {[0.5, 1.5, 2.5].map((y) => (
        <Box key={y} args={[2, 0.1, 2]} position={[0, y, 0]}>
          <meshStandardMaterial color="#555" />
        </Box>
      ))}

      {/* Cargo on shelf */}
      <Box args={[0.6, 0.6, 0.6]} position={[0.3, 0.85, 0.3]}><meshStandardMaterial color="orange" /></Box>
      <Box args={[0.5, 0.5, 0.5]} position={[-0.4, 1.8, -0.2]}><meshStandardMaterial color="brown" /></Box>
    </group>
  );
}
