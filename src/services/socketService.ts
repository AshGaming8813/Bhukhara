import type { OnlineRoom, GameState, OnlineEmoteEvent } from '../types/game';
import { syncDataWithBackendServer } from './authBackend';

type RoomCallback = (room: OnlineRoom) => void;
type GameStateCallback = (gameState: GameState) => void;
type EmoteCallback = (emoteEvent: OnlineEmoteEvent) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;

  private roomListeners: Set<RoomCallback> = new Set();
  private gameStateListeners: Set<GameStateCallback> = new Set();
  private emoteListeners: Set<EmoteCallback> = new Set();

  private reconnectTimer: any = null;

  private getSocketUrl(): string {
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:3001/ws`;
  }

  public connect(_userId?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.getSocketUrl());

      this.ws.onopen = () => {
        console.log('⚡ Connected to Bhukhara WebSocket Server');
        if (this.currentRoomId && this.currentUserId) {
          this.subscribeRoom(this.currentRoomId, this.currentUserId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, data } = parsed;

          if (type === 'ROOM_UPDATED' && data?.room) {
            this.roomListeners.forEach(cb => cb(data.room));
          } else if (type === 'GAME_STATE_UPDATED' && data?.gameState) {
            this.gameStateListeners.forEach(cb => cb(data.gameState));
          } else if (type === 'EMOTE_RECEIVED' && data?.emoteEvent) {
            this.emoteListeners.forEach(cb => cb(data.emoteEvent));
          } else if (type === 'PLAYER_REGISTERED') {
            syncDataWithBackendServer();
          }
        } catch (e) {
          console.error('Socket message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected. Attempting reconnect in 3s...');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (err) {
      console.warn('WebSocket initialization failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.currentUserId || undefined);
    }, 3000);
  }

  public subscribeRoom(roomId: string, userId: string): void {
    this.currentRoomId = roomId;
    this.currentUserId = userId;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect(userId);
    }

    this.send('SUBSCRIBE_ROOM', { roomId, userId });
  }

  public toggleReady(roomId: string, userId: string): void {
    this.send('TOGGLE_READY', { roomId, userId });
  }

  public startGame(roomId: string, gameState: GameState): void {
    this.send('START_GAME', { roomId, gameState });
  }

  public sendGameAction(roomId: string, gameState: GameState): void {
    this.send('GAME_ACTION', { roomId, gameState });
  }

  public sendEmote(roomId: string, senderId: string, senderName: string, emote: string): void {
    this.send('SEND_EMOTE', { roomId, senderId, senderName, emote });
  }

  public settleWager(roomId: string, winnerId: string, coinWager: number): void {
    this.send('SETTLE_GAME_WAGER', { roomId, winnerId, coinWager });
  }

  private send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn(`Socket not connected. Queuing connect for action ${type}`);
      this.connect();
    }
  }

  public onRoomUpdate(cb: RoomCallback): () => void {
    this.roomListeners.add(cb);
    return () => this.roomListeners.delete(cb);
  }

  public onGameStateUpdate(cb: GameStateCallback): () => void {
    this.gameStateListeners.add(cb);
    return () => this.gameStateListeners.delete(cb);
  }

  public onEmote(cb: EmoteCallback): () => void {
    this.emoteListeners.add(cb);
    return () => this.emoteListeners.delete(cb);
  }
}

export const socketService = new SocketService();
