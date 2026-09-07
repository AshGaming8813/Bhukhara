import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { dbStore } from './store.js';
import { roomManager } from './roomManager.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active WebSocket connections: roomId -> Set<WebSocket>
const roomSubscriptions = new Map();
// Client socket metadata
const clientMeta = new Map();

function broadcastToRoom(roomId, messageObj) {
  const subscribers = roomSubscriptions.get(roomId);
  if (!subscribers) return;
  const jsonStr = JSON.stringify(messageObj);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
    }
  }
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Bhukhara Backend Server',
    time: new Date().toISOString(),
  });
});

// Authentication
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }
    const newUser = dbStore.createUser({ username, email, password });
    const { session, user } = dbStore.authenticateUser(email, password);
    res.json({ success: true, session, user });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }
    const { session, user } = dbStore.authenticateUser(loginId, password);
    res.json({ success: true, session, user });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Authentication failed.' });
  }
});

app.get('/api/auth/user/:id', (req, res) => {
  const user = dbStore.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Admin Panel APIs
app.get('/api/admin/metrics', (req, res) => {
  const users = dbStore.getUsers();
  const players = users.filter(u => u.role === 'player');
  const totalCoins = players.reduce((sum, u) => sum + (u.coin_balance || 0), 0);
  const activeRooms = roomManager.rooms.size;

  res.json({
    total_players: players.length,
    active_players: players.filter(u => u.status === 'active').length,
    total_coins_in_circulation: totalCoins,
    active_rooms: activeRooms,
    system_status: 'Healthy',
  });
});

app.get('/api/admin/players', (req, res) => {
  const users = dbStore.getUsers();
  const safeUsers = users.map(({ password_hash, ...u }) => u);
  res.json({ players: safeUsers });
});

app.post('/api/admin/adjust-coins', (req, res) => {
  try {
    const { userId, deltaCoins, action, adminId, note } = req.body;
    if (!userId || deltaCoins === undefined) {
      return res.status(400).json({ error: 'userId and deltaCoins are required.' });
    }
    const { user, adj } = dbStore.updateCoinBalance(
      userId,
      Number(deltaCoins),
      action,
      adminId || 'ADMIN',
      note
    );
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, user: safeUser, adjustment: adj });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Coin adjustment failed.' });
  }
});

app.get('/api/admin/coin-history', (req, res) => {
  res.json({ history: dbStore.getAdjustments() });
});

// Room APIs
app.get('/api/rooms/list', (req, res) => {
  const rooms = roomManager.listPublicRooms();
  res.json({ rooms });
});

app.post('/api/rooms/create', (req, res) => {
  try {
    const { hostUser, gameMode, bazziMode, coinWager } = req.body;
    if (!hostUser) {
      return res.status(400).json({ error: 'hostUser is required.' });
    }
    const room = roomManager.createRoom({
      hostUser,
      gameMode,
      bazziMode,
      coinWager,
    });
    res.json({ success: true, room });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create room.' });
  }
});

app.post('/api/rooms/join', (req, res) => {
  try {
    const { roomCode, user } = req.body;
    if (!roomCode || !user) {
      return res.status(400).json({ error: 'roomCode and user are required.' });
    }
    const room = roomManager.joinRoom({ roomCode, user });
    res.json({ success: true, room });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to join room.' });
  }
});

// ----------------------------------------------------
// WEBSOCKET REAL-TIME SERVER
// ----------------------------------------------------

wss.on('connection', (ws) => {
  clientMeta.set(ws, { roomId: null, userId: null });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      const { type, payload } = parsed;

      if (type === 'SUBSCRIBE_ROOM') {
        const { roomId, userId } = payload;
        const meta = clientMeta.get(ws);
        meta.roomId = roomId;
        meta.userId = userId;

        if (!roomSubscriptions.has(roomId)) {
          roomSubscriptions.set(roomId, new Set());
        }
        roomSubscriptions.get(roomId).add(ws);

        const room = roomManager.getRoom(roomId);
        if (room) {
          if (room.players[userId]) {
            room.players[userId].connected = true;
          }
          ws.send(JSON.stringify({ type: 'ROOM_UPDATED', data: { room } }));
          broadcastToRoom(roomId, { type: 'ROOM_UPDATED', data: { room } });
        }
      }

      else if (type === 'TOGGLE_READY') {
        const { roomId, userId } = payload;
        const room = roomManager.toggleReady(roomId, userId);
        if (room) {
          broadcastToRoom(roomId, { type: 'ROOM_UPDATED', data: { room } });
        }
      }

      else if (type === 'START_GAME') {
        const { roomId, gameState } = payload;
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.status = 'PLAYING';
          room.gameState = gameState;
          broadcastToRoom(roomId, { type: 'ROOM_UPDATED', data: { room } });
          broadcastToRoom(roomId, { type: 'GAME_STATE_UPDATED', data: { gameState } });
        }
      }

      else if (type === 'GAME_ACTION') {
        const { roomId, gameState } = payload;
        const room = roomManager.updateGameState(roomId, gameState);
        if (room) {
          broadcastToRoom(roomId, { type: 'GAME_STATE_UPDATED', data: { gameState } });
        }
      }

      else if (type === 'SEND_EMOTE') {
        const { roomId, senderId, senderName, emote } = payload;
        const emoteEvent = {
          id: `emote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId,
          senderName,
          emote,
          timestamp: Date.now(),
        };
        broadcastToRoom(roomId, { type: 'EMOTE_RECEIVED', data: { emoteEvent } });
      }

      else if (type === 'SETTLE_GAME_WAGER') {
        const { roomId, winnerId, coinWager } = payload;
        const room = roomManager.getRoom(roomId);
        if (room && coinWager > 0) {
          const players = Object.values(room.players);
          const totalWagerPool = coinWager * players.length;

          // Deduct wager from each player, reward winner total pool
          players.forEach(p => {
            if (p.id === winnerId) {
              const reward = totalWagerPool - coinWager;
              dbStore.updateCoinBalance(p.id, reward, 'add', 'SYSTEM', `Won room match pot (${room.roomCode})`);
            } else {
              dbStore.updateCoinBalance(p.id, -coinWager, 'deduct', 'SYSTEM', `Lost room match wager (${room.roomCode})`);
            }
          });

          room.status = 'COMPLETED';
          broadcastToRoom(roomId, { type: 'ROOM_UPDATED', data: { room } });
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
      ws.send(JSON.stringify({ type: 'ERROR', data: { message: err.message || 'Invalid socket message' } }));
    }
  });

  ws.on('close', () => {
    const meta = clientMeta.get(ws);
    if (meta && meta.roomId) {
      const { roomId, userId } = meta;
      const subs = roomSubscriptions.get(roomId);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          roomSubscriptions.delete(roomId);
        }
      }
      if (userId) {
        const room = roomManager.getRoom(roomId);
        if (room && room.players[userId]) {
          room.players[userId].connected = false;
          broadcastToRoom(roomId, { type: 'ROOM_UPDATED', data: { room } });
        }
      }
    }
    clientMeta.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Bhukhara Dedicated Backend Server is running!`);
  console.log(` REST API: http://localhost:${PORT}/api`);
  console.log(` WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`====================================================`);
});
