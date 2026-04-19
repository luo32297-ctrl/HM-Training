import { Vector3 } from 'three';

export type RobotStatus = 'picking' | 'delivering' | 'failed' | 'critical' | 'returning' | 'setup';

export interface RobotData {
  id: number;
  status: RobotStatus;
  shelfIndex: number;
  wsIndex: number;
  key: number;
}

export type Language = 'en' | 'zh';
