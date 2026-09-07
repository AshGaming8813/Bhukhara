import type { Card, Combination, ScoreDetail } from '../types/game';
import { CARD_POINTS, MODA_BONUS } from '../constants/gameConfig';

/**
 * Calculates individual point value of a card.
 */
export function getCardPoints(card: Card): number {
  return CARD_POINTS[card.rank] ?? 1.0;
}

/**
 * Calculates sum of card points for an array of cards.
 */
export function calculateCardsPointSum(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + getCardPoints(card), 0);
}

/**
 * Calculates score for a specific open combination.
 * Takes 7-card special scoring into account!
 */
export function calculateCombinationPoints(combination: Combination): number {
  const cards = combination.cards;

  // 7-Card Special Scoring rule for Triplicate
  if (cards.length >= 7 && combination.type === 'TRIPLICATE') {
    const jokers = cards.filter(c => c.isJoker);
    if (jokers.length === 0) {
      return 20; // Pure 7-card Triplicate without Joker = 20 points
    } else {
      return 10; // 7-card Triplicate with 1 Joker = 10 points
    }
  }

  // 7-Card Special Scoring rule for Series
  if (cards.length >= 7 && (combination.type === 'PURE_SERIES' || combination.type === 'SERIES')) {
    const jokers = cards.filter(c => c.isJoker);
    if (jokers.length === 0) {
      return 20; // 20 points for Pure 7-card Series (0 Jokers)
    } else {
      const joker = jokers[0];
      const nonJokers = cards.filter(c => !c.isJoker);
      const seriesSuit = nonJokers[0]?.suit || combination.suit;

      // 20 pts ONLY if Joker matches exact same suit/symbol as Series; 10 pts if different symbol
      if (seriesSuit && joker.suit === seriesSuit) {
        return 20; // Same suit/symbol Joker = 20 points
      } else {
        return 10; // Different symbol Joker = 10 points
      }
    }
  }

  // Normal 3-6 card combination score: sum of individual card points
  return calculateCardsPointSum(cards);
}

/**
 * Calculates full Bazzi scores for all teams/players.
 * Including:
 * - Open combination points (with 7-card special rules)
 * - Moda bonuses (+5 per Moda)
 * - Penalty points: Remaining hand cards added to OPPOSITE team's score!
 */
export function calculateBazziScores(
  teamIds: string[],
  combinationsByTeam: Record<string, Combination[]>,
  remainingHandsByTeam: Record<string, Card[]>,
  modasByTeam: Record<string, number>
): Record<string, ScoreDetail> {
  const results: Record<string, ScoreDetail> = {};

  teamIds.forEach(id => {
    results[id] = {
      openPoints: 0,
      sevenCardBonus: 0,
      modaBonus: 0,
      oppositeHandPoints: 0,
      total: 0,
    };
  });

  // 1. Calculate open combination points for each team
  teamIds.forEach(id => {
    const teamCombs = combinationsByTeam[id] || [];
    let totalOpen = 0;
    teamCombs.forEach(comb => {
      totalOpen += calculateCombinationPoints(comb);
    });
    results[id].openPoints = totalOpen;
  });

  // 2. Moda bonuses (+5 per Moda)
  teamIds.forEach(id => {
    const count = modasByTeam[id] || 0;
    results[id].modaBonus = count * MODA_BONUS;
  });

  // 3. Hand points remaining added to OPPOSITE team's score!
  if (teamIds.length === 2) {
    const [teamA, teamB] = teamIds;

    const remainingCardsA = remainingHandsByTeam[teamA] || [];
    const remainingCardsB = remainingHandsByTeam[teamB] || [];

    const handSumA = calculateCardsPointSum(remainingCardsA);
    const handSumB = calculateCardsPointSum(remainingCardsB);

    // Remaining cards of Team A -> Added to Team B's score
    results[teamB].oppositeHandPoints += handSumA;

    // Remaining cards of Team B -> Added to Team A's score
    results[teamA].oppositeHandPoints += handSumB;
  }

  // 4. Calculate total score
  teamIds.forEach(id => {
    const detail = results[id];
    detail.total = detail.openPoints + detail.modaBonus + detail.oppositeHandPoints;
  });

  return results;
}
