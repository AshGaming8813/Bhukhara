export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';

export interface SuitConfig {
  id: Suit;
  name: string;
  symbol: string;
  color: string; // CSS color string or hex
  isRed: boolean;
}

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  rankValue: number; // 2..14
  packId: 1 | 2;
  isJoker: boolean;
  pointValue: number;
  color: string;
}

export type CombinationType = 'PURE_SERIES' | 'SERIES' | 'TRIPLICATE';

export interface Combination {
  id: string;
  type: CombinationType;
  cards: Card[];
  suit: Suit | null;
  rank: Rank | null;
  ownerId: string; // Team 'A'/'B' or Player 'P1'/'P2'
  points: number;
}

export interface Player {
  id: string; // 'P1', 'P2', 'P3', 'P4'
  name: string;
  isHuman: boolean;
  team: 'A' | 'B';
  hand: Card[];
  hasOpenedPureSeries: boolean;
  hasClaimedBhukhara: boolean;
  justClaimedBhukharaThisTurn?: boolean;
  modaCount: number;
}

export type GameMode = '2P' | '4P';
export type BazziMode = 1 | 2;

export type GamePhase = 
  | 'DEAL'
  | 'DRAW'
  | 'MELD_OR_DISCARD'
  | 'MODA_PENDING'
  | 'HELLO_WAIT'
  | 'BAZZI_END'
  | 'GAME_OVER'
  | 'FOUL';

export interface ScoreDetail {
  openPoints: number;
  sevenCardBonus: number;
  modaBonus: number;
  oppositeHandPoints: number;
  total: number;
}

export interface BazziResult {
  bazziNumber: number;
  scores: Record<string, ScoreDetail>; // Key: Team 'A'/'B' or Player 'P1'/'P2'
  winnerId: string;
}

export interface GameState {
  gameMode: GameMode;
  bazziMode: BazziMode;
  currentBazzi: number;
  leadScore: Record<string, number>; // Team 'A' / 'B' accumulated leads
  bazziResults: BazziResult[];
  players: Record<string, Player>;
  playerOrder: string[]; // e.g. ['P1', 'P2', 'P3', 'P4']
  dealerIndex: number;
  currentTurnIndex: number;
  hasDrawnThisTurn: boolean;
  mustDiscard: boolean;
  closeDeck: Card[];
  openDeck: Card[];
  bhukharaPile: Card[];
  combinations: Record<string, Combination[]>; // Keyed by team 'A'/'B' or player 'P1'/'P2'
  phase: GamePhase;
  modaCount: number; // 0, 1, or 2
  lastAction: string;
  foul: {
    isFoul: boolean;
    player: string | null;
    reason: string | null;
    winnerId: string | null;
  } | null;
  winner: string | null;
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationSpeed: 'normal' | 'fast' | 'slow';
  language: 'EN' | 'HI';
  
  // Online Multiplayer & Turn Rule Tracking
  isOnlineMode?: boolean;
  onlineRoomCode?: string;
  localPlayerId?: string;
  playerSeats?: Record<string, string>; // Maps slot P1..P4 to player ID
  onlineConnected?: boolean;
  version?: number;
  currentTurnPlayerId?: string;
  gameSessionId?: string;
  updatedAt?: number;
  coinWager?: number;
  pickedFromOpenDeckThisTurn?: boolean;
  hasMeldedThisTurn?: boolean;
  claimedBhukharaThisTurn?: boolean;
}

/* Real-Time Online Multiplayer Room System Types */
export interface OnlinePlayer {
  id: string;
  displayName: string;
  seat: number; // 0..3
  slotId: 'P1' | 'P2' | 'P3' | 'P4';
  team: 'A' | 'B';
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  joinedAt: number;
  lastSeen: number;
}

export type RoomStatus = 'WAITING' | 'READY' | 'STARTING' | 'PLAYING' | 'COMPLETED' | 'CLOSED';

export interface OnlineRoom {
  roomId: string;
  roomCode: string;
  hostId: string;
  gameMode: GameMode;
  bazziMode: BazziMode;
  coinWager?: number;
  maxPlayers: number;
  status: RoomStatus;
  players: Record<string, OnlinePlayer>;
  createdAt: number;
  updatedAt: number;
}

export interface OnlineEmoteEvent {
  id: string;
  senderId: string;
  senderName: string;
  emote: string; // e.g. '👋', '👍', '😂', '😮', '🔥', '🎉', 'GG'
  timestamp: number;
}
