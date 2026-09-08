import type { Card, Combination, Suit } from '../types/game';

/**
 * Helper: Sort cards by rankValue ascending.
 */
export function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.rankValue - b.rankValue);
}

/**
 * Helper: Sort cards by suit, then by rankValue.
 */
export function sortCardsBySuit(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    HEARTS: 1,
    DIAMONDS: 2,
    CLUBS: 3,
    SPADES: 4,
  };
  return [...cards].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.rankValue - b.rankValue;
  });
}

/**
 * Validates if a set of cards forms a PURE SAME-COLOUR SERIES.
 * Rules:
 * - 3 to 7 cards
 * - All cards same suit
 * - NO Jokers allowed
 * - Strictly consecutive rank values
 */
export function isValidPureSeries(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 7) return false;

  // Check no Jokers
  if (cards.some(c => c.isJoker)) return false;

  // Check all same suit
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;

  // Sort by rank value
  const sorted = sortCardsByRank(cards);

  // Check strictly consecutive rank values
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1].rankValue - sorted[i].rankValue !== 1) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if a set of cards forms a valid SERIES (allowing up to 1 Joker).
 * Rules:
 * - Minimum 3 cards
 * - All non-Joker cards must be of the SAME suit
 * - MAXIMUM 1 Joker per series
 * - Cards (with Joker substitution) must form a consecutive sequence
 */
export function isValidSeries(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 7) return false;

  const jokers = cards.filter(c => c.isJoker);
  if (jokers.length > 1) return false; // Maximum 1 Joker per combination!

  const nonJokers = cards.filter(c => !c.isJoker);
  if (nonJokers.length === 0) return false;

  // All non-jokers must share the same suit
  const suit = nonJokers[0].suit;
  if (!nonJokers.every(c => c.suit === suit)) return false;

  const sortedNonJokers = sortCardsByRank(nonJokers);

  // Check for duplicate ranks among non-jokers
  for (let i = 0; i < sortedNonJokers.length - 1; i++) {
    if (sortedNonJokers[i + 1].rankValue === sortedNonJokers[i].rankValue) {
      return false;
    }
  }

  if (jokers.length === 0) {
    // Pure series check
    for (let i = 0; i < sortedNonJokers.length - 1; i++) {
      if (sortedNonJokers[i + 1].rankValue - sortedNonJokers[i].rankValue !== 1) {
        return false;
      }
    }
    return true;
  } else {
    // 1 Joker present: total gap between consecutive non-jokers must be <= 1 (filled by Joker)
    // or Joker attached at either end of consecutive sequence
    let gaps = 0;
    for (let i = 0; i < sortedNonJokers.length - 1; i++) {
      const diff = sortedNonJokers[i + 1].rankValue - sortedNonJokers[i].rankValue;
      if (diff === 2) {
        gaps += 1;
      } else if (diff !== 1) {
        return false; // Gap too large
      }
    }
    return gaps <= 1;
  }
}

/**
 * Validates if a set of cards forms a TRIPLICATE (allowing up to 1 Joker).
 * Rules:
 * - Minimum 3 cards, Maximum 7 cards
 * - Non-joker cards must have the SAME rank
 * - MAXIMUM 1 Joker per triplicate
 */
export function isValidTriplicate(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 7) return false;

  const jokers = cards.filter(c => c.isJoker);
  if (jokers.length > 1) return false; // Maximum 1 Joker!

  const nonJokers = cards.filter(c => !c.isJoker);
  if (nonJokers.length === 0) return false;

  const targetRank = nonJokers[0].rank;
  return nonJokers.every(c => c.rank === targetRank);
}

/**
 * Determines if multiple cards (1, 2, or more) can legally fit into an existing open combination on the table.
 */
export function canCardsFitCombination(cardsToAdd: Card[], combination: Combination): boolean {
  if (!cardsToAdd || cardsToAdd.length === 0) return false;
  const combined = sortCardsByRank([...combination.cards, ...cardsToAdd]);
  if (combined.length > 7) return false; // Max 7 cards in a combination

  const totalJokers = combined.filter(c => c.isJoker).length;
  if (totalJokers > 1) return false; // Max 1 Joker per combination

  if (combination.type === 'PURE_SERIES' || combination.type === 'SERIES') {
    return isValidSeries(combined);
  }

  if (combination.type === 'TRIPLICATE') {
    return isValidTriplicate(combined);
  }

  return false;
}

/**
 * Determines if a card can legally fit into an existing open combination on the table.
 * Crucial for MODA FOUL validation!
 */
export function canCardFitCombination(card: Card, combination: Combination): boolean {
  if (!card) return false;
  return canCardsFitCombination([card], combination);
}

/**
 * Checks whether a single card can fit into ANY open combination on the table.
 * Used for MODA validation.
 */
export function canCardFitAnyTableCombination(card: Card, allCombinations: Combination[]): boolean {
  return allCombinations.some(comb => canCardFitCombination(card, comb));
}

export interface ModaValidationResult {
  isValid: boolean;
  isFoul: boolean;
  reason?: string;
}

/**
 * Validates a MODA declaration.
 * A player must have EXACTLY 1 card in hand.
 * That 1 card must NOT fit into any open combination on the table.
 */
export function validateModa(
  remainingHandCard: Card,
  allOpenCombinations: Combination[]
): ModaValidationResult {
  // RULE: If the single remaining card in hand is a Joker (e.g. 2 or Red/Black Joker),
  // Moda with this Joker is ALWAYS ALLOWED and is NOT a foul!
  if (remainingHandCard.isJoker) {
    return {
      isValid: true,
      isFoul: false,
    };
  }

  const canFit = canCardFitAnyTableCombination(remainingHandCard, allOpenCombinations);
  if (canFit) {
    return {
      isValid: false,
      isFoul: true,
      reason: `Invalid Moda Foul! The card (${remainingHandCard.rank} ${remainingHandCard.suit}) can legally fit into an existing open combination on the table.`,
    };
  }

  return {
    isValid: true,
    isFoul: false,
  };
}

export interface JokerCompletionTarget {
  combinationId: string;
  combination: Combination;
  jokerCard: Card;
  scoreValue: number; // 20 or 10
  isSameSuitSeries: boolean;
}

/**
 * Checks if a Joker card can legally complete any existing 6-card combination to 7 cards.
 * Returns priority-sorted list of valid completion targets.
 */
export function findJokerCompletionTargets(
  jokerCard: Card,
  targetCombinations: Combination[]
): JokerCompletionTarget[] {
  if (!jokerCard || !jokerCard.isJoker || !targetCombinations || targetCombinations.length === 0) {
    return [];
  }

  const targets: JokerCompletionTarget[] = [];

  for (const comb of targetCombinations) {
    if (!comb || !comb.cards || comb.cards.length !== 6) {
      continue;
    }

    // Must not already contain a Joker (max 1 Joker per combination rule)
    const existingJokers = comb.cards.filter(c => c.isJoker).length;
    if (existingJokers > 0) {
      continue;
    }

    const candidateCards = [...comb.cards, jokerCard];

    if (comb.type === 'PURE_SERIES' || comb.type === 'SERIES') {
      if (isValidSeries(candidateCards)) {
        const nonJokers = comb.cards.filter(c => !c.isJoker);
        const seriesSuit = nonJokers[0]?.suit || comb.suit;
        const isSameSuit = seriesSuit && jokerCard.suit === seriesSuit;
        const scoreValue = isSameSuit ? 20 : 10;

        targets.push({
          combinationId: comb.id,
          combination: comb,
          jokerCard,
          scoreValue,
          isSameSuitSeries: !!isSameSuit,
        });
      }
    } else if (comb.type === 'TRIPLICATE') {
      if (isValidTriplicate(candidateCards)) {
        targets.push({
          combinationId: comb.id,
          combination: comb,
          jokerCard,
          scoreValue: 10,
          isSameSuitSeries: false,
        });
      }
    }
  }

  // Priority sorting (Part 7):
  // 1. Higher scoreValue (20 before 10)
  // 2. Same-suit series (true before false)
  // 3. Deterministic tie-breaker by combinationId ascending
  targets.sort((a, b) => {
    if (b.scoreValue !== a.scoreValue) {
      return b.scoreValue - a.scoreValue;
    }
    if (a.isSameSuitSeries !== b.isSameSuitSeries) {
      return a.isSameSuitSeries ? -1 : 1;
    }
    return a.combinationId.localeCompare(b.combinationId);
  });

  return targets;
}

/**
 * Checks if a player holding a Joker in hand can complete any available team combination to 7 cards.
 */
export function canJokerCompleteSevenCardCombination(
  jokerCard: Card,
  teamCombinations: Combination[]
): JokerCompletionTarget | null {
  const targets = findJokerCompletionTargets(jokerCard, teamCombinations);
  return targets.length > 0 ? targets[0] : null;
}
