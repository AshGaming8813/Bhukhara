import type {
  OnlineRoom,
  OnlinePlayer,
  GameMode,
  BazziMode,
  GameState,
  OnlineEmoteEvent,
  Player,
  Combination,
} from '../types/game';
import { createDeck, dealCards } from '../engine/deck';
import { ref, set, get, onValue } from 'firebase/database';
import { db } from './firebaseConfig';
import { getEffectiveCoinBalance, deductPlayerCoins } from './authBackend';

// Non-confusing characters for 6-character room codes (no O/0, I/1, S/5)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = 'BH';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

export function getStoredPlayerId(): string {
  try {
    let pid = sessionStorage.getItem('bhukhara_online_player_id');
    if (!pid) {
      pid = 'P_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem('bhukhara_online_player_id', pid);
    }
    return pid;
  } catch (e) {
    return 'P_' + Math.random().toString(36).substring(2, 9);
  }
}

export function getStoredDisplayName(): string {
  try {
    return localStorage.getItem('bhukhara_display_name') || 'Player';
  } catch (e) {
    return 'Player';
  }
}

export function setStoredDisplayName(name: string): void {
  try {
    localStorage.setItem('bhukhara_display_name', name.trim());
  } catch (e) {
    console.warn('Storage error:', e);
  }
}

// Persistent & Real-Time Storage Keys
const STORAGE_ROOMS = 'bhukhara_online_rooms_db_v1';
const STORAGE_GAME_STATES = 'bhukhara_online_game_states_db_v1';
const CLOUD_NTFY_BASE = 'https://ntfy.sh';

// In-Memory Stores
const roomStore: Record<string, OnlineRoom> = {};
const gameStateStore: Record<string, GameState> = {};

function cleanStaleRooms(): void {
  const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
  const now = Date.now();
  Object.keys(roomStore).forEach(code => {
    const room = roomStore[code];
    if (room && (now - room.createdAt > MAX_AGE_MS || room.status === 'COMPLETED' || room.status === 'CLOSED')) {
      delete roomStore[code];
      delete gameStateStore[code];
    }
  });
}

function syncStorageFromDisk(): void {
  try {
    const rawRooms = localStorage.getItem(STORAGE_ROOMS);
    if (rawRooms) {
      const parsedRooms: Record<string, OnlineRoom> = JSON.parse(rawRooms);
      Object.assign(roomStore, parsedRooms);
    }
    const rawStates = localStorage.getItem(STORAGE_GAME_STATES);
    if (rawStates) {
      const parsedStates: Record<string, GameState> = JSON.parse(rawStates);
      Object.assign(gameStateStore, parsedStates);
    }
    cleanStaleRooms();
  } catch (e) {
    console.warn('Error reading online storage from disk:', e);
  }
}

function saveStorageToDisk(): void {
  try {
    localStorage.setItem(STORAGE_ROOMS, JSON.stringify(roomStore));
    localStorage.setItem(STORAGE_GAME_STATES, JSON.stringify(gameStateStore));
  } catch (e) {
    console.warn('Error writing online storage to disk:', e);
  }
}

// Initial Sync from Disk
syncStorageFromDisk();

// Cloud Relay Persistence Helpers for Cross-Device / Mobile / Network Play
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

const PUBNUB_PUB_BASE = 'https://ps.pubnub.com/publish/demo/demo/0';
const PUBNUB_SUB_BASE = 'https://ps.pubnub.com/v2/history/sub-key/demo/channel';

function publishRoomToCloud(roomCode: string, room: OnlineRoom): void {
  const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const bodyStr = encodeURIComponent(JSON.stringify(room));

  // 1. Primary: Firebase Realtime Database
  try {
    set(ref(db, `rooms/${cleanCode}`), room).catch(() => {});
    set(ref(db, `global_rooms/${cleanCode}`), room).catch(() => {});
  } catch (e) {
    console.warn('Firebase publish room warning:', e);
  }

  // 2. Secondary: PubNub global edge relay
  fetchWithTimeout(`${PUBNUB_PUB_BASE}/bhukhara_room_${cleanCode}/0/${bodyStr}`, {}, 2500)
    .catch(() => {});

  fetchWithTimeout(`${PUBNUB_PUB_BASE}/bhukhara_global_feed/0/${bodyStr}`, {}, 2500)
    .catch(() => {});

  // 3. Tertiary: ntfy.sh relay (with strict 2.5s timeout)
  fetchWithTimeout(`${CLOUD_NTFY_BASE}/bhukhara_room_${cleanCode}`, {
    method: 'POST',
    body: JSON.stringify(room),
  }, 2500).catch(() => {});
}

async function fetchRoomFromCloud(roomCode: string): Promise<OnlineRoom | null> {
  const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // 1. Primary: Firebase Realtime Database
  try {
    const snapshot = await get(ref(db, `rooms/${cleanCode}`));
    if (snapshot.exists()) {
      const roomObj = snapshot.val();
      if (roomObj && roomObj.roomCode) {
        return roomObj as OnlineRoom;
      }
    }
  } catch (e) {
    console.warn('Firebase fetch room warning:', e);
  }

  // 2. Secondary: PubNub global edge history
  try {
    const res = await fetchWithTimeout(`${PUBNUB_SUB_BASE}/bhukhara_room_${cleanCode}?count=1`, {}, 2500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0]) && data[0].length > 0) {
        const roomObj = data[0][data[0].length - 1];
        if (roomObj && roomObj.roomCode) {
          return roomObj as OnlineRoom;
        }
      }
    }
  } catch (e) {
    console.warn('PubNub room fetch warning:', e);
  }

  // 3. Tertiary: ntfy.sh relay with strict 2s timeout
  try {
    const res = await fetchWithTimeout(`${CLOUD_NTFY_BASE}/bhukhara_room_${cleanCode}/json?poll=1`, {}, 2000);
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.message) {
            const roomObj: OnlineRoom = JSON.parse(entry.message);
            if (roomObj && roomObj.roomCode) {
              return roomObj;
            }
          }
        } catch {
          // Parse next line
        }
      }
    }
  } catch (e) {
    console.warn('ntfy fetch room warning:', e);
  }
  return null;
}

function publishGameStateToCloud(roomCode: string, state: GameState): void {
  const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const cloudState = { ...state };
  delete cloudState.localPlayerId;
  const bodyStr = encodeURIComponent(JSON.stringify(cloudState));

  // 1. Primary: Firebase Realtime Database
  try {
    set(ref(db, `states/${cleanCode}`), cloudState).catch(() => {});
  } catch (e) {
    console.warn('Firebase publish state warning:', e);
  }

  // 2. Secondary: PubNub global edge relay
  fetchWithTimeout(`${PUBNUB_PUB_BASE}/bhukhara_state_${cleanCode}/0/${bodyStr}`, {}, 2500)
    .catch(() => {});

  // 3. Tertiary: ntfy.sh relay
  fetchWithTimeout(`${CLOUD_NTFY_BASE}/bhukhara_state_${cleanCode}`, {
    method: 'POST',
    body: JSON.stringify(cloudState),
  }, 2500).catch(() => {});
}

async function fetchGameStateFromCloud(roomCode: string): Promise<GameState | null> {
  const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // 1. Primary: Firebase Realtime Database
  try {
    const snapshot = await get(ref(db, `states/${cleanCode}`));
    if (snapshot.exists()) {
      const stateObj = snapshot.val();
      if (stateObj && stateObj.players) {
        return stateObj as GameState;
      }
    }
  } catch (e) {
    console.warn('Firebase fetch state warning:', e);
  }

  // 2. Secondary: PubNub global edge history
  try {
    const res = await fetchWithTimeout(`${PUBNUB_SUB_BASE}/bhukhara_state_${cleanCode}?count=1`, {}, 2500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0]) && data[0].length > 0) {
        const stateObj = data[0][data[0].length - 1];
        if (stateObj && stateObj.players) {
          return stateObj as GameState;
        }
      }
    }
  } catch (e) {
    console.warn('PubNub state fetch warning:', e);
  }

  // 3. Tertiary: ntfy.sh relay
  try {
    const res = await fetchWithTimeout(`${CLOUD_NTFY_BASE}/bhukhara_state_${cleanCode}/json?poll=1`, {}, 2000);
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.message) {
            const stateObj: GameState = JSON.parse(entry.message);
            if (stateObj && stateObj.players) {
              return stateObj;
            }
          }
        } catch {
          // Parse next line
        }
      }
    }
  } catch (e) {
    console.warn('ntfy fetch state warning:', e);
  }
  return null;
}

async function fetchGlobalRoomsFromCloud(): Promise<OnlineRoom[]> {
  try {
    const res = await fetchWithTimeout(`${PUBNUB_SUB_BASE}/bhukhara_global_feed?count=10`, {}, 2500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const roomMap: Record<string, OnlineRoom> = {};
        data[0].forEach((r: any) => {
          if (r && r.roomCode && (r.status === 'WAITING' || r.status === 'READY')) {
            roomMap[r.roomCode] = r;
          }
        });
        return Object.values(roomMap);
      }
    }
  } catch (e) {
    console.warn('PubNub global rooms fetch warning:', e);
  }
  return [];
}

function createSafeBroadcastChannel(name: string): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      return new BroadcastChannel(name);
    }
  } catch (e) {
    console.warn(`BroadcastChannel ${name} disabled or restricted:`, e);
  }
  return null;
}

// Multi-Tab & Device Event Bus
const bc = createSafeBroadcastChannel('bhukhara_online_bus');

type ListenerCallback = (data: { room: OnlineRoom | null; gameState: GameState | null; emote: OnlineEmoteEvent | null }) => void;
const listeners: Record<string, Set<ListenerCallback>> = {};

function notifyRoomUpdate(roomCode: string, emote?: OnlineEmoteEvent) {
  saveStorageToDisk();
  const room = roomStore[roomCode] || null;
  const rawState = gameStateStore[roomCode] || null;

  if (room) publishRoomToCloud(roomCode, room);
  if (rawState) publishGameStateToCloud(roomCode, rawState);

  // Broadcast to other tabs/windows
  if (bc) {
    try {
      bc.postMessage({
        type: 'ROOM_UPDATE',
        roomCode,
        room,
        gameState: rawState,
        emote: emote || null,
      });
    } catch (e) {
      console.warn('Broadcast message error:', e);
    }
  }

  // Notify local listeners
  if (listeners[roomCode]) {
    listeners[roomCode].forEach(cb => {
      cb({ room, gameState: rawState, emote: emote || null });
    });
  }
}

if (bc) {
  bc.onmessage = event => {
    const { type, roomCode, room, gameState, emote } = event.data;
    if (type === 'ROOM_UPDATE' && roomCode) {
      if (room) roomStore[roomCode] = room;
      if (gameState) gameStateStore[roomCode] = gameState;
      saveStorageToDisk();
      if (listeners[roomCode]) {
        listeners[roomCode].forEach(cb => {
          cb({ room: roomStore[roomCode] || null, gameState: gameStateStore[roomCode] || null, emote });
        });
      }
    }
  };
}

// Global Storage Event Listener (triggers across windows/tabs)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_ROOMS || e.key === STORAGE_GAME_STATES) {
      syncStorageFromDisk();
      Object.keys(listeners).forEach(code => {
        if (listeners[code]) {
          listeners[code].forEach(cb => {
            cb({
              room: roomStore[code] || null,
              gameState: gameStateStore[code] || null,
              emote: null,
            });
          });
        }
      });
    }
  });
}

export const onlineEngine = {
  createRoom(displayName: string, gameMode: GameMode, bazziMode: BazziMode, coinWager: number = 100): { roomCode: string; playerId: string } {
    syncStorageFromDisk();
    const playerId = getStoredPlayerId();
    setStoredDisplayName(displayName);
    const roomCode = generateRoomCode();

    const maxPlayers = gameMode === '2P' ? 2 : 4;
    const hostPlayer: OnlinePlayer = {
      id: playerId,
      displayName,
      seat: 0,
      slotId: 'P1',
      team: 'A',
      isHost: true,
      isReady: true,
      connected: true,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    const room: OnlineRoom = {
      roomId: 'room_' + Date.now(),
      roomCode,
      hostId: playerId,
      gameMode,
      bazziMode,
      coinWager,
      maxPlayers,
      status: 'WAITING',
      players: {
        [playerId]: hostPlayer,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    roomStore[roomCode] = room;
    notifyRoomUpdate(roomCode);
    return { roomCode, playerId };
  },

  async joinRoom(roomCode: string, displayName: string): Promise<{ success: boolean; error?: string; playerId?: string }> {
    syncStorageFromDisk();
    const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // 1. Check local RAM / disk storage first
    let matchedKey = Object.keys(roomStore).find(
      key => key.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanCode
    );
    let room = matchedKey ? roomStore[matchedKey] : null;

    // 2. If not found locally, fetch from Cloud Relay (for cross-device / internet play)
    if (!room) {
      const cloudRoom = await fetchRoomFromCloud(cleanCode);
      if (cloudRoom) {
        roomStore[cloudRoom.roomCode] = cloudRoom;
        saveStorageToDisk();
        room = cloudRoom;
        matchedKey = cloudRoom.roomCode;
      }
    }

    if (!room) {
      return { success: false, error: 'Room not found. Please check the room code.' };
    }

    if (room.status === 'COMPLETED' || room.status === 'CLOSED') {
      return { success: false, error: 'Room expired or closed.' };
    }

    const playerId = getStoredPlayerId();
    setStoredDisplayName(displayName);

    // Existing player reconnecting
    if (room.players[playerId]) {
      room.players[playerId].connected = true;
      room.players[playerId].displayName = displayName;
      room.players[playerId].lastSeen = Date.now();
      room.updatedAt = Date.now();
      notifyRoomUpdate(room.roomCode);
      return { success: true, playerId };
    }

    // CHECK COIN BALANCE FOR NEW JOINING PLAYER
    const requiredWager = room.coinWager || 0;
    const playerCoins = getEffectiveCoinBalance();
    if (playerCoins < requiredWager) {
      return {
        success: false,
        error: `Insufficient coins to join! Entry wager is 🪙 ${requiredWager.toLocaleString()} coins, but your balance is 🪙 ${playerCoins.toLocaleString()} coins. Please add coins to join.`,
      };
    }

    if (room.status === 'PLAYING') {
      return { success: false, error: 'Game already started.' };
    }

    const currentCount = Object.keys(room.players).length;
    if (currentCount >= room.maxPlayers) {
      return { success: false, error: 'Room is full.' };
    }

    const seat = currentCount;
    const slotId: 'P1' | 'P2' | 'P3' | 'P4' = (`P${seat + 1}`) as any;
    const team: 'A' | 'B' = (slotId === 'P1' || slotId === 'P3') ? 'A' : 'B';

    const newPlayer: OnlinePlayer = {
      id: playerId,
      displayName,
      seat,
      slotId,
      team,
      isHost: false,
      isReady: false,
      connected: true,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    room.players[playerId] = newPlayer;
    if (Object.keys(room.players).length === room.maxPlayers) {
      room.status = 'READY';
    }
    room.updatedAt = Date.now();

    notifyRoomUpdate(room.roomCode);
    return { success: true, playerId };
  },

  toggleReady(roomCode: string, playerId: string): void {
    const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const matchedKey = Object.keys(roomStore).find(
      key => key.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanCode
    ) || roomCode;
    const room = roomStore[matchedKey];
    if (!room) return;

    let player: OnlinePlayer | undefined = room.players[playerId];
    if (!player) {
      player = Object.values(room.players).find(p => p.id === playerId || p.slotId === playerId);
    }
    if (!player) {
      const players = Object.values(room.players);
      player = players.find(p => !p.isHost) || players[0];
    }

    if (player) {
      player.isReady = !player.isReady;
      room.updatedAt = Date.now();

      const allReady = Object.values(room.players).every(p => p.isReady);
      if (allReady && Object.keys(room.players).length === room.maxPlayers) {
        room.status = 'READY';
      }

      notifyRoomUpdate(room.roomCode);
    }
  },

  startGame(roomCode: string, hostPlayerId: string): { success: boolean; error?: string } {
    const room = roomStore[roomCode];
    if (!room) return { success: false, error: 'Room not found.' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Only the Host can start the game.' };

    const playersList = Object.values(room.players);
    if (playersList.length < room.maxPlayers) {
      return { success: false, error: `Waiting for players (${playersList.length}/${room.maxPlayers}).` };
    }

    // Authoritative Server-Side Game Initialization
    const deck = createDeck();
    const deal = dealCards(room.gameMode, deck);
    const playerOrder = room.gameMode === '2P' ? ['P1', 'P2'] : ['P1', 'P2', 'P3', 'P4'];

    const dealerIdx = Math.floor(Math.random() * playerOrder.length);
    const firstTurnIdx = (dealerIdx + 1) % playerOrder.length;

    const gamePlayers: Record<string, Player> = {};
    playersList.forEach(p => {
      gamePlayers[p.slotId] = {
        id: p.slotId,
        name: p.displayName,
        isHuman: true, // All online players are human!
        team: p.team,
        hand: deal.playerHands[p.slotId],
        hasOpenedPureSeries: false,
        hasClaimedBhukhara: false,
        justClaimedBhukharaThisTurn: false,
        modaCount: 0,
      };
    });

    const teams: Record<string, Combination[]> = room.gameMode === '2P' ? { P1: [], P2: [] } : { A: [], B: [] };

    const gameSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const initialGameState: GameState = {
      gameMode: room.gameMode,
      bazziMode: room.bazziMode,
      currentBazzi: 1,
      leadScore: room.gameMode === '2P' ? { P1: 0, P2: 0 } : { A: 0, B: 0 },
      bazziResults: [],
      players: gamePlayers,
      playerOrder,
      dealerIndex: dealerIdx,
      currentTurnIndex: firstTurnIdx,
      currentTurnPlayerId: playerOrder[firstTurnIdx],
      version: 1,
      gameSessionId,
      updatedAt: Date.now(),
      hasDrawnThisTurn: false,
      mustDiscard: false,
      closeDeck: deal.closeDeck,
      openDeck: deal.openDeck,
      bhukharaPile: deal.bhukharaPile,
      combinations: teams,
      phase: 'DRAW',
      modaCount: 0,
      lastAction: `Game Started! ${gamePlayers[playerOrder[firstTurnIdx]].name}'s turn to draw.`,
      foul: null,
      winner: null,
      soundEnabled: true,
      musicEnabled: true,
      animationSpeed: 'normal',
      language: 'EN',
      isOnlineMode: true,
      onlineRoomCode: roomCode,
      coinWager: room.coinWager || 0,
    };

    // Deduct entry wager for local player when starting game
    if (room.coinWager && room.coinWager > 0) {
      deductPlayerCoins(room.coinWager);
    }

    gameStateStore[roomCode] = initialGameState;
    room.status = 'PLAYING';
    room.updatedAt = Date.now();

    notifyRoomUpdate(roomCode);
    return { success: true };
  },

  syncGameState(roomCode: string, newState: GameState): void {
    const prev = JSON.stringify(gameStateStore[roomCode] || null);
    const curr = JSON.stringify(newState);
    if (prev !== curr) {
      gameStateStore[roomCode] = newState;
      notifyRoomUpdate(roomCode);
    }
  },

  sendEmote(roomCode: string, senderId: string, senderName: string, emote: string): void {
    const emoteEvent: OnlineEmoteEvent = {
      id: 'emote_' + Date.now(),
      senderId,
      senderName,
      emote,
      timestamp: Date.now(),
    };
    notifyRoomUpdate(roomCode, emoteEvent);
  },

  subscribeToRoom(
    roomCode: string,
    callback: (data: { room: OnlineRoom | null; gameState: GameState | null; emote: OnlineEmoteEvent | null }) => void
  ): () => void {
    syncStorageFromDisk();
    const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (!listeners[cleanCode]) {
      listeners[cleanCode] = new Set();
    }
    listeners[cleanCode].add(callback);

    const initialRoom = this.getRoom(cleanCode);
    const initialState = this.getGameState(cleanCode);

    callback({
      room: initialRoom,
      gameState: initialState,
      emote: null,
    });

    // Firebase WebSocket Real-Time Listeners (0ms Latency Push)
    let unsubFbRoom: (() => void) | null = null;
    let unsubFbState: (() => void) | null = null;
    try {
      unsubFbRoom = onValue(ref(db, `rooms/${cleanCode}`), snapshot => {
        if (snapshot.exists()) {
          const room = snapshot.val() as OnlineRoom;
          if (room && room.roomCode) {
            const currentLocal = JSON.stringify(roomStore[room.roomCode] || null);
            const freshCloud = JSON.stringify(room);
            if (currentLocal !== freshCloud) {
              roomStore[room.roomCode] = room;
              saveStorageToDisk();
              callback({ room, gameState: gameStateStore[room.roomCode] || null, emote: null });
            }
          }
        }
      });

      unsubFbState = onValue(ref(db, `states/${cleanCode}`), snapshot => {
        if (snapshot.exists()) {
          const state = snapshot.val() as GameState;
          if (state && state.players) {
            const localState = gameStateStore[cleanCode];
            const localVer = localState?.version || 0;
            const cloudVer = state.version || 0;
            const isNewer = cloudVer > localVer || state.gameSessionId !== localState?.gameSessionId || (cloudVer === localVer && (state.updatedAt || 0) > (localState?.updatedAt || 0));

            if (isNewer) {
              gameStateStore[cleanCode] = state;
              saveStorageToDisk();
              callback({ room: roomStore[cleanCode] || null, gameState: state, emote: null });
            }
          }
        }
      });
    } catch (e) {
      console.warn('Firebase onValue listener warning:', e);
    }

    // Cloud Polling Loop for Multi-Device Real-Time Sync Fallback
    const pollInterval = setInterval(async () => {
      try {
        // Host Heartbeat: Continuously broadcast room status while host is subscribed
        const currentLocalRoom = roomStore[cleanCode];
        if (currentLocalRoom && currentLocalRoom.hostId === getStoredPlayerId()) {
          publishRoomToCloud(cleanCode, currentLocalRoom);
        }

        const cloudRoom = await fetchRoomFromCloud(cleanCode);
        if (cloudRoom) {
          const currentLocal = JSON.stringify(roomStore[cloudRoom.roomCode] || null);
          const freshCloud = JSON.stringify(cloudRoom);
          if (currentLocal !== freshCloud) {
            roomStore[cloudRoom.roomCode] = cloudRoom;
            saveStorageToDisk();
            callback({
              room: cloudRoom,
              gameState: gameStateStore[cloudRoom.roomCode] || null,
              emote: null,
            });
          }
        }

        const cloudState = await fetchGameStateFromCloud(cleanCode);
        if (cloudState && cloudState.players) {
          const localState = gameStateStore[cleanCode];
          const localVer = localState?.version || 0;
          const cloudVer = cloudState.version || 0;
          const isNewer = cloudVer > localVer || cloudState.gameSessionId !== localState?.gameSessionId || (cloudVer === localVer && (cloudState.updatedAt || 0) > (localState?.updatedAt || 0));

          if (isNewer) {
            gameStateStore[cleanCode] = cloudState;
            saveStorageToDisk();
            callback({
              room: roomStore[cleanCode] || null,
              gameState: cloudState,
              emote: null,
            });
          }
        }
      } catch (e) {
        // Silently swallow fetch errors when offline
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
      if (unsubFbRoom) unsubFbRoom();
      if (unsubFbState) unsubFbState();
      if (listeners[cleanCode]) {
        listeners[cleanCode].delete(callback);
      }
    };
  },

  async getActiveRooms(): Promise<OnlineRoom[]> {
    syncStorageFromDisk();
    cleanStaleRooms();
    const cloudRooms = await fetchGlobalRoomsFromCloud();
    const now = Date.now();
    const MAX_AGE_MS = 15 * 60 * 1000;
    cloudRooms.forEach(r => {
      if (r && r.roomCode && (now - r.createdAt <= MAX_AGE_MS)) {
        roomStore[r.roomCode] = r;
      }
    });
    cleanStaleRooms();
    saveStorageToDisk();
    return Object.values(roomStore).filter(
      r => (r.status === 'WAITING' || r.status === 'READY') && (now - r.createdAt <= MAX_AGE_MS)
    );
  },

  getRoom(roomCode: string): OnlineRoom | null {
    syncStorageFromDisk();
    const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const matchedKey = Object.keys(roomStore).find(
      key => key.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanCode
    );
    return matchedKey ? roomStore[matchedKey] : (roomStore[roomCode] || null);
  },

  getGameState(roomCode: string): GameState | null {
    syncStorageFromDisk();
    const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const matchedKey = Object.keys(gameStateStore).find(
      key => key.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanCode
    );
    return matchedKey ? gameStateStore[matchedKey] : (gameStateStore[roomCode] || null);
  },
};
