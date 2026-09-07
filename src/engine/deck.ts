import type { Card, Suit } from '../types/game';
import { SUIT_CONFIGS, RANKS, RANK_VALUES, CARD_POINTS, GAME_DECK_TOTAL } from '../constants/gameConfig';

const STANDARD_SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

/**
 * Validates and sanitizes a deck according to strict 104-card (2 standard packs) rules.
 * Ensures NO Eagle or 5th suit cards exist.
 */
export function validateAndSanitizeDeck(deck: Card[]): Card[] {
  // Filter out any non-standard or 5th suit cards
  const validCards = deck.filter(c => STANDARD_SUITS.includes(c.suit));

  if (validCards.length !== GAME_DECK_TOTAL) {
    console.warn(`Deck validation warning: Expected ${GAME_DECK_TOTAL} cards, found ${validCards.length}`);
  }

  return validCards;
}

/**
 * Creates exactly 104 cards = 2 standard 52-card packs.
 * Pack 1: Hearts, Diamonds, Clubs, Spades (52 cards)
 * Pack 2: Hearts, Diamonds, Clubs, Spades (52 cards)
 * Total: 13 ranks × 4 suits × 2 packs = 104 cards.
 * Rank 2 is always Joker (8 physical 2 cards total).
 */
export function createDeck(): Card[] {
  const cards: Card[] = [];

  // Generate Pack 1 (52 cards)
  STANDARD_SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      const config = SUIT_CONFIGS[suit];
      const isJoker = rank === '2';
      cards.push({
        id: `card_p1_${suit.toLowerCase()}_${rank}`,
        suit,
        rank,
        rankValue: RANK_VALUES[rank],
        packId: 1,
        isJoker,
        pointValue: CARD_POINTS[rank],
        color: config.color,
      });
    });
  });

  // Generate Pack 2 (52 cards)
  STANDARD_SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      const config = SUIT_CONFIGS[suit];
      const isJoker = rank === '2';
      cards.push({
        id: `card_p2_${suit.toLowerCase()}_${rank}`,
        suit,
        rank,
        rankValue: RANK_VALUES[rank],
        packId: 2,
        isJoker,
        pointValue: CARD_POINTS[rank],
        color: config.color,
      });
    });
  });

  return validateAndSanitizeDeck(cards);
}

/**
 * Shuffles an array of cards using Fisher-Yates shuffle algorithm.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface DealResult {
  playerHands: Record<string, Card[]>;
  bhukharaPile: Card[];
  closeDeck: Card[];
  openDeck: Card[];
}

/**
 * Deals cards according to Bhukhara rules:
 * 2-Player: P1 (13), P2 (13), Bhukhara (13). Close Deck = 64, Open Deck = 1. (Total = 104)
 * 4-Player: P1 (13), P2 (13), P3 (13), P4 (13), Bhukhara (13). Close Deck = 38, Open Deck = 1. (Total = 104)
 */
export function dealCards(mode: '2P' | '4P', deck: Card[]): DealResult {
  const sanitized = validateAndSanitizeDeck(deck);
  const shuffled = shuffleDeck(sanitized);
  let cursor = 0;

  const playerIds = mode === '2P' ? ['P1', 'P2'] : ['P1', 'P2', 'P3', 'P4'];
  const playerHands: Record<string, Card[]> = {};

  playerIds.forEach(id => {
    playerHands[id] = shuffled.slice(cursor, cursor + 13);
    cursor += 13;
  });

  const bhukharaPile = shuffled.slice(cursor, cursor + 13);
  cursor += 13;

  const initialOpenCard = shuffled[cursor];
  cursor += 1;

  const closeDeck = shuffled.slice(cursor);

  return {
    playerHands,
    bhukharaPile,
    closeDeck,
    openDeck: [initialOpenCard],
  };
}
