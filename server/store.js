import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Helper to hash passwords with salt
export function hashPassword(pass) {
  let hash = 0;
  const salted = pass + '_bhukhara_secure_salt_2026';
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// Initial default seed users
const SEED_USERS = [
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

class Store {
  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadData() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.syncAndRepairUserProfiles();
      } catch (e) {
        console.error('[PROFILE ERROR] Error reading db.json, reinitializing:', e);
        this.initDefaultData();
      }
    } else {
      this.initDefaultData();
    }
  }

  initDefaultData() {
    this.data = {
      users: [...SEED_USERS],
      adjustments: [],
      sessions: {},
    };
    this.syncAndRepairUserProfiles();
    this.saveData();
  }

  syncAndRepairUserProfiles() {
    if (!this.data || !Array.isArray(this.data.users)) {
      this.data = { users: [...SEED_USERS], adjustments: [], sessions: {} };
    }

    let modified = false;
    const seenEmails = new Set();
    const cleanUsers = [];

    for (const u of this.data.users) {
      if (!u.email) continue;
      const cleanEmail = u.email.trim().toLowerCase();
      if (seenEmails.has(cleanEmail)) {
        modified = true;
        continue;
      }
      seenEmails.add(cleanEmail);

      const userObj = { ...u };
      if (!userObj.id) {
        userObj.id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        modified = true;
      }
      if (!userObj.player_id || !userObj.player_id.startsWith('BHUK-')) {
        userObj.player_id = this.generateNextPlayerId();
        modified = true;
      }
      if (!userObj.username) {
        userObj.username = cleanEmail.split('@')[0];
        modified = true;
      }
      if (!userObj.email) {
        userObj.email = cleanEmail;
        modified = true;
      }
      if (!userObj.role) {
        userObj.role = 'player';
        modified = true;
      }
      if (typeof userObj.coin_balance !== 'number' || isNaN(userObj.coin_balance)) {
        userObj.coin_balance = userObj.role === 'admin' ? 0 : 1000;
        modified = true;
      }
      if (!userObj.status) {
        userObj.status = 'active';
        modified = true;
      }
      if (!userObj.created_at) {
        userObj.created_at = new Date().toISOString();
        modified = true;
      }
      if (!userObj.updated_at) {
        userObj.updated_at = new Date().toISOString();
        modified = true;
      }

      cleanUsers.push(userObj);
    }

    this.data.users = cleanUsers;
    if (modified) {
      this.saveData();
      console.log('[PROFILE REPAIR] Repaired and synchronized player profiles in DB store.');
    }
  }

  saveData() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[PROFILE ERROR] Error writing db.json:', e);
    }
  }

  // User Authentication & Operations
  getUsers() {
    return this.data.users;
  }

  getUserById(id) {
    if (!id) return null;
    return this.data.users.find(u => u.id === id || u.player_id === id);
  }

  getUserByEmail(email) {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    return this.data.users.find(u => u.email && u.email.toLowerCase() === clean);
  }

  getUserByUsername(username) {
    if (!username) return null;
    const clean = username.toLowerCase().trim();
    return this.data.users.find(u => u.username && u.username.toLowerCase() === clean);
  }

  generateNextPlayerId() {
    const players = (this.data?.users || []).filter(u => u.role === 'player');
    let maxNum = 100000;
    players.forEach(u => {
      if (u.player_id && u.player_id.startsWith('BHUK-')) {
        const num = parseInt(u.player_id.replace('BHUK-', ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `BHUK-${maxNum + 1}`;
  }

  createUser({ username, email, password }) {
    console.log(`[REGISTRATION] Creating account for: username="${username}", email="${email}"`);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (username || '').trim();

    if (!cleanName || cleanName.length < 2) {
      console.error(`[PROFILE ERROR] Username too short: "${cleanName}"`);
      throw new Error('Username must be at least 2 characters long.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      console.error(`[PROFILE ERROR] Invalid email: "${cleanEmail}"`);
      throw new Error('Valid email address is required.');
    }
    if (!password || password.length < 6) {
      console.error(`[PROFILE ERROR] Password too short.`);
      throw new Error('Password must be at least 6 characters long.');
    }

    const existingEmail = this.getUserByEmail(cleanEmail);
    if (existingEmail) {
      console.warn(`[REGISTRATION] Account email exists: ${cleanEmail}`);
      throw new Error('An account with this email already exists.');
    }
    const existingName = this.getUserByUsername(cleanName);
    if (existingName) {
      console.warn(`[REGISTRATION] Username taken: ${cleanName}`);
      throw new Error('This username is already taken.');
    }

    const newPlayerId = this.generateNextPlayerId();
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newUser = {
      id: newUserId,
      player_id: newPlayerId,
      username: cleanName,
      email: cleanEmail,
      password_hash: hashPassword(password),
      role: 'player',
      coin_balance: 1000,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.saveData();

    console.log(`[PROFILE CREATE] Success! Registered player ${newUser.username} (${newUser.player_id}) -> User ID: ${newUser.id}`);

    const { password_hash, ...safeUser } = newUser;
    return safeUser;
  }

  syncClientUser(clientUser) {
    if (!clientUser || !clientUser.email) return null;
    const cleanEmail = clientUser.email.trim().toLowerCase();
    let existing = this.getUserByEmail(cleanEmail);

    if (existing) {
      let updated = false;
      if (!existing.player_id && clientUser.player_id) {
        existing.player_id = clientUser.player_id;
        updated = true;
      }
      if (updated) {
        existing.updated_at = new Date().toISOString();
        this.saveData();
      }
      const { password_hash, ...safe } = existing;
      return safe;
    } else {
      const newPlayerId = clientUser.player_id && clientUser.player_id.startsWith('BHUK-')
        ? clientUser.player_id
        : this.generateNextPlayerId();
      const newUserId = clientUser.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newUser = {
        id: newUserId,
        player_id: newPlayerId,
        username: clientUser.username || cleanEmail.split('@')[0],
        email: cleanEmail,
        password_hash: clientUser.password_hash || hashPassword('player123'),
        role: clientUser.role || 'player',
        coin_balance: typeof clientUser.coin_balance === 'number' ? clientUser.coin_balance : 1000,
        status: clientUser.status || 'active',
        created_at: clientUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.data.users.push(newUser);
      this.saveData();
      console.log(`[PROFILE SYNC] Synced client user to server DB: ${newUser.username} (${newUser.player_id}) -> ${newUser.email}`);
      const { password_hash, ...safe } = newUser;
      return safe;
    }
  }

  authenticateUser(loginId, password) {
    console.log(`[PROFILE RESULT] Authenticating login attempt for: "${loginId}"`);
    const clean = loginId.trim().toLowerCase();
    let user = this.data.users.find(
      u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean || (u.player_id && u.player_id.toLowerCase() === clean)
    );

    if (!user) {
      console.warn(`[PROFILE ERROR] Authentication failed: User "${loginId}" not found.`);
      throw new Error('User not found. Please check your username/email.');
    }

    if (user.status === 'inactive') {
      console.warn(`[PROFILE ERROR] Authentication failed: User "${loginId}" is inactive.`);
      throw new Error('Account is suspended. Contact administrator.');
    }

    const inputHash = hashPassword(password);
    if (user.password_hash !== inputHash) {
      console.warn(`[PROFILE ERROR] Incorrect password for "${loginId}".`);
      throw new Error('Incorrect password.');
    }

    // Auto-repair player_id if missing
    if (!user.player_id || !user.player_id.startsWith('BHUK-')) {
      user.player_id = this.generateNextPlayerId();
      user.updated_at = new Date().toISOString();
      this.saveData();
    }

    const sessionToken = `token_${user.id}_${Date.now()}`;
    const session = {
      token: sessionToken,
      userId: user.id,
      player_id: user.player_id,
      username: user.username,
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    this.data.sessions[sessionToken] = session;
    this.saveData();

    console.log(`[PROFILE RESULT] User authenticated successfully: ${user.username} (${user.player_id})`);
    const { password_hash, ...safeUser } = user;
    return { session, user: safeUser };
  }

  getSession(token) {
    const s = this.data.sessions[token];
    if (s && s.expiresAt > Date.now()) {
      return s;
    }
    return null;
  }

  updateCoinBalance(userId, deltaCoins, action, adminId = 'SYSTEM', note = '') {
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('Player not found.');
    }

    const prevBalance = user.coin_balance || 0;
    const newBalance = Math.max(0, prevBalance + deltaCoins);
    user.coin_balance = newBalance;
    user.updated_at = new Date().toISOString();

    const normalizedAction = (action || (deltaCoins >= 0 ? 'ADD' : 'REMOVE')).toUpperCase();
    const adj = {
      id: `ADJ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      playerId: user.player_id,
      playerUsername: user.username,
      adminId: adminId || 'usr_admin_1',
      adminUsername: adminId === 'usr_admin_1' ? 'SuperAdmin' : adminId,
      action: normalizedAction,
      amount: Math.abs(deltaCoins),
      previousBalance: prevBalance,
      newBalance: newBalance,
      prev_balance: prevBalance,
      new_balance: newBalance,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      reason: note || `Coins ${deltaCoins >= 0 ? 'added' : 'removed'} by admin`,
      note: note || `Coins ${deltaCoins >= 0 ? 'added' : 'removed'} by admin`,
    };

    this.data.adjustments = this.data.adjustments || [];
    this.data.adjustments.unshift(adj);
    this.saveData();

    return { user, adj };
  }

  getAdjustments() {
    return this.data.adjustments || [];
  }
}

export const dbStore = new Store();
