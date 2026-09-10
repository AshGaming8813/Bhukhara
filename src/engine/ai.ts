import type { Card, Combination, Player, GameState, AIDifficulty } from '../types/game';
import {
  isValidPureSeries,
  isValidSeries,
  canCardFitCombination,
  canCardFitAnyTableCombination,
  sortCardsByRank,
  validateModa,
} from './validation';

export interface AIDecision {
  action: 'DRAW_CLOSE' | 'TAKE_OPEN' | 'OPEN_COMBINATIONS' | 'DISCARD' | 'MODA' | 'HELLO';
  cardsToMeld?: Card[][];
  cardsToAdd?: Array<{ card: Card; combinationId: string }>;
  discardCard?: Card;
  openCardIndex?: number;
  thinkingDelayMs?: number;
  reasonLog?: string;
}

// ----------------------------------------------------
// 1. CARD COUNTING & PUBLIC MEMORY SYSTEM (104 Cards)
// ----------------------------------------------------

/**
 * Builds a public memory map of all cards visible on table, in AI hand, or discarded.
 * Strictly uses PUBLIC information (no hidden deck access).
 */
export function getPublicSeenCardCounts(
  allCombinations: Combination[],
  openDeck: Card[],
  aiHand: Card[]
): Map<string, number> {
  const seenMap = new Map<string, number>();

  const countCard = (c: Card) => {
    if (!c || c.isJoker) return;
    const key = `${c.rank}_${c.suit}`;
    seenMap.set(key, (seenMap.get(key) || 0) + 1);
  };

  // 1. AI Hand
  aiHand.forEach(countCard);

  // 2. Open Deck
  openDeck.forEach(countCard);

  // 3. Open Combinations on Table
  allCombinations.forEach(comb => {
    if (comb && Array.isArray(comb.cards)) {
      comb.cards.forEach(countCard);
    }
  });

  return seenMap;
}

/**
 * Calculates remaining unknown copies in the 104-card deck (2 copies per card).
 */
export function getRemainingUnknownCopies(
  rank: string,
  suit: string,
  seenMap: Map<string, number>
): number {
  const key = `${rank}_${suit}`;
  const seen = seenMap.get(key) || 0;
  return Math.max(0, 2 - seen);
}

// ----------------------------------------------------
// 2. PATTERN SEARCH & MELD FINDERS
// ----------------------------------------------------

/**
 * Finds all valid PURE Series in hand (3-7 cards, 0 Jokers).
 */
export function findPureSeriesInHand(hand: Card[]): Card[][] {
  const pureSeriesList: Card[][] = [];
  const suits = Array.from(new Set(hand.map(c => c.suit)));

  suits.forEach(suit => {
    const suitCards = hand.filter(c => c.suit === suit && !c.isJoker);
    const sorted = sortCardsByRank(suitCards);

    for (let len = 7; len >= 3; len--) {
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
 * Finds all valid Series in hand (allowing up to 1 Joker).
 */
export function findSameSuitSeriesInHand(hand: Card[]): Card[][] {
  const seriesList: Card[][] = [];
  const suits = Array.from(new Set(hand.map(c => c.suit)));
  const jokers = hand.filter(c => c.isJoker);

  suits.forEach(suit => {
    const suitCards = hand.filter(c => c.suit === suit && !c.isJoker);
    const sorted = sortCardsByRank(suitCards);

    // Pure series first
    for (let len = 7; len >= 3; len--) {
      for (let i = 0; i <= sorted.length - len; i++) {
        const candidate = sorted.slice(i, i + len);
        if (isValidPureSeries(candidate)) {
          seriesList.push(candidate);
        }
      }
    }

    // Series with 1 Joker if available
    if (jokers.length >= 1) {
      const joker = jokers[0];
      for (let len = 3; len <= 7; len++) {
        for (let i = 0; i <= sorted.length - (len - 1); i++) {
          const sub = sorted.slice(i, i + len - 1);
          const candidate = [...sub, joker];
          if (isValidSeries(candidate)) {
            seriesList.push(candidate);
          }
        }
      }
    }
  });

  return seriesList;
}

/**
 * Finds all valid Triplicates in hand (3-4 cards, max 1 Joker).
 */
export function findTriplicatesInHand(hand: Card[]): Card[][] {
  const triplicates: Card[][] = [];
  const ranks = Array.from(new Set(hand.map(c => c.rank)));

  ranks.forEach(rank => {
    const sameRank = hand.filter(c => c.rank === rank && !c.isJoker);
    const jokers = hand.filter(c => c.isJoker);

    if (sameRank.length >= 3) {
      if (sameRank.length >= 4) {
        triplicates.push(sameRank.slice(0, 4));
      }
      triplicates.push(sameRank.slice(0, 3));
    } else if (sameRank.length === 2 && jokers.length >= 1) {
      triplicates.push([...sameRank, jokers[0]]);
    }
  });

  return triplicates;
}

// ----------------------------------------------------
// 3. SMART DISCARD EVALUATION ENGINE
// ----------------------------------------------------

/**
 * Scores a card in AI's hand for KEEP value.
 * Higher Keep Score = DO NOT DISCARD.
 * Lowest Keep Score = BEST CARD TO DISCARD.
 */
export function evaluateCardKeepScore(
  card: Card,
  hand: Card[],
  hasOpenedPureSeries: boolean,
  teamCombinations: Combination[],
  opponentCombinations: Combination[],
  seenMap: Map<string, number>,
  difficulty: AIDifficulty = 'MASTER'
): number {
  // 1. Jokers are extremely valuable
  if (card.isJoker) {
    return 9999; // Almost NEVER discard a Joker
  }

  let keepScore = 0;

  // Easy mode = basic random/points scoring
  if (difficulty === 'EASY') {
    return card.pointValue * 5;
  }

  // 2. Part of an existing complete meld in hand
  const pureSeriesInHand = findPureSeriesInHand(hand);
  const sameSuitSeriesInHand = findSameSuitSeriesInHand(hand);
  const triplicatesInHand = findTriplicatesInHand(hand);

  const inPure = pureSeriesInHand.some(list => list.some(c => c.id === card.id));
  const inSeries = sameSuitSeriesInHand.some(list => list.some(c => c.id === card.id));
  const inTrip = triplicatesInHand.some(list => list.some(c => c.id === card.id));

  if (!hasOpenedPureSeries && inPure) {
    keepScore += 400; // Must protect initial Pure Series opening!
  } else if (inSeries || inTrip) {
    keepScore += 250;
  }

  // 3. Fits existing team table combinations
  for (const comb of teamCombinations) {
    if (canCardFitCombination(card, comb)) {
      keepScore += 180;
      break;
    }
  }

  // 4. Pair / Connector Potential
  const sameRankSameSuit = hand.filter(c => c.rank === card.rank && c.suit === card.suit && c.id !== card.id);
  const sameRankDiffSuit = hand.filter(c => c.rank === card.rank && c.id !== card.id);

  if (sameRankDiffSuit.length >= 1) {
    const unknownThird = getRemainingUnknownCopies(card.rank, card.suit, seenMap);
    keepScore += 120 + (unknownThird > 0 ? 30 : 0); // High value pair for Triplicate!
  }

  if (sameRankSameSuit.length >= 1) {
    keepScore += 90;
  }

  // 5. Consecutive / Gap Series Connectors
  const sameSuitCards = hand.filter(c => c.suit === card.suit && !c.isJoker && c.id !== card.id);
  sameSuitCards.forEach(other => {
    const diff = Math.abs(other.rankValue - card.rankValue);
    if (diff === 1) {
      keepScore += 110; // Continuous connector e.g. 5♥ 6♥
    } else if (diff === 2) {
      keepScore += 80;  // 1-gap connector e.g. 4♥ 6♥
    }
  });

  // 6. Moda Safety Protection (Hand size <= 3)
  if (hand.length <= 3) {
    const fitsAnyTable = canCardFitAnyTableCombination(card, [...teamCombinations, ...opponentCombinations]);
    if (!fitsAnyTable) {
      keepScore += 150; // Protect legal Moda card!
    }
  }

  // 7. Danger to Opponent (Master AI Defense)
  if (difficulty === 'MASTER' || difficulty === 'HARD') {
    let opponentDangerScore = 0;
    opponentCombinations.forEach(comb => {
      if (canCardFitCombination(card, comb)) {
        opponentDangerScore += 70; // Discarding this would help opponent extend combinations!
      }
    });

    keepScore += opponentDangerScore;
  }

  return keepScore;
}

/**
 * Selects the absolute best card for AI to discard based on keep scores.
 */
export function selectSmartAIDiscardCard(
  hand: Card[],
  hasOpenedPureSeries: boolean,
  teamCombinations: Combination[],
  allOpenCombinations: Combination[],
  seenMap: Map<string, number>,
  difficulty: AIDifficulty = 'MASTER'
): Card {
  if (!hand || hand.length === 0) return hand[0];

  // Evaluate keep score for every card in hand
  const scored = hand.map(card => {
    const opponentCombs = allOpenCombinations.filter(c => !teamCombinations.some(tc => tc.id === c.id));
    const score = evaluateCardKeepScore(
      card,
      hand,
      hasOpenedPureSeries,
      teamCombinations,
      opponentCombs,
      seenMap,
      difficulty
    );
    return { card, score };
  });

  // Sort by Keep Score ASCENDING -> Lowest Keep Score is best to discard!
  scored.sort((a, b) => a.score - b.score);

  return scored[0].card;
}

// ----------------------------------------------------
// 4. OPEN DECK PICKUP EVALUATION ENGINE
// ----------------------------------------------------

/**
 * Evaluates whether taking cards from the Open Deck is beneficial AND legally valid (compulsory play rule).
 */
export function evaluateOpenDeckPickup(
  hand: Card[],
  openDeck: Card[],
  hasOpenedPureSeries: boolean,
  teamCombinations: Combination[],
  _allOpenCombinations: Combination[],
  _difficulty: AIDifficulty = 'MASTER'
): { shouldTake: boolean; openCardIndex?: number; netBenefit?: number } {
  if (!openDeck || openDeck.length === 0) return { shouldTake: false };

  let bestIndex = -1;
  let bestNetBenefit = -999;

  for (let k = openDeck.length - 1; k >= Math.max(0, openDeck.length - 5); k--) {
    const pickupCards = openDeck.slice(k);
    const hypotheticalHand = [...hand, ...pickupCards];

    // COMPULSORY PLAY CHECK: Pickup MUST enable opening a new series/triplicate or adding to team combinations on THIS turn!
    let canMeldOnThisTurn = false;
    let meldValue = 0;

    if (!hasOpenedPureSeries) {
      const pureSeries = findPureSeriesInHand(hypotheticalHand);
      if (pureSeries.length > 0) {
        canMeldOnThisTurn = true;
        meldValue += 200; // Unlocks initial opening!
      }
    } else {
      const pureSeries = findPureSeriesInHand(hypotheticalHand);
      const sameSuitSeries = findSameSuitSeriesInHand(hypotheticalHand);
      const triplicates = findTriplicatesInHand(hypotheticalHand);

      if (pureSeries.length > 0 || sameSuitSeries.length > 0 || triplicates.length > 0) {
        canMeldOnThisTurn = true;
        meldValue += 120;
      }

      // Check if pickup enables adding to team combinations
      for (const card of pickupCards) {
        for (const comb of teamCombinations) {
          if (canCardFitCombination(card, comb)) {
            canMeldOnThisTurn = true;
            meldValue += 90;
            break;
          }
        }
      }
    }

    // IF PICKUP CANNOT MELD ON THIS TURN -> REJECT TO PREVENT OPEN DECK COMPULSORY PLAY FOUL!
    if (!canMeldOnThisTurn) {
      continue;
    }

    // Calculate junk penalty for useless cards picked up in sequence
    const junkCount = pickupCards.length - 1; // Cards prior to target
    const junkPenalty = junkCount * 25;

    const netBenefit = meldValue - junkPenalty;
    if (netBenefit > bestNetBenefit) {
      bestNetBenefit = netBenefit;
      bestIndex = k;
    }
  }

  // Compare best pickup net benefit vs expected value of Close Deck (~35)
  if (bestIndex !== -1 && bestNetBenefit >= 40) {
    return { shouldTake: true, openCardIndex: bestIndex, netBenefit: bestNetBenefit };
  }

  return { shouldTake: false };
}

// ----------------------------------------------------
// 5. MAIN AI TURN DECISION ENGINE
// ----------------------------------------------------

/**
 * Executes master-level AI turn evaluation strictly adhering to Bhukhara rules and public information.
 */
export function getAIDecision(
  aiPlayer: Player,
  hasDrawn: boolean,
  _mustDiscard: boolean,
  teamCombinations: Combination[],
  allOpenCombinations: Combination[],
  openDeck: Card[],
  gameState?: GameState,
  difficulty: AIDifficulty = 'MASTER'
): AIDecision {
  const hand = [...aiPlayer.hand];
  const seenMap = getPublicSeenCardCounts(allOpenCombinations, openDeck, hand);
  const thinkingDelayMs = difficulty === 'MASTER' ? 1400 : difficulty === 'HARD' ? 1000 : difficulty === 'MEDIUM' ? 700 : 500;

  // ----------------------------------------------------
  // PHASE 1: DRAW DECISION (Close Deck vs Open Deck)
  // ----------------------------------------------------
  if (!hasDrawn) {
    const pickupEval = evaluateOpenDeckPickup(
      hand,
      openDeck,
      aiPlayer.hasOpenedPureSeries,
      teamCombinations,
      allOpenCombinations,
      difficulty
    );

    if (pickupEval.shouldTake && pickupEval.openCardIndex !== undefined) {
      return {
        action: 'TAKE_OPEN',
        openCardIndex: pickupEval.openCardIndex,
        thinkingDelayMs,
        reasonLog: `[AI MASTER] Pickup Open Deck index ${pickupEval.openCardIndex} (Net Benefit: +${pickupEval.netBenefit})`,
      };
    }

    return {
      action: 'DRAW_CLOSE',
      thinkingDelayMs,
      reasonLog: `[AI MASTER] Draw from Close Deck (Safe tactical choice)`,
    };
  }

  // ----------------------------------------------------
  // PHASE 2: BHUKHARA CLAIM / SAY HELLO CHECK
  // ----------------------------------------------------
  const isBhukharaClaimActive = !!aiPlayer.justClaimedBhukharaThisTurn || !!gameState?.claimedBhukharaThisTurn;

  // ----------------------------------------------------
  // PHASE 3: MODA EVALUATION (Hand Size === 1)
  // ----------------------------------------------------
  if (hand.length === 1) {
    const lastCard = hand[0];
    const modaCheck = validateModa(lastCard, teamCombinations);

    if (modaCheck.isValid) {
      return {
        action: 'MODA',
        thinkingDelayMs,
        reasonLog: `[AI MASTER] Valid Moda Opportunity! Card ${lastCard.rank}${lastCard.suit} cannot fit table combinations. Declaring Moda!`,
      };
    } else {
      console.warn(`[AI MASTER] Moda Rejected to Prevent Foul: Card ${lastCard.rank}${lastCard.suit} fits table combination.`);
    }
  }

  // ----------------------------------------------------
  // PHASE 4: COMBINATION OPENINGS & ADDITIONS
  // ----------------------------------------------------
  const melds: Card[][] = [];

  if (!aiPlayer.hasOpenedPureSeries) {
    // MUST open Pure Same-Colour Series first (3-7 cards, 0 Jokers)
    const pureSeriesList = findPureSeriesInHand(hand);
    if (pureSeriesList.length > 0) {
      melds.push(pureSeriesList[0]);
    }
  } else {
    // Opened Pure Series -> Can open Series or Triplicates
    const pureSeriesList = findPureSeriesInHand(hand);
    const sameSuitSeriesList = findSameSuitSeriesInHand(hand);
    const triplicatesList = findTriplicatesInHand(hand);

    if (pureSeriesList.length > 0) {
      melds.push(pureSeriesList[0]);
    } else if (sameSuitSeriesList.length > 0) {
      melds.push(sameSuitSeriesList[0]);
    }

    if (triplicatesList.length > 0) {
      melds.push(triplicatesList[0]);
    }
  }

  if (melds.length > 0) {
    return {
      action: 'OPEN_COMBINATIONS',
      cardsToMeld: melds,
      thinkingDelayMs,
      reasonLog: `[AI MASTER] Opening ${melds.length} new combinations on table.`,
    };
  }

  // Check additions to Team Combinations (including 4P Partner combinations!)
  if (aiPlayer.hasOpenedPureSeries) {
    const cardsToAdd: Array<{ card: Card; combinationId: string }> = [];
    const tempHand = [...hand];

    for (const card of tempHand) {
      for (const comb of teamCombinations) {
        if (canCardFitCombination(card, comb)) {
          cardsToAdd.push({ card, combinationId: comb.id });
          break;
        }
      }
    }

    if (cardsToAdd.length > 0) {
      return {
        action: 'OPEN_COMBINATIONS',
        cardsToAdd,
        thinkingDelayMs,
        reasonLog: `[AI MASTER] Adding ${cardsToAdd.length} cards to Team/Partner combinations.`,
      };
    }
  }

  // ----------------------------------------------------
  // PHASE 5: BHUKHARA CLAIM TURN COMPLETION ("SAY HELLO")
  // ----------------------------------------------------
  if (isBhukharaClaimActive) {
    return {
      action: 'HELLO',
      thinkingDelayMs,
      reasonLog: `[AI MASTER] Claimed Bhukhara pile and completed melds. Executing SAY HELLO!`,
    };
  }

  // ----------------------------------------------------
  // PHASE 6: SMART DISCARD SELECTION
  // ----------------------------------------------------
  const chosenDiscardCard = selectSmartAIDiscardCard(
    hand,
    aiPlayer.hasOpenedPureSeries,
    teamCombinations,
    allOpenCombinations,
    seenMap,
    difficulty
  );

  return {
    action: 'DISCARD',
    discardCard: chosenDiscardCard,
    thinkingDelayMs,
    reasonLog: `[AI MASTER] Discarding ${chosenDiscardCard.rank}${chosenDiscardCard.suit} (Safest discard with lowest keep score).`,
  };
}
