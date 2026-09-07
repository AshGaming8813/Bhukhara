import type { Card, Combination, Player } from '../types/game';
import {
  isValidPureSeries,
  canCardFitCombination,
  canCardFitAnyTableCombination,
  sortCardsByRank,
} from './validation';

export interface AIDecision {
  action: 'DRAW_CLOSE' | 'TAKE_OPEN' | 'OPEN_COMBINATIONS' | 'DISCARD' | 'MODA' | 'HELLO';
  cardsToMeld?: Card[][];
  cardsToAdd?: Array<{ card: Card; combinationId: string }>;
  discardCard?: Card;
  openCardIndex?: number;
}

/**
 * Finds all valid pure series in a player's hand.
 */
export function findPureSeriesInHand(hand: Card[]): Card[][] {
  const pureSeriesList: Card[][] = [];
  const suits = Array.from(new Set(hand.map(c => c.suit)));

  suits.forEach(suit => {
    const suitCards = hand.filter(c => c.suit === suit && !c.isJoker);
    const sorted = sortCardsByRank(suitCards);

    // Try sub-sequences of length 3 to 7
    for (let len = 3; len <= 7; len++) {
      for (let i = 0; i <= sorted.length - len; i++) {
        const candidate = sorted.slice(i, i + len);
        if (isValidPureSeries(candidate)) {
          pureSeriesList.push(candidate);
        }
      }
    }
  });

  return pureSeriesList;
}

/**
 * Finds valid triplicates in hand (non-pure).
 */
export function findTriplicatesInHand(hand: Card[]): Card[][] {
  const triplicates: Card[][] = [];
  const ranks = Array.from(new Set(hand.map(c => c.rank)));

  ranks.forEach(rank => {
    const sameRank = hand.filter(c => c.rank === rank && !c.isJoker);
    const jokers = hand.filter(c => c.isJoker);

    if (sameRank.length >= 3) {
      triplicates.push(sameRank.slice(0, 3));
      if (sameRank.length === 4) {
        triplicates.push(sameRank);
      }
    } else if (sameRank.length === 2 && jokers.length >= 1) {
      triplicates.push([...sameRank, jokers[0]]);
    }
  });

  return triplicates;
}

/**
 * Selects the safest card for AI to discard.
 */
export function selectAIDiscardCard(hand: Card[]): Card {
  // Never discard a Joker if possible
  const nonJokers = hand.filter(c => !c.isJoker);
  const candidates = nonJokers.length > 0 ? nonJokers : hand;

  // Prefer discarding low-point singletons
  const sortedByPoints = [...candidates].sort((a, b) => a.pointValue - b.pointValue);
  return sortedByPoints[0] || hand[0];
}

/**
 * Executes full turn logic for an AI player.
 */
export function getAIDecision(
  aiPlayer: Player,
  hasDrawn: boolean,
  mustDiscard: boolean,
  teamCombinations: Combination[],
  allOpenCombinations: Combination[],
  openDeck: Card[]
): AIDecision {
  const hand = [...aiPlayer.hand];

  // 1. DRAW PHASE
  if (!hasDrawn) {
    if (openDeck.length > 0) {
      const topOpenCard = openDeck[openDeck.length - 1];
      const testHand = [...hand, topOpenCard];

      if (!aiPlayer.hasOpenedPureSeries) {
        const pSeries = findPureSeriesInHand(testHand);
        if (pSeries.length > 0) {
          return { action: 'TAKE_OPEN', openCardIndex: openDeck.length - 1 };
        }
      } else {
        const pSeries = findPureSeriesInHand(testHand);
        const trips = findTriplicatesInHand(testHand);
        if (pSeries.length > 0 || trips.length > 0) {
          return { action: 'TAKE_OPEN', openCardIndex: openDeck.length - 1 };
        }
      }
    }

    return { action: 'DRAW_CLOSE' };
  }

  // 2. MELD / MODA PHASE
  if (hasDrawn && !mustDiscard) {
    if (hand.length === 1) {
      const lastCard = hand[0];
      const fitsTable = canCardFitAnyTableCombination(lastCard, allOpenCombinations);
      if (!fitsTable) {
        return { action: 'MODA' };
      }
    }

    const melds: Card[][] = [];
    if (!aiPlayer.hasOpenedPureSeries) {
      const pureSeries = findPureSeriesInHand(hand);
      if (pureSeries.length > 0) {
        melds.push(pureSeries[0]);
      }
    } else {
      const pureSeries = findPureSeriesInHand(hand);
      if (pureSeries.length > 0) {
        melds.push(pureSeries[0]);
      }
      const trips = findTriplicatesInHand(hand);
      if (trips.length > 0) {
        melds.push(trips[0]);
      }
    }

    if (melds.length > 0) {
      return { action: 'OPEN_COMBINATIONS', cardsToMeld: melds };
    }

    const cardsToAdd: Array<{ card: Card; combinationId: string }> = [];
    for (const card of hand) {
      for (const comb of teamCombinations) {
        if (canCardFitCombination(card, comb)) {
          cardsToAdd.push({ card, combinationId: comb.id });
          break;
        }
      }
    }

    if (cardsToAdd.length > 0) {
      return { action: 'OPEN_COMBINATIONS', cardsToAdd };
    }

    const discardCard = selectAIDiscardCard(hand);
    return { action: 'DISCARD', discardCard };
  }

  const discardCard = selectAIDiscardCard(hand);
  return { action: 'DISCARD', discardCard };
}
