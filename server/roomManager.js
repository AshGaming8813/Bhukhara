import { dbStore } from './store.js';

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room object
    this.sockets = new Map(); // socket -> { userId, roomId }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom({ hostUser, gameMode = '2P', bazziMode = 1, coinWager = 0 }) {
    // Verify host coin balance if wager > 0
    if (coinWager > 0) {
      const dbUser = dbStore.getUserById(hostUser.id || hostUser.userId);
      const userBalance = dbUser ? dbUser.coin_balance : 0;
      if (userBalance < coinWager) {
        throw new Error(`Insufficient coin balance. You need at least ${coinWager} coins to create this room.`);
      }
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let roomCode = this.generateRoomCode();
    while (Array.from(this.rooms.values()).some(r => r.roomCode === roomCode)) {
      roomCode = this.generateRoomCode();
    }

    const maxPlayers = gameMode === '4P' ? 4 : 2;
    const hostId = hostUser.id || hostUser.userId;

    const hostPlayer = {
      id: hostId,
      displayName: hostUser.username || hostUser.name || 'Player 1',
      seat: 0,
      slotId: 'P1',
      team: 'A',
      isHost: true,
      isReady: true,
      connected: true,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    const room = {
      roomId,
      roomCode,
      hostId,
      gameMode,
      bazziMode,
      coinWager: Number(coinWager) || 0,
      maxPlayers,
      status: 'WAITING',
      players: {
        [hostId]: hostPlayer,
      },
      gameState: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomIdOrCode) {
    if (this.rooms.has(roomIdOrCode)) {
      return this.rooms.get(roomIdOrCode);
    }
    for (const room of this.rooms.values()) {
      if (room.roomCode.toUpperCase() === roomIdOrCode.toUpperCase()) {
        return room;
      }
    }
    return null;
  }

  listPublicRooms() {
    const list = [];
    for (const room of this.rooms.values()) {
      if (room.status === 'WAITING' || room.status === 'READY') {
        const pCount = Object.keys(room.players).length;
        const hostPlayer = room.players[room.hostId];
        list.push({
          roomId: room.roomId,
          roomCode: room.roomCode,
          hostName: hostPlayer ? hostPlayer.displayName : 'Unknown',
          gameMode: room.gameMode,
          bazziMode: room.bazziMode,
          coinWager: room.coinWager,
          playerCount: pCount,
          maxPlayers: room.maxPlayers,
          status: room.status,
          createdAt: room.createdAt,
        });
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  joinRoom({ roomCode, user }) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found. Please verify the 6-character Room Code.');
    }

    if (room.status === 'PLAYING' || room.status === 'COMPLETED') {
      throw new Error('This room has already started or completed a match.');
    }

    const userId = user.id || user.userId;
    const existingPlayer = room.players[userId];

    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.lastSeen = Date.now();
      return room;
    }

    const currentCount = Object.keys(room.players).length;
    if (currentCount >= room.maxPlayers) {
      throw new Error(`Room is full (${room.maxPlayers}/${room.maxPlayers} players).`);
    }

    // Check wager coin requirement
    if (room.coinWager > 0) {
      const dbUser = dbStore.getUserById(userId);
      const userBalance = dbUser ? dbUser.coin_balance : 0;
      if (userBalance < room.coinWager) {
        throw new Error(`Insufficient coin balance. You need at least ${room.coinWager} coins to join this room (Current balance: ${userBalance} coins).`);
      }
    }

    const assignedSeat = currentCount;
    const slotId = `P${assignedSeat + 1}`;
    const team = (assignedSeat % 2 === 0) ? 'A' : 'B';

    const newPlayer = {
      id: userId,
      displayName: user.username || user.name || `Player ${assignedSeat + 1}`,
      seat: assignedSeat,
      slotId,
      team,
      isHost: false,
      isReady: false,
      connected: true,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    room.players[userId] = newPlayer;
    if (Object.keys(room.players).length === room.maxPlayers) {
      room.status = 'READY';
    }
    room.updatedAt = Date.now();
    return room;
  }

  toggleReady(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const player = room.players[userId];
    if (player) {
      player.isReady = !player.isReady;
      room.updatedAt = Date.now();
    }
    return room;
  }

  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    delete room.players[userId];
    const remaining = Object.keys(room.players);

    if (remaining.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // If host left, reassign host to next player
    if (room.hostId === userId) {
      const nextHostId = remaining[0];
      room.hostId = nextHostId;
      room.players[nextHostId].isHost = true;
      room.players[nextHostId].isReady = true;
    }

    if (room.status === 'READY') {
      room.status = 'WAITING';
    }
    room.updatedAt = Date.now();
    return room;
  }

  updateGameState(roomId, newState) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.gameState = newState;
    room.updatedAt = Date.now();
    return room;
  }
}

export const roomManager = new RoomManager();
