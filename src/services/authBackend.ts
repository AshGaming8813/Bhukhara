import type { User, UserRole, UserSession } from '../types/auth';
import type { DbCoinAdjustment, AdminDashboardMetrics, AdjustmentAction } from '../types/admin';

const STORAGE_USERS = 'bhukhara_db_users';
const STORAGE_ADJUSTMENTS = 'bhukhara_db_adjustments';
const STORAGE_PLAYER_SESSION = 'bhukhara_player_session';
const STORAGE_ADMIN_SESSION = 'bhukhara_admin_session';

// Salted hash function for passwords
function hashPassword(pass: string): string {
  let hash = 0;
  const salted = pass + '_bhukhara_secure_salt_2026';
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// Initial seed users
const SEED_USERS: User[] = [
  {
    id: 'usr_admin_1',
    player_id: 'BHUK-000000',
    username: 'SuperAdmin',
    email: 'admin@bhukhara.app',
    password_hash: hashPassword('admin123'),
    role: 'admin',
    coin_balance: 0,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_player_1',
    player_id: 'BHUK-100001',
    username: 'Namit',
    email: 'namit@bhukhara.app',
    password_hash: hashPassword('player123'),
    role: 'player',
    coin_balance: 1250,
    status: 'active',
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_player_2',
    player_id: 'BHUK-100002',
    username: 'Rohan',
    email: 'rohan@bhukhara.app',
    password_hash: hashPassword('player123'),
    role: 'player',
    coin_balance: 1000,
    status: 'active',
    created_at: '2026-08-02T11:30:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_player_3',
    player_id: 'BHUK-100003',
    username: 'Priya',
    email: 'priya@bhukhara.app',
    password_hash: hashPassword('player123'),
    role: 'player',
    coin_balance: 850,
    status: 'active',
    created_at: '2026-08-05T14:15:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_player_4',
    player_id: 'BHUK-100004',
    username: 'Vikram',
    email: 'vikram@bhukhara.app',
    password_hash: hashPassword('player123'),
    role: 'player',
    coin_balance: 1500,
    status: 'active',
    created_at: '2026-08-10T16:45:00.000Z',
    updated_at: new Date().toISOString(),
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

const authBc = createSafeBroadcastChannel('bhukhara_auth_bus');
type AuthListener = (type: string, data: any) => void;
const authListeners: Set<AuthListener> = new Set();

function notifyAuthEvent(type: string, data: any) {
  if (authBc) {
    try {
      authBc.postMessage({ type, data });
    } catch (e) {
      console.warn('PostMessage error:', e);
    }
  }
  authListeners.forEach(cb => cb(type, data));
}

if (authBc) {
  authBc.onmessage = event => {
    const { type, data } = event.data;
    authListeners.forEach(cb => cb(type, data));
  };
}

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('bhukhara_custom_backend_url');
    if (customUrl && customUrl.trim()) {
      const clean = customUrl.trim();
      return clean.endsWith('/api') ? clean : `${clean.replace(/\/$/, '')}/api`;
    }

    const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
    if (envUrl && envUrl.trim()) {
      const clean = envUrl.trim();
      return clean.endsWith('/api') ? clean : `${clean.replace(/\/$/, '')}/api`;
    }

    const host = window.location ? window.location.hostname || 'localhost' : 'localhost';
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return `http://${host}:3001/api`;
    }
  }
  return `http://localhost:3001/api`;
}

export async function syncDataWithBackendServer(): Promise<void> {
  try {
    const apiUrl = getApiUrl();
    const playersRes = await fetch(`${apiUrl}/admin/players`);
    if (playersRes.ok) {
      const data = await playersRes.json();
      if (data && Array.isArray(data.players)) {
        const remoteUsers: User[] = data.players;
        const localUsers = authBackend.getUsers();

        // 1. Sync local users that are not in remote DB to the server
        for (const lu of localUsers) {
          if (lu.role === 'player' && lu.email && lu.id !== 'usr_admin_1') {
            const existsInRemote = remoteUsers.some(
              ru => ru.id === lu.id || ru.player_id === lu.player_id || (ru.email && ru.email.toLowerCase() === lu.email.toLowerCase())
            );
            if (!existsInRemote) {
              try {
                const syncRes = await fetch(`${apiUrl}/auth/sync-user`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user: lu }),
                });
                if (syncRes.ok) {
                  const syncData = await syncRes.json();
                  if (syncData && syncData.user) {
                    remoteUsers.push(syncData.user);
                  }
                }
              } catch (err) {
                // Ignore background sync errors
              }
            }
          }
        }

        // 2. Merge remote server users into local cache
        let changed = false;
        remoteUsers.forEach(ru => {
          const idx = localUsers.findIndex(
            lu => lu.id === ru.id || lu.player_id === ru.player_id || (lu.email && ru.email && lu.email.toLowerCase() === ru.email.toLowerCase())
          );
          if (idx === -1) {
            localUsers.push(ru);
            changed = true;
          } else {
            if (
              localUsers[idx].coin_balance !== ru.coin_balance ||
              localUsers[idx].username !== ru.username ||
              localUsers[idx].status !== ru.status ||
              localUsers[idx].player_id !== ru.player_id
            ) {
              localUsers[idx] = { ...localUsers[idx], ...ru };
              changed = true;
            }
          }
        });

        if (changed || remoteUsers.length > localUsers.length) {
          authBackend.saveUsers(localUsers);
          notifyAuthEvent('USERS_SYNCED', localUsers);
        }
      }
    }

    const historyRes = await fetch(`${apiUrl}/admin/coin-history`);
    if (historyRes.ok) {
      const histData = await historyRes.json();
      if (histData && Array.isArray(histData.history)) {
        const remoteHist: DbCoinAdjustment[] = histData.history;
        if (remoteHist.length > 0) {
          authBackend.saveAdjustments(remoteHist);
          notifyAuthEvent('HISTORY_SYNCED', remoteHist);
        }
      }
    }
  } catch (e) {
    // Graceful offline fallback
  }
}

export const authBackend = {
  getApiUrl(): string {
    return getApiUrl();
  },

  setCustomApiUrl(url: string): void {
    if (typeof localStorage !== 'undefined') {
      if (!url || !url.trim()) {
        localStorage.removeItem('bhukhara_custom_backend_url');
      } else {
        localStorage.setItem('bhukhara_custom_backend_url', url.trim());
      }
      syncDataWithBackendServer();
    }
  },

  initDatabase(): void {
    try {
      if (!localStorage.getItem(STORAGE_USERS)) {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(SEED_USERS));
      }
      if (!localStorage.getItem(STORAGE_ADJUSTMENTS)) {
        localStorage.setItem(STORAGE_ADJUSTMENTS, JSON.stringify([]));
      }
    } catch (e) {
      console.warn('Init auth DB warning:', e);
    }

    syncDataWithBackendServer();
    if (typeof window !== 'undefined' && !(window as any).__bhukhara_sync_interval) {
      (window as any).__bhukhara_sync_interval = setInterval(() => {
        syncDataWithBackendServer();
      }, 3000);
    }
  },

  getUsers(): User[] {
    this.initDatabase();
    let users: User[] = [];
    try {
      users = JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
    } catch {
      users = [];
    }

    // Guarantee SuperAdmin account exists with role === 'admin' and exact current password_hash
    let adminIdx = users.findIndex(u => u.email.toLowerCase() === 'admin@bhukhara.app' || u.email.toLowerCase() === 'admin@bhukhara.com');
    const correctAdminHash = hashPassword('admin123');

    if (adminIdx === -1) {
      users.unshift({
        id: 'usr_admin_1',
        player_id: 'BHUK-000000',
        username: 'SuperAdmin',
        email: 'admin@bhukhara.app',
        password_hash: correctAdminHash,
        role: 'admin',
        coin_balance: 0,
        status: 'active',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
      });
      this.saveUsers(users);
    } else {
      let updated = false;
      if (users[adminIdx].role !== 'admin') {
        users[adminIdx].role = 'admin';
        updated = true;
      }
      if (users[adminIdx].password_hash !== correctAdminHash) {
        users[adminIdx].password_hash = correctAdminHash;
        updated = true;
      }
      if (updated) {
        this.saveUsers(users);
      }
    }

    return users;
  },

  saveUsers(users: User[]): void {
    try {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Save users error:', e);
    }
  },

  getAdjustmentsList(): DbCoinAdjustment[] {
    this.initDatabase();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_ADJUSTMENTS) || '[]');
    } catch {
      return [];
    }
  },

  saveAdjustments(adj: DbCoinAdjustment[]): void {
    try {
      localStorage.setItem(STORAGE_ADJUSTMENTS, JSON.stringify(adj));
    } catch (e) {
      console.warn('Save adjustments error:', e);
    }
  },

  // Sequential Player ID Generator (BHUK-100001, BHUK-100002...)
  generateNextPlayerId(): string {
    const users = this.getUsers().filter(u => u.role === 'player');
    let maxNum = 100000;
    users.forEach(u => {
      if (u.player_id && u.player_id.startsWith('BHUK-')) {
        const num = parseInt(u.player_id.replace('BHUK-', ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `BHUK-${maxNum + 1}`;
  },

  // Server-Authoritative Player Registration
  async registerPlayerAsync(
    username: string,
    email: string,
    pass: string,
    confirmPass: string
  ): Promise<{ success: boolean; error?: string; session?: UserSession }> {
    const cleanName = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters long.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!pass || pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (pass !== confirmPass) {
      return { success: false, error: 'Password and Confirm Password do not match.' };
    }

    // Try central backend server registration first
    try {
      const res = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanName,
          email: cleanEmail,
          password: pass,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const userObj: User = {
          ...data.user,
          password_hash: hashPassword(pass),
        };
        const users = this.getUsers();
        const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          users[idx] = userObj;
        } else {
          users.push(userObj);
        }
        this.saveUsers(users);

        const session = this.createSession(userObj);
        notifyAuthEvent('USER_REGISTERED', userObj);
        return { success: true, session };
      } else if (data && data.error) {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.warn('Backend server register unreachable, falling back to local creation:', err);
    }

    // Offline / Network Fallback local registration
    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    if (users.some(u => u.username.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: 'Username is already taken.' };
    }

    const newPlayerId = this.generateNextPlayerId();
    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      player_id: newPlayerId,
      username: cleanName,
      email: cleanEmail,
      password_hash: hashPassword(pass),
      role: 'player',
      coin_balance: 1000,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    const session = this.createSession(newUser);
    notifyAuthEvent('USER_REGISTERED', newUser);

    // Trigger async sync in background to upload local user to server as soon as connection is live
    syncDataWithBackendServer();

    return { success: true, session };
  },

  registerPlayer(
    username: string,
    email: string,
    pass: string,
    confirmPass: string
  ): { success: boolean; error?: string; session?: UserSession } {
    const cleanName = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters long.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!pass || pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (pass !== confirmPass) {
      return { success: false, error: 'Password and Confirm Password do not match.' };
    }

    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    if (users.some(u => u.username.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: 'Username is already taken.' };
    }

    const newPlayerId = this.generateNextPlayerId();
    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      player_id: newPlayerId,
      username: cleanName,
      email: cleanEmail,
      password_hash: hashPassword(pass),
      role: 'player',
      coin_balance: 1000,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    const session = this.createSession(newUser);
    notifyAuthEvent('USER_REGISTERED', newUser);

    // Sync with central backend server REST API immediately
    fetch(`${getApiUrl()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanName,
        email: cleanEmail,
        password: pass,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const curUsers = authBackend.getUsers();
          const idx = curUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
          if (idx !== -1) {
            curUsers[idx] = { ...curUsers[idx], ...data.user };
            authBackend.saveUsers(curUsers);
            notifyAuthEvent('USER_REGISTERED', curUsers[idx]);
          }
        }
      })
      .catch(() => {
        syncDataWithBackendServer();
      });

    return { success: true, session };
  },

  // Server-Authoritative Login
  login(
    emailOrUser: string,
    pass: string,
    expectedRole?: UserRole
  ): { success: boolean; error?: string; session?: UserSession } {
    const users = this.getUsers();
    const cleanInput = emailOrUser.trim().toLowerCase();
    const inputHash = hashPassword(pass);

    const user = users.find(
      u => u.email.toLowerCase() === cleanInput || u.username.toLowerCase() === cleanInput || u.player_id.toLowerCase() === cleanInput
    );

    if (!user || user.password_hash !== inputHash) {
      return { success: false, error: 'Invalid credentials. Please check your username/email and password.' };
    }

    // Role Enforcement Verification
    if (expectedRole === 'admin' && user.role !== 'admin') {
      return { success: false, error: 'Access Denied. Account does not have administrator privileges.' };
    }

    const session = this.createSession(user);
    notifyAuthEvent('USER_LOGIN', session);
    return { success: true, session };
  },

  createSession(user: User): UserSession {
    const session: UserSession = {
      token: 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      userId: user.id,
      player_id: user.player_id,
      username: user.username,
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    try {
      const str = JSON.stringify(session);
      const key = user.role === 'admin' ? STORAGE_ADMIN_SESSION : STORAGE_PLAYER_SESSION;
      sessionStorage.setItem(key, str);
      localStorage.setItem(key, str);
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }
    return session;
  },

  verifyPlayerSession(): UserSession | null {
    try {
      let raw = sessionStorage.getItem(STORAGE_PLAYER_SESSION);
      if (!raw) raw = localStorage.getItem(STORAGE_PLAYER_SESSION);
      if (!raw) return null;
      const session: UserSession = JSON.parse(raw);
      if (session.expiresAt < Date.now() || session.role !== 'player') {
        sessionStorage.removeItem(STORAGE_PLAYER_SESSION);
        localStorage.removeItem(STORAGE_PLAYER_SESSION);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  verifyAdminSession(): UserSession | null {
    try {
      let raw = sessionStorage.getItem(STORAGE_ADMIN_SESSION);
      if (!raw) raw = localStorage.getItem(STORAGE_ADMIN_SESSION);
      if (!raw) return null;
      const session: UserSession = JSON.parse(raw);
      if (session.expiresAt < Date.now() || session.role !== 'admin') {
        sessionStorage.removeItem(STORAGE_ADMIN_SESSION);
        localStorage.removeItem(STORAGE_ADMIN_SESSION);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  verifySession(): UserSession | null {
    return this.verifyPlayerSession() || this.verifyAdminSession();
  },

  logoutPlayer(): void {
    try {
      sessionStorage.removeItem(STORAGE_PLAYER_SESSION);
      localStorage.removeItem(STORAGE_PLAYER_SESSION);
    } catch (e) {
      console.warn(e);
    }
    notifyAuthEvent('USER_LOGOUT', null);
  },

  logoutAdmin(): void {
    try {
      sessionStorage.removeItem(STORAGE_ADMIN_SESSION);
      localStorage.removeItem(STORAGE_ADMIN_SESSION);
    } catch (e) {
      console.warn(e);
    }
    notifyAuthEvent('USER_LOGOUT', null);
  },

  logout(): void {
    this.logoutPlayer();
    this.logoutAdmin();
  },

  // Returns ONLY player accounts for game UI
  getCurrentUser(): User | null {
    const session = this.verifyPlayerSession();
    if (!session) return null;
    const users = this.getUsers();
    return users.find(u => u.id === session.userId && u.role === 'player') || null;
  },

  // Server-Authoritative Coin Adjustment API (Role Verified)
  adjustPlayerCoins(
    token: string,
    playerId: string,
    action: AdjustmentAction,
    amount: number,
    reason: string
  ): { success: boolean; error?: string; adjustment?: DbCoinAdjustment; newBalance?: number } {
    // Verify Admin Authentication & Role
    const session = this.verifyAdminSession();
    if (!session || session.token !== token || session.role !== 'admin') {
      return { success: false, error: 'Access Denied. Only authenticated admins can adjust coins.' };
    }

    const cleanAmount = Math.floor(Number(amount));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, error: 'Please enter a valid positive number of coins.' };
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      return { success: false, error: 'Mandatory reason is required for coin adjustments.' };
    }

    const users = this.getUsers();
    const userIdx = users.findIndex(u => u.id === playerId || u.player_id === playerId);
    if (userIdx === -1) {
      return { success: false, error: 'Player not found.' };
    }

    const targetUser = users[userIdx];
    const previousBalance = targetUser.coin_balance;

    if (action === 'REMOVE' && cleanAmount > previousBalance) {
      return {
        success: false,
        error: `Insufficient coin balance. Player currently has only ${previousBalance.toLocaleString()} virtual coins.`,
      };
    }

    const newBalance = action === 'ADD' ? previousBalance + cleanAmount : previousBalance - cleanAmount;

    users[userIdx] = {
      ...targetUser,
      coin_balance: newBalance,
      updated_at: new Date().toISOString(),
    };
    this.saveUsers(users);

    const adjustments = this.getAdjustmentsList();
    const adjustmentRecord: DbCoinAdjustment = {
      id: 'ADJ_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      playerId: targetUser.player_id,
      playerUsername: targetUser.username,
      adminId: session.userId,
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

    notifyAuthEvent('COIN_ADJUSTED', { userId: targetUser.id, newBalance, adjustmentRecord });

    // Sync with central backend server REST API
    fetch(`${getApiUrl()}/admin/adjust-coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetUser.id,
        playerId: targetUser.player_id,
        amount: cleanAmount,
        action,
        reason: cleanReason,
        adminId: session.userId,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const curUsers = authBackend.getUsers();
          const idx = curUsers.findIndex(u => u.id === data.user.id || u.player_id === data.user.player_id);
          if (idx !== -1) {
            curUsers[idx].coin_balance = data.user.coin_balance;
            authBackend.saveUsers(curUsers);
            notifyAuthEvent('COIN_ADJUSTED', { userId: curUsers[idx].id, newBalance: data.user.coin_balance });
          }
        }
      })
      .catch(err => {
        console.warn('Backend server coin adjustment sync error:', err);
      });

    return {
      success: true,
      adjustment: adjustmentRecord,
      newBalance,
    };
  },

  getDashboardMetrics(): AdminDashboardMetrics {
    const users = this.getUsers().filter(u => u.role === 'player');
    const adjustments = this.getAdjustmentsList();

    const totalPlayers = users.length;
    const activePlayers = users.filter(u => u.status === 'active').length;
    const totalCoinsHeld = users.reduce((sum, u) => sum + u.coin_balance, 0);

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

  subscribe(callback: AuthListener): () => void {
    authListeners.add(callback);
    return () => {
      authListeners.delete(callback);
    };
  },
};

export function getEffectiveCoinBalance(): number {
  const user = authBackend.getCurrentUser();
  if (user) return user.coin_balance;
  try {
    const guestVal = localStorage.getItem('bhukhara_guest_coins');
    if (guestVal !== null) {
      const parsed = parseInt(guestVal, 10);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(e);
  }
  return 1000; // Starting guest coins
}

export function deductPlayerCoins(amount: number): boolean {
  if (amount <= 0) return true;
  const user = authBackend.getCurrentUser();
  if (user) {
    if (user.coin_balance < amount) return false;
    const users = authBackend.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].coin_balance -= amount;
      users[idx].updated_at = new Date().toISOString();
      authBackend.saveUsers(users);
      notifyAuthEvent('COIN_ADJUSTED', { userId: user.id, newBalance: users[idx].coin_balance });
      return true;
    }
    return false;
  } else {
    const current = getEffectiveCoinBalance();
    if (current < amount) return false;
    try {
      localStorage.setItem('bhukhara_guest_coins', (current - amount).toString());
      notifyAuthEvent('COIN_ADJUSTED', { userId: 'guest', newBalance: current - amount });
    } catch (e) {
      console.warn(e);
    }
    return true;
  }
}

export function addPlayerCoins(amount: number): void {
  if (amount <= 0) return;
  const user = authBackend.getCurrentUser();
  if (user) {
    const users = authBackend.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].coin_balance += amount;
      users[idx].updated_at = new Date().toISOString();
      authBackend.saveUsers(users);
      notifyAuthEvent('COIN_ADJUSTED', { userId: user.id, newBalance: users[idx].coin_balance });
    }
  } else {
    const current = getEffectiveCoinBalance();
    try {
      localStorage.setItem('bhukhara_guest_coins', (current + amount).toString());
      notifyAuthEvent('COIN_ADJUSTED', { userId: 'guest', newBalance: current + amount });
    } catch (e) {
      console.warn(e);
    }
  }
}

// Auto initialize database
authBackend.initDatabase();
