import type { Suit, SuitConfig, Rank } from '../types/game';

export const SUIT_CONFIGS: Record<Suit, SuitConfig> = {
  HEARTS: { id: 'HEARTS', name: 'Hearts', symbol: '♥', color: '#e74c3c', isRed: true },
  DIAMONDS: { id: 'DIAMONDS', name: 'Diamonds', symbol: '♦', color: '#e74c3c', isRed: true },
  CLUBS: { id: 'CLUBS', name: 'Clubs', symbol: '♣', color: '#2c3e50', isRed: false },
  SPADES: { id: 'SPADES', name: 'Spades', symbol: '♠', color: '#2c3e50', isRed: false },
};

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export const CARD_POINTS: Record<Rank, number> = {
  '3': 0.5,
  '4': 0.5,
  '5': 0.5,
  '6': 0.5,
  '7': 0.5,
  '8': 1.0,
  '9': 1.0,
  '10': 1.0,
  'J': 1.0,
  'Q': 1.0,
  'K': 1.0,
  'A': 1.5,
  '2': 1.0, // Joker card point value
};

export const GAME_DECK_TOTAL = 104;
export const PLAYER_HAND_SIZE = 13;
export const BHUKHARA_PILE_SIZE = 13;

export const MODA_BONUS = 5; // +5 points for 1st Moda, +5 points for 2nd Moda

export const SCORING_7_CARD = {
  PURE: 20,              // Pure complete 7-card series
  SAME_COLOR_JOKER: 20,  // 7-card series using same-colour Joker
  DIFF_COLOR_JOKER: 10,  // 7-card series using different-colour Joker
};
