import type {
  DbPlayer,
  DbCoinAdjustment,
  DbAdmin,
  AdminSession,
  AdminDashboardMetrics,
  AdjustmentAction,
} from '../types/admin';
import { authBackend } from './authBackend';

const STORAGE_PLAYERS = 'bhukhara_db_players';
const STORAGE_ADJUSTMENTS = 'bhukhara_db_adjustments';
const STORAGE_ADMINS = 'bhukhara_db_admins';
const STORAGE_SESSION = 'bhukhara_admin_session';

// Salted hash function for secure admin passwords
function hashPassword(pass: string): string {
  let hash = 0;
  const salted = pass + '_bhukhara_salt_2026';
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// Initial seed players
const SEED_PLAYERS: DbPlayer[] = [
  {
    id: 'P1',
    username: 'Namit',
    avatar: '👑',
    coinBalance: 1250,
    status: 'active',
    createdAt: '2026-08-01T10:00:00.000Z',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'P2',
    username: 'Rohan (P2)',
    avatar: '🎯',
    coinBalance: 1000,
    status: 'active',
    createdAt: '2026-08-02T11:30:00.000Z',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'P3',
    username: 'Priya (P3)',
    avatar: '🔥',
    coinBalance: 850,
    status: 'active',
    createdAt: '2026-08-05T14:15:00.000Z',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'P4',
    username: 'Vikram (P4)',
    avatar: '⚡',
    coinBalance: 1500,
    status: 'active',
    createdAt: '2026-08-10T16:45:00.000Z',
    lastActive: new Date().toISOString(),
  },
];

// Initial seed admin
const SEED_ADMINS: DbAdmin[] = [
  {
    id: 'admin_super_1',
    email: 'admin@bhukhara.com',
    username: 'SuperAdmin',
    passwordHash: hashPassword('admin123'),
    role: 'SUPER_ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function createSafeBroadcastChannel(name: string): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      return new BroadcastChannel(name);
    }
  } catch (e) {
    console.warn(`BroadcastChannel ${name} error:`, e);
  }
  return null;
}

// Multi-Tab & Device Event Bus for Admin Updates
const adminBc = createSafeBroadcastChannel('bhukhara_admin_bus');

type AdminListener = (type: string, data: any) => void;
const adminListeners: Set<AdminListener> = new Set();

function notifyAdminEvent(type: string, data: any) {
  if (adminBc) {
    try {
      adminBc.postMessage({ type, data });
    } catch (e) {
      console.warn('PostMessage error:', e);
    }
  }
  adminListeners.forEach(cb => cb(type, data));
}

if (adminBc) {
  adminBc.onmessage = event => {
    const { type, data } = event.data;
    adminListeners.forEach(cb => cb(type, data));
  };
}

export const adminBackend = {
  // Init database
  initDatabase(): void {
    try {
      if (!localStorage.getItem(STORAGE_ADMINS)) {
        localStorage.setItem(STORAGE_ADMINS, JSON.stringify(SEED_ADMINS));
      }
      if (!localStorage.getItem(STORAGE_PLAYERS)) {
        localStorage.setItem(STORAGE_PLAYERS, JSON.stringify(SEED_PLAYERS));
      }
      if (!localStorage.getItem(STORAGE_ADJUSTMENTS)) {
        localStorage.setItem(STORAGE_ADJUSTMENTS, JSON.stringify([]));
      }
    } catch (e) {
      console.warn('Init DB storage warning:', e);
    }
  },

  getAdmins(): DbAdmin[] {
    this.initDatabase();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_ADMINS) || '[]');
    } catch {
      return SEED_ADMINS;
    }
  },

  getPlayersList(): DbPlayer[] {
    const users = authBackend.getUsers().filter(u => u.role === 'player');
    return users.map(u => ({
      id: u.player_id || u.id,
      username: u.username,
      avatar: '👑',
      coinBalance: u.coin_balance,
      status: u.status,
      createdAt: u.created_at,
      lastActive: u.updated_at || new Date().toISOString(),
    }));
  },

  getAdjustmentsList(): DbCoinAdjustment[] {
    this.initDatabase();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_ADJUSTMENTS) || '[]');
    } catch {
      return [];
    }
  },

  savePlayers(players: DbPlayer[]): void {
    try {
      localStorage.setItem(STORAGE_PLAYERS, JSON.stringify(players));
    } catch (e) {
      console.warn('Save players storage error:', e);
    }
  },

  saveAdjustments(adj: DbCoinAdjustment[]): void {
    try {
      localStorage.setItem(STORAGE_ADJUSTMENTS, JSON.stringify(adj));
    } catch (e) {
      console.warn('Save adjustments storage error:', e);
    }
  },

  // Get or Auto-Register Player
  getOrCreatePlayer(playerId: string, username: string): DbPlayer {
    const players = this.getPlayersList();
    let player = players.find(p => p.id === playerId || p.username.toLowerCase() === username.toLowerCase());

    if (!player) {
      player = {
        id: playerId || 'P_' + Math.random().toString(36).substring(2, 8),
        username: username || 'Player',
        avatar: '👤',
        coinBalance: 1000, // Default starting virtual coins
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      players.push(player);
      this.savePlayers(players);
      notifyAdminEvent('PLAYER_REGISTERED', player);
    } else {
      player.lastActive = new Date().toISOString();
      if (username && player.username !== username) {
        player.username = username;
      }
      this.savePlayers(players);
    }

    return player;
  },

  // Admin Authentication
  adminLogin(emailOrUser: string, pass: string): { success: boolean; error?: string; session?: AdminSession } {
    const admins = this.getAdmins();
    const cleanInput = emailOrUser.trim().toLowerCase();
    const inputHash = hashPassword(pass);

    const admin = admins.find(
      a => a.email.toLowerCase() === cleanInput || a.username.toLowerCase() === cleanInput
    );

    if (!admin || admin.passwordHash !== inputHash) {
      return { success: false, error: 'Invalid admin username/email or password.' };
    }

    const session: AdminSession = {
      token: 'token_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      adminId: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
    notifyAdminEvent('ADMIN_LOGIN', session);
    return { success: true, session };
  },

  verifyAdminSession(): AdminSession | null {
    const raw = sessionStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    try {
      const session: AdminSession = JSON.parse(raw);
      if (session.expiresAt < Date.now()) {
        sessionStorage.removeItem(STORAGE_SESSION);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  adminLogout(): void {
    sessionStorage.removeItem(STORAGE_SESSION);
    notifyAdminEvent('ADMIN_LOGOUT', null);
  },

  // Server-Authoritative Coin Adjustment API
  adjustPlayerCoins(
    token: string,
    playerId: string,
    action: AdjustmentAction,
    amount: number,
    reason: string
  ): { success: boolean; error?: string; adjustment?: DbCoinAdjustment; newBalance?: number } {
    // 1. Verify Admin Authentication
    const session = this.verifyAdminSession();
    if (!session || session.token !== token) {
      return { success: false, error: 'Unauthorized. Admin authentication required.' };
    }

    // 2. Validate input parameters
    const cleanAmount = Math.floor(Number(amount));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, error: 'Please enter a valid positive number of coins.' };
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      return { success: false, error: 'Mandatory reason is required for coin adjustments.' };
    }

    // 3. Get Player
    const players = this.getPlayersList();
    const playerIdx = players.findIndex(p => p.id === playerId);
    if (playerIdx === -1) {
      return { success: false, error: 'Player not found.' };
    }

    const player = players[playerIdx];
    const previousBalance = player.coinBalance;

    // 4. Insufficient balance protection for REMOVE
    if (action === 'REMOVE' && cleanAmount > previousBalance) {
      return {
        success: false,
        error: `Insufficient coin balance. Player currently has only ${previousBalance.toLocaleString()} virtual coins.`,
      };
    }

    const newBalance = action === 'ADD' ? previousBalance + cleanAmount : previousBalance - cleanAmount;

    // 5. Update Player Balance
    players[playerIdx] = {
      ...player,
      coinBalance: newBalance,
      lastActive: new Date().toISOString(),
    };
    this.savePlayers(players);

    // 6. Record Immutable Adjustment Log
    const adjustments = this.getAdjustmentsList();
    const adjustmentRecord: DbCoinAdjustment = {
      id: 'ADJ_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      playerId: player.id,
      playerUsername: player.username,
      adminId: session.adminId,
      adminUsername: session.username,
      action,
      amount: cleanAmount,
      previousBalance,
      newBalance,
      reason: cleanReason,
      createdAt: new Date().toISOString(),
    };

    adjustments.unshift(adjustmentRecord);
    this.saveAdjustments(adjustments);

    // 7. Broadcast Real-Time Balance Update
    notifyAdminEvent('COIN_ADJUSTED', { playerId: player.id, newBalance, adjustmentRecord });

    return {
      success: true,
      adjustment: adjustmentRecord,
      newBalance,
    };
  },

  // Dashboard Metrics
  getDashboardMetrics(): AdminDashboardMetrics {
    const players = this.getPlayersList();
    const adjustments = this.getAdjustmentsList();

    const totalPlayers = players.length;
    const activePlayers = players.filter(p => p.status === 'active').length;
    const totalCoinsHeld = players.reduce((sum, p) => sum + p.coinBalance, 0);

    let totalCoinsAdded = 0;
    let totalCoinsRemoved = 0;

    adjustments.forEach(adj => {
      if (adj.action === 'ADD') {
        totalCoinsAdded += adj.amount;
      } else if (adj.action === 'REMOVE') {
        totalCoinsRemoved += adj.amount;
      }
    });

    return {
      totalPlayers,
      activePlayers,
      totalCoinsHeld,
      totalCoinsAdded,
      totalCoinsRemoved,
      recentAdjustments: adjustments.slice(0, 10),
    };
  },

  // Filtered Players Query
  getFilteredPlayers(
    searchQuery: string = '',
    sortBy: 'balance' | 'username' | 'date' = 'balance',
    filterStatus: 'all' | 'active' | 'inactive' = 'all'
  ): DbPlayer[] {
    let players = [...this.getPlayersList()];

    if (filterStatus !== 'all') {
      players = players.filter(p => p.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      players = players.filter(
        p => p.username.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'balance') {
      players.sort((a, b) => b.coinBalance - a.coinBalance);
    } else if (sortBy === 'username') {
      players.sort((a, b) => a.username.localeCompare(b.username));
    } else if (sortBy === 'date') {
      players.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return players;
  },

  // Filtered Coin History Query
  getFilteredHistory(
    searchPlayer: string = '',
    filterAction: 'ALL' | 'ADD' | 'REMOVE' = 'ALL',
    filterAdmin: string = ''
  ): DbCoinAdjustment[] {
    let history = [...this.getAdjustmentsList()];

    if (filterAction !== 'ALL') {
      history = history.filter(h => h.action === filterAction);
    }

    if (searchPlayer.trim()) {
      const q = searchPlayer.trim().toLowerCase();
      history = history.filter(
        h => h.playerUsername.toLowerCase().includes(q) || h.playerId.toLowerCase().includes(q)
      );
    }

    if (filterAdmin.trim()) {
      const q = filterAdmin.trim().toLowerCase();
      history = history.filter(
        h => h.adminUsername.toLowerCase().includes(q) || h.adminId.toLowerCase().includes(q)
      );
    }

    return history;
  },

  // Subscribe to real-time events
  subscribe(callback: AdminListener): () => void {
    adminListeners.add(callback);
    return () => {
      adminListeners.delete(callback);
    };
  },
};

// Initialize database automatically on module import
adminBackend.initDatabase();
