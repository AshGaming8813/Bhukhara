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
      } catch (e) {
        console.error('Error reading db.json, reinitializing:', e);
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
    this.saveData();
  }

  saveData() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing db.json:', e);
    }
  }

  // User Authentication & Operations
  getUsers() {
    return this.data.users;
  }

  getUserById(id) {
    return this.data.users.find(u => u.id === id || u.player_id === id);
  }

  getUserByEmail(email) {
    const clean = email.toLowerCase().trim();
    return this.data.users.find(u => u.email.toLowerCase() === clean);
  }

  getUserByUsername(username) {
    const clean = username.toLowerCase().trim();
    return this.data.users.find(u => u.username.toLowerCase() === clean);
  }

  createUser({ username, email, password }) {
    const existingEmail = this.getUserByEmail(email);
    if (existingEmail) {
      throw new Error('An account with this email already exists.');
    }
    const existingName = this.getUserByUsername(username);
    if (existingName) {
      throw new Error('This username is already taken.');
    }

    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const newPlayerId = `BHUK-${randomDigits}`;
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newUser = {
      id: newUserId,
      player_id: newPlayerId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashPassword(password),
      role: 'player',
      coin_balance: 1000, // Initial welcome coin balance
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.saveData();
    return newUser;
  }

  authenticateUser(loginId, password) {
    const clean = loginId.trim().toLowerCase();
    const user = this.data.users.find(
      u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
    );

    if (!user) {
      throw new Error('User not found. Please check your username/email.');
    }

    if (user.status === 'inactive') {
      throw new Error('Account is suspended. Contact administrator.');
    }

    const inputHash = hashPassword(password);
    if (user.password_hash !== inputHash) {
      throw new Error('Incorrect password.');
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

    return { session, user };
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

    const adj = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      player_id: user.player_id,
      username: user.username,
      admin_id: adminId,
      action: action || (deltaCoins >= 0 ? 'add' : 'deduct'),
      amount: Math.abs(deltaCoins),
      prev_balance: prevBalance,
      new_balance: newBalance,
      timestamp: new Date().toISOString(),
      note: note || `Coins ${deltaCoins >= 0 ? 'added' : 'deducted'}`,
    };

    this.data.adjustments.unshift(adj);
    this.saveData();

    return { user, adj };
  }

  getAdjustments() {
    return this.data.adjustments;
  }
}

export const dbStore = new Store();
