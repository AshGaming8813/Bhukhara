export type AdminRole = 'SUPER_ADMIN' | 'COIN_MANAGER';
export type PlayerStatus = 'active' | 'inactive';
export type AdjustmentAction = 'ADD' | 'REMOVE';

export interface DbPlayer {
  id: string;
  username: string;
  avatar: string;
  coinBalance: number;
  status: PlayerStatus;
  createdAt: string;
  lastActive: string;
}

export interface DbCoinAdjustment {
  id: string;
  playerId: string;
  playerUsername: string;
  adminId: string;
  adminUsername: string;
  action: AdjustmentAction;
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  createdAt: string;
}

export interface DbAdmin {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: AdminRole;
  createdAt: string;
}

export interface AdminSession {
  token: string;
  adminId: string;
  email: string;
  username: string;
  role: AdminRole;
  expiresAt: number;
}

export interface AdminDashboardMetrics {
  totalPlayers: number;
  activePlayers: number;
  totalCoinsHeld: number;
  totalCoinsAdded: number;
  totalCoinsRemoved: number;
  recentAdjustments: DbCoinAdjustment[];
}
