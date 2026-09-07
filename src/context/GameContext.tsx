import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  GameState,
  GameMode,
  BazziMode,
  Card,
  Combination,
  Player,
  BazziResult,
  OnlineEmoteEvent,
  AIDifficulty,
} from '../types/game';
import { createDeck, dealCards } from '../engine/deck';
import {
  isValidPureSeries,
  isValidSeries,
  isValidTriplicate,
  canCardsFitCombination,
  validateModa,
  sortCardsByRank,
  sortCardsBySuit,
} from '../engine/validation';
import { calculateBazziScores } from '../engine/scoring';
import { getAIDecision, selectSmartAIDiscardCard, getPublicSeenCardCounts } from '../engine/ai';
import { soundEngine } from '../engine/sound';
import { saveGameState, loadGameState, clearGameState } from '../utils/storage';
import confetti from 'canvas-confetti';
import { onlineEngine } from '../services/onlineEngine';

interface GameContextType {
  state: GameState;
  selectedCardIds: string[];
  activeEmote: OnlineEmoteEvent | null;
  selectCard: (cardId: string) => void;
  clearCardSelection: () => void;
  sortHand: (criterion: 'rank' | 'suit') => void;
  startNewGame: (mode: GameMode, bazziMode: BazziMode) => void;
  continueSavedGame: () => boolean;
  drawFromCloseDeck: () => void;
  takeFromOpenDeck: (cardIndex?: number) => void;
  openSeriesFromSelection: () => { success: boolean; message: string };
  openTriplicateFromSelection: () => { success: boolean; message: string };
  addSelectionToCombination: (targetCombinationId: string) => { success: boolean; message: string };
  discardSelectedCard: () => { success: boolean; message: string };
  attemptModa: () => { success: boolean; message: string };
  sayHello: () => void;
  restartCurrentGame: () => void;
  resetToHome: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  setOnlineGameState: (newState: GameState) => void;
  sendOnlineEmote: (emote: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadGameState();
    if (saved) return saved;

    return {
      gameMode: '2P',
      bazziMode: 1,
      currentBazzi: 1,
      leadScore: { A: 0, B: 0 },
      bazziResults: [],
      players: {},
      playerOrder: [],
      dealerIndex: 0,
      currentTurnIndex: 0,
      hasDrawnThisTurn: false,
      mustDiscard: false,
      closeDeck: [],
      openDeck: [],
      bhukharaPile: [],
      combinations: { A: [], B: [] },
      phase: 'DEAL',
      modaCount: 0,
      lastAction: 'Welcome to Bhukhara!',
      foul: null,
      winner: null,
      soundEnabled: true,
      musicEnabled: true,
      animationSpeed: 'normal',
      language: 'EN',
    };
  });

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [activeEmote, setActiveEmote] = useState<OnlineEmoteEvent | null>(null);

  const syncOnlineState = useCallback((newState: GameState) => {
    if (newState.isOnlineMode && newState.onlineRoomCode) {
      onlineEngine.syncGameState(newState.onlineRoomCode, newState);
    }
  }, []);

  const setOnlineGameState = useCallback((newState: GameState) => {
    setState(prev => {
      // 1. Determine correct client local identity slotId ('P1', 'P2', etc.)
      const isNewSession = !prev.gameSessionId || prev.gameSessionId !== newState.gameSessionId || prev.onlineRoomCode !== newState.onlineRoomCode;
      const clientLocalId = (isNewSession || !prev.localPlayerId)
        ? (newState.localPlayerId || prev.localPlayerId || 'P1')
        : (prev.localPlayerId || newState.localPlayerId || 'P1');

      // 2. Authoritative Version Filter: Ignore older out-of-order states for same session
      if (prev.isOnlineMode && newState.gameSessionId && prev.gameSessionId === newState.gameSessionId) {
        const prevVer = prev.version || 0;
        const newVer = newState.version || 0;
        if (newVer < prevVer) {
          return prev;
        }
        if (newVer === prevVer && (newState.updatedAt || 0) <= (prev.updatedAt || 0)) {
          return prev;
        }
      }

      console.log(`[REALTIME RECEIVED] roomCode: ${newState.onlineRoomCode} version: ${newState.version} gameSessionId: ${newState.gameSessionId}`);
      console.log(`[PUBLIC STATE APPLIED] version: ${newState.version} openedCombinations: ${Object.values(newState.combinations || {}).flat().length} currentTurn: ${newState.currentTurnPlayerId}`);

      const mergedState: GameState = {
        ...newState,
        isOnlineMode: true,
        localPlayerId: clientLocalId,
      };

      if (JSON.stringify(prev) === JSON.stringify(mergedState)) return prev;
      return mergedState;
    });
  }, []);

  // Subscribe to real-time room & state updates when in online mode
  useEffect(() => {
    if (state.isOnlineMode && state.onlineRoomCode) {
      const unsubscribe = onlineEngine.subscribeToRoom(state.onlineRoomCode, ({ gameState, emote }) => {
        if (gameState) {
          setOnlineGameState(gameState);
        }
        if (emote) {
          setActiveEmote(emote);
          setTimeout(() => setActiveEmote(null), 3000);
        }
      });
      return () => unsubscribe();
    }
  }, [state.isOnlineMode, state.onlineRoomCode, setOnlineGameState]);

  const sendOnlineEmote = useCallback((emote: string) => {
    if (state.isOnlineMode && state.onlineRoomCode && state.localPlayerId) {
      const localPlayer = state.players[state.localPlayerId] || Object.values(state.players)[0];
      onlineEngine.sendEmote(state.onlineRoomCode, state.localPlayerId, localPlayer?.name || 'Player', emote);
    }
  }, [state.isOnlineMode, state.onlineRoomCode, state.localPlayerId, state.players]);

  useEffect(() => {
    soundEngine.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  useEffect(() => {
    if (state.phase !== 'DEAL') {
      saveGameState(state);
    }
  }, [state]);

  const selectCard = useCallback((cardId: string) => {
    soundEngine.playClick();
    setSelectedCardIds(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      return [...prev, cardId];
    });
  }, []);

  const clearCardSelection = useCallback(() => {
    setSelectedCardIds([]);
  }, []);

  const sortHand = useCallback((criterion: 'rank' | 'suit') => {
    soundEngine.playClick();
    setState(prev => {
      const activePlayerId = prev.playerOrder[prev.currentTurnIndex];
      const player = prev.players[activePlayerId];
      if (!player) return prev;

      const sortedHand = criterion === 'rank' ? sortCardsByRank(player.hand) : sortCardsBySuit(player.hand);

      return {
        ...prev,
        players: {
          ...prev.players,
          [activePlayerId]: {
            ...player,
            hand: sortedHand,
          },
        },
      };
    });
  }, []);

  const getTeamKey = (player: Player | undefined | null, mode: GameMode): string => {
    if (!player) return mode === '2P' ? 'P1' : 'A';
    if (mode === '2P') return player.id || 'P1';
    return player.team || 'A';
  };

  const advanceTurn = useCallback((currentState: GameState): GameState => {
    const nextVersion = (currentState.version || 1) + 1;
    // When Close Deck is empty -> Bazzi declared a DRAW and game ends!
    if (currentState.closeDeck.length === 0) {
      soundEngine.playWin();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      return {
        ...currentState,
        phase: 'GAME_OVER',
        winner: 'DRAW',
        lastAction: '🤝 BAZZI DRAW! Close Deck is empty (0 cards remaining). Bazzi declared a Draw!',
        version: nextVersion,
        updatedAt: Date.now(),
      };
    }

    const nextIdx = (currentState.currentTurnIndex + 1) % currentState.playerOrder.length;
    const nextPlayerId = currentState.playerOrder[nextIdx];
    const nextPlayer = currentState.players[nextPlayerId];

    // If next player has empty hand and close deck is empty
    if (currentState.closeDeck.length === 0) {
      return {
        ...currentState,
        phase: 'GAME_OVER',
        winner: 'DRAW',
        lastAction: '🤝 BAZZI DRAW! Close Deck is empty (0 cards remaining). Bazzi declared a Draw!',
        version: nextVersion,
        updatedAt: Date.now(),
      };
    }

    const updatedPlayers = { ...currentState.players };
    Object.keys(updatedPlayers).forEach(pid => {
      if (updatedPlayers[pid]?.justClaimedBhukharaThisTurn) {
        updatedPlayers[pid] = {
          ...updatedPlayers[pid],
          justClaimedBhukharaThisTurn: false,
        };
      }
    });

    return {
      ...currentState,
      players: updatedPlayers,
      currentTurnIndex: nextIdx,
      currentTurnPlayerId: nextPlayerId,
      hasDrawnThisTurn: false,
      mustDiscard: false,
      pickedFromOpenDeckThisTurn: false,
      usedOpenDeckCardThisTurn: false,
      openDeckTakenCardIds: [],
      hasMeldedThisTurn: false,
      claimedBhukharaThisTurn: false,
      phase: 'DRAW',
      lastAction: `Turn moved clockwise to ${nextPlayer ? nextPlayer.name : (nextPlayerId || 'next player')}.`,
      version: nextVersion,
      updatedAt: Date.now(),
    };
  }, []);

  const endBazzi = useCallback((currentState: GameState, winningTeamId: string) => {
    soundEngine.playWin();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    const teamIds = currentState.gameMode === '2P' ? ['P1', 'P2'] : ['A', 'B'];

    const handsByTeam: Record<string, Card[]> = {};
    teamIds.forEach(tId => {
      handsByTeam[tId] = [];
    });
    Object.values(currentState.players).forEach(p => {
      const tId = getTeamKey(p, currentState.gameMode);
      handsByTeam[tId].push(...p.hand);
    });

    const modasByTeam: Record<string, number> = {};
    teamIds.forEach(tId => {
      modasByTeam[tId] = 0;
    });
    Object.values(currentState.players).forEach(p => {
      const tId = getTeamKey(p, currentState.gameMode);
      modasByTeam[tId] += p.modaCount;
    });

    const bScores = calculateBazziScores(teamIds, currentState.combinations, handsByTeam, modasByTeam);

    const bazziRes: BazziResult = {
      bazziNumber: currentState.currentBazzi,
      scores: bScores,
      winnerId: winningTeamId,
    };

    const updatedBazziResults = [...currentState.bazziResults, bazziRes];

    if (currentState.bazziMode === 2 && currentState.currentBazzi === 1) {
      const leadA = bScores[teamIds[0]].total - bScores[teamIds[1]].total;
      const leadB = bScores[teamIds[1]].total - bScores[teamIds[0]].total;

      const newLead = {
        [teamIds[0]]: leadA,
        [teamIds[1]]: leadB,
      };

      const deck = createDeck();
      const deal = dealCards(currentState.gameMode, deck);
      const nextDealer = (currentState.dealerIndex + 1) % currentState.playerOrder.length;
      const firstTurn = (nextDealer + 1) % currentState.playerOrder.length;

      const resetPlayers = { ...currentState.players };
      Object.keys(resetPlayers).forEach(pid => {
        resetPlayers[pid] = {
          ...resetPlayers[pid],
          hand: deal.playerHands[pid],
          hasOpenedPureSeries: false,
          hasClaimedBhukhara: false,
          justClaimedBhukharaThisTurn: false,
          modaCount: 0,
        };
      });

      setState({
        ...currentState,
        currentBazzi: 2,
        leadScore: newLead,
        bazziResults: updatedBazziResults,
        players: resetPlayers,
        dealerIndex: nextDealer,
        currentTurnIndex: firstTurn,
        hasDrawnThisTurn: false,
        mustDiscard: false,
        closeDeck: deal.closeDeck,
        openDeck: deal.openDeck,
        bhukharaPile: deal.bhukharaPile,
        combinations: currentState.gameMode === '2P' ? { P1: [], P2: [] } : { A: [], B: [] },
        phase: 'DRAW',
        modaCount: 0,
        lastAction: `Bazzi 1 complete! Lead: ${teamIds[0]}: ${leadA > 0 ? '+' : ''}${leadA}. Starting Bazzi 2!`,
      });
    } else {
      let overallWinner = winningTeamId;
      if (currentState.bazziMode === 2 && updatedBazziResults.length === 2) {
        const totalA = updatedBazziResults[0].scores[teamIds[0]].total + updatedBazziResults[1].scores[teamIds[0]].total;
        const totalB = updatedBazziResults[0].scores[teamIds[1]].total + updatedBazziResults[1].scores[teamIds[1]].total;
        overallWinner = totalA >= totalB ? teamIds[0] : teamIds[1];
      }

      setState({
        ...currentState,
        bazziResults: updatedBazziResults,
        phase: 'GAME_OVER',
        winner: overallWinner,
        lastAction: `Game Over! Champion: ${overallWinner}!`,
      });
    }
  }, []);

  const startNewGame = useCallback((mode: GameMode, bazziMode: BazziMode) => {
    clearGameState();
    soundEngine.playCardShuffle();

    const deck = createDeck();
    const deal = dealCards(mode, deck);
    const playerOrder = mode === '2P' ? ['P1', 'P2'] : ['P1', 'P2', 'P3', 'P4'];

    // Set initial dealer to last player so first turn starts at P1 (index 0)
    const dealerIdx = playerOrder.length - 1;
    const firstTurnIdx = 0;

    const players: Record<string, Player> = {};
    playerOrder.forEach(id => {
      const isP1 = id === 'P1';
      const team = (id === 'P1' || id === 'P3') ? 'A' : 'B';
      const name = isP1 ? 'Player 1 (You)' : `Player ${id.replace('P', '')} (AI)`;

      players[id] = {
        id,
        name,
        isHuman: isP1,
        team,
        hand: deal.playerHands[id],
        hasOpenedPureSeries: false,
        hasClaimedBhukhara: false,
        justClaimedBhukharaThisTurn: false,
        modaCount: 0,
      };
    });

    const teams: Record<string, Combination[]> = mode === '2P' ? { P1: [], P2: [] } : { A: [], B: [] };

    const newState: GameState = {
      gameMode: mode,
      bazziMode: bazziMode,
      currentBazzi: 1,
      leadScore: mode === '2P' ? { P1: 0, P2: 0 } : { A: 0, B: 0 },
      bazziResults: [],
      players,
      playerOrder,
      dealerIndex: dealerIdx,
      currentTurnIndex: firstTurnIdx,
      hasDrawnThisTurn: false,
      mustDiscard: false,
      closeDeck: deal.closeDeck,
      openDeck: deal.openDeck,
      bhukharaPile: deal.bhukharaPile,
      combinations: teams,
      phase: 'DRAW',
      modaCount: 0,
      lastAction: `Game started! Dealer is ${players[playerOrder[dealerIdx]].name}. ${players[playerOrder[firstTurnIdx]].name}'s turn.`,
      foul: null,
      winner: null,
      soundEnabled: true,
      musicEnabled: true,
      animationSpeed: 'normal',
      language: 'EN',
    };

    setState(newState);
    setSelectedCardIds([]);
  }, []);

  const resetToHome = useCallback(() => {
    clearGameState();
    setState(prev => ({
      ...prev,
      phase: 'DEAL',
      foul: null,
      winner: null,
      lastAction: 'Returned to Home.',
    }));
    setSelectedCardIds([]);
  }, []);

  const continueSavedGame = useCallback((): boolean => {
    const saved = loadGameState();
    if (saved) {
      setState(saved);
      return true;
    }
    return false;
  }, []);

  const drawFromCloseDeck = useCallback(() => {
    setState(prev => {
      if (prev.isOnlineMode && prev.localPlayerId) {
        const currentTurnSlot = prev.playerOrder[prev.currentTurnIndex];
        if (prev.localPlayerId !== currentTurnSlot) return prev;
      }
      if (prev.hasDrawnThisTurn || prev.phase !== 'DRAW') return prev;
      if (prev.closeDeck.length === 0) return prev;

      const drawnCard = prev.closeDeck[0];
      const newCloseDeck = prev.closeDeck.slice(1);

      const activeId = prev.playerOrder[prev.currentTurnIndex];
      const activePlayer = prev.players[activeId];
      if (!activePlayer) return prev;

      soundEngine.playDrawCard();

      const nextState: GameState = {
        ...prev,
        closeDeck: newCloseDeck,
        hasDrawnThisTurn: true,
        phase: 'MELD_OR_DISCARD',
        players: {
          ...prev.players,
          [activeId]: {
            ...activePlayer,
            hand: [...(activePlayer.hand || []), drawnCard],
          },
        },
        lastAction: `${activePlayer.name || activeId} drew 1 card from Close Deck.`,
        version: (prev.version || 1) + 1,
        currentTurnPlayerId: activeId,
        updatedAt: Date.now(),
      };

      syncOnlineState(nextState);
      return nextState;
    });
  }, [syncOnlineState]);

  const takeFromOpenDeck = useCallback((_cardIndex: number = 0) => {
    setState(prev => {
      if (prev.isOnlineMode && prev.localPlayerId) {
        const currentTurnSlot = prev.playerOrder[prev.currentTurnIndex];
        if (prev.localPlayerId !== currentTurnSlot) return prev;
      }
      if (prev.hasDrawnThisTurn || prev.phase !== 'DRAW') return prev;
      if (prev.openDeck.length === 0) return prev;

      // COMPULSORY PICKUP: Player receives ALL cards in the Open Deck pile!
      const takenCards = prev.openDeck;
      const remainingOpen: Card[] = [];

      const activeId = prev.playerOrder[prev.currentTurnIndex];
      const activePlayer = prev.players[activeId];
      if (!activePlayer) return prev;

      soundEngine.playDrawCard();

      const takenCardIds = takenCards.map(c => c.id);
      const nextState: GameState = {
        ...prev,
        openDeck: remainingOpen,
        hasDrawnThisTurn: true,
        pickedFromOpenDeckThisTurn: true,
        usedOpenDeckCardThisTurn: false,
        openDeckTakenCardIds: takenCardIds,
        phase: 'MELD_OR_DISCARD',
        players: {
          ...prev.players,
          [activeId]: {
            ...activePlayer,
            hand: [...(activePlayer.hand || []), ...takenCards],
          },
        },
        lastAction: `${activePlayer.name || activeId} picked up ALL ${takenCards.length} card(s) from Open Deck.`,
        version: (prev.version || 1) + 1,
        currentTurnPlayerId: activeId,
        updatedAt: Date.now(),
      };

      syncOnlineState(nextState);
      return nextState;
    });
  }, [syncOnlineState]);

  const addSelectionToCombination = useCallback((targetCombId: string): { success: boolean; message: string } => {
    if (state.isOnlineMode && state.localPlayerId) {
      const currentTurnSlot = state.playerOrder[state.currentTurnIndex];
      if (state.localPlayerId !== currentTurnSlot) {
        console.warn(`[ADD CARD REJECTED] Not your turn.`);
        return { success: false, message: "It is not your turn!" };
      }
    }

    if (!state.hasDrawnThisTurn) {
      console.warn(`[ADD CARD REJECTED] Must draw a card first.`);
      return { success: false, message: "You must draw a card before adding to combinations." };
    }

    const activeId = state.playerOrder[state.currentTurnIndex];
    const activePlayer = state.players[activeId];
    if (!activePlayer) {
      return { success: false, message: "Active player error." };
    }

    if (!activePlayer.hasOpenedPureSeries) {
      console.warn(`[ADD CARD REJECTED] Must open pure series first.`);
      return { success: false, message: "Must open a Pure Same-Suit Series before adding to combinations." };
    }

    const selectedCards = activePlayer.hand.filter(c => selectedCardIds.includes(c.id));
    if (selectedCards.length === 0) {
      return { success: false, message: "Please select at least 1 card to add to a combination." };
    }

    const teamKey = getTeamKey(activePlayer, state.gameMode);
    const teamCombs = (state.combinations && state.combinations[teamKey]) ? state.combinations[teamKey] : [];
    const targetComb = teamCombs.find(c => c.id === targetCombId);

    if (!targetComb) {
      return { success: false, message: "Target combination not found." };
    }

    if (!canCardsFitCombination(selectedCards, targetComb)) {
      console.warn(`[ADD CARDS REJECTED] Selected cards cannot fit into combination.`);
      return { success: false, message: "Selected card(s) cannot legally fit into this combination." };
    }

    soundEngine.playMeldOpen();

    setSelectedCardIds([]);

    setState(prev => {
      const currentActiveId = prev.playerOrder[prev.currentTurnIndex];
      const currentActiveP = prev.players[currentActiveId];
      if (!currentActiveP) return prev;

      const currentTeamKey = getTeamKey(currentActiveP, prev.gameMode);
      const currentTeamCombs = (prev.combinations && prev.combinations[currentTeamKey]) ? prev.combinations[currentTeamKey] : [];
      const currentTargetComb = currentTeamCombs.find(c => c.id === targetCombId);
      if (!currentTargetComb) return prev;

      const newCombinedCards = sortCardsByRank([...currentTargetComb.cards, ...selectedCards]);
      const hasJokerInComb = newCombinedCards.some(c => c.isJoker);

      const updatedComb: Combination = {
        ...currentTargetComb,
        cards: newCombinedCards,
        type: (currentTargetComb.type === 'PURE_SERIES' && hasJokerInComb) ? 'SERIES' : currentTargetComb.type,
      };

      const updatedCombs = currentTeamCombs.map(c => (c.id === targetCombId ? updatedComb : c));
      const remainingHand = currentActiveP.hand.filter(c => !selectedCards.some(sc => sc.id === c.id));

      const updatedPlayers = {
        ...prev.players,
      };
      if (updatedPlayers[currentActiveId]) {
        updatedPlayers[currentActiveId] = {
          ...updatedPlayers[currentActiveId],
          hand: remainingHand,
        };
      }

      const openTakenIds = prev.openDeckTakenCardIds || [];
      const isUsedFromOpen = (prev.pickedFromOpenDeckThisTurn && selectedCards.some(c => openTakenIds.includes(c.id))) || prev.usedOpenDeckCardThisTurn || false;

      let nextState: GameState = {
        ...prev,
        players: updatedPlayers,
        hasMeldedThisTurn: true,
        usedOpenDeckCardThisTurn: isUsedFromOpen,
        combinations: {
          ...(prev.combinations || {}),
          [currentTeamKey]: updatedCombs,
        },
        lastAction: `${currentActiveP.name} added ${selectedCards.length} card(s) to combination.`,
        version: (prev.version || 1) + 1,
        updatedAt: Date.now(),
      };

      if (remainingHand.length === 0) {
        const nextIdx = (prev.currentTurnIndex + 1) % prev.playerOrder.length;
        const nextPlayerId = prev.playerOrder[nextIdx];
        const nextPlayer = prev.players[nextPlayerId];
        nextState = {
          ...nextState,
          currentTurnIndex: nextIdx,
          currentTurnPlayerId: nextPlayerId,
          hasDrawnThisTurn: false,
          mustDiscard: false,
          phase: 'DRAW',
          lastAction: `${currentActiveP.name}'s hand is empty (0 cards). Waiting for next turn. Turn moved to ${nextPlayer ? nextPlayer.name : nextPlayerId}.`,
          version: (nextState.version || 1) + 1,
          updatedAt: Date.now(),
        };
      }

      console.log(`[ADD CARDS] SUCCESS! version:${nextState.version} added:${selectedCards.length} cards comb:${targetCombId}`);
      console.log(`[REALTIME BROADCAST] roomCode:${nextState.onlineRoomCode} version:${nextState.version}`);

      syncOnlineState(nextState);
      return nextState;
    });

    return { success: true, message: 'Card(s) added to combination!' };
  }, [state, selectedCardIds, syncOnlineState]);

  const openSeriesFromSelection = useCallback((): { success: boolean; message: string } => {
    if (state.isOnlineMode && state.localPlayerId) {
      const currentTurnSlot = state.playerOrder[state.currentTurnIndex];
      if (state.localPlayerId !== currentTurnSlot) {
        console.warn(`[OPEN SERIES REJECTED] Not your turn. localPlayerId=${state.localPlayerId}, currentTurnSlot=${currentTurnSlot}`);
        return { success: false, message: "It is not your turn!" };
      }
    }

    if (!state.hasDrawnThisTurn) {
      console.warn(`[OPEN SERIES REJECTED] Must draw a card before opening.`);
      return { success: false, message: "You must draw a card before opening combinations." };
    }

    const activeId = state.playerOrder[state.currentTurnIndex];
    const activePlayer = state.players[activeId];
    if (!activePlayer) {
      return { success: false, message: "Active player error." };
    }

    const selectedCards = activePlayer.hand.filter(c => selectedCardIds.includes(c.id));
    if (selectedCards.length === 0) {
      return { success: false, message: "Please select card(s) to open or add to Series." };
    }

    const teamKey = getTeamKey(activePlayer, state.gameMode);
    const existingCombs = (state.combinations && state.combinations[teamKey]) ? state.combinations[teamKey] : [];

    // AUTO-ATTACH: If player already opened Pure Series, check if selected cards fit an EXISTING Series on team board
    if (activePlayer.hasOpenedPureSeries && existingCombs.length > 0) {
      const matchingSeries = existingCombs.find(comb =>
        (comb.type === 'PURE_SERIES' || comb.type === 'SERIES') && canCardsFitCombination(selectedCards, comb)
      );

      if (matchingSeries) {
        return addSelectionToCombination(matchingSeries.id);
      }
    }

    if (selectedCards.length < 3 || selectedCards.length > 7) {
      console.warn(`[OPEN SERIES REJECTED] Invalid card count: ${selectedCards.length}`);
      return { success: false, message: "New Series requires 3 to 7 cards (or select cards fitting an existing open Series)." };
    }

    if (!activePlayer.hasOpenedPureSeries) {
      if (!isValidPureSeries(selectedCards)) {
        console.warn(`[OPEN SERIES REJECTED] First opening must be pure series.`);
        return {
          success: false,
          message: "Initial opening MUST be a Pure Same-Suit Series (3–7 consecutive cards of same suit without Jokers).",
        };
      }
    } else {
      if (!isValidSeries(selectedCards)) {
        console.warn(`[OPEN SERIES REJECTED] Invalid series combination.`);
        return { success: false, message: "Invalid Series combination (consecutive ranks, same suit, max 1 Joker)." };
      }
    }

    soundEngine.playMeldOpen();

    const isPure = isValidPureSeries(selectedCards);
    const newComb: Combination = {
      id: `comb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: isPure ? 'PURE_SERIES' : 'SERIES',
      cards: sortCardsByRank(selectedCards),
      suit: selectedCards.find(c => !c.isJoker)?.suit || selectedCards[0].suit,
      rank: null,
      ownerId: teamKey,
      points: 0,
    };

    console.log(`[OPEN SERIES REQUEST] roomCode: ${state.onlineRoomCode} sessionId: ${state.gameSessionId} playerId: ${activeId} selectedCards:`, selectedCards.map(c => `${c.rank}${c.suit}`));

    setSelectedCardIds([]);

    setState(prev => {
      const currentActiveId = prev.playerOrder[prev.currentTurnIndex];
      const currentActiveP = prev.players[currentActiveId];
      if (!currentActiveP) return prev;

      const remainingHand = currentActiveP.hand.filter(c => !selectedCards.some(sc => sc.id === c.id));
      const currentTeamKey = getTeamKey(currentActiveP, prev.gameMode);
      const teamCombs = (prev.combinations && prev.combinations[currentTeamKey]) ? prev.combinations[currentTeamKey] : [];

      const updatedPlayers = { ...prev.players };
      Object.keys(updatedPlayers).forEach(pid => {
        const p = updatedPlayers[pid];
        if (p && getTeamKey(p, prev.gameMode) === currentTeamKey) {
          updatedPlayers[pid] = { ...p, hasOpenedPureSeries: true };
        }
      });

      if (updatedPlayers[currentActiveId]) {
        updatedPlayers[currentActiveId] = {
          ...updatedPlayers[currentActiveId],
          hand: remainingHand,
          hasOpenedPureSeries: true,
        };
      }

      const openTakenIds = prev.openDeckTakenCardIds || [];
      const isUsedFromOpen = (prev.pickedFromOpenDeckThisTurn && selectedCards.some(c => openTakenIds.includes(c.id))) || prev.usedOpenDeckCardThisTurn || false;

      let nextState: GameState = {
        ...prev,
        players: updatedPlayers,
        hasMeldedThisTurn: true,
        usedOpenDeckCardThisTurn: isUsedFromOpen,
        combinations: {
          ...(prev.combinations || {}),
          [currentTeamKey]: [...teamCombs, newComb],
        },
        lastAction: `${currentActiveP.name} opened a Series (${selectedCards.length} cards).`,
        version: (prev.version || 1) + 1,
        updatedAt: Date.now(),
      };

      if (remainingHand.length === 0) {
        const nextIdx = (prev.currentTurnIndex + 1) % prev.playerOrder.length;
        const nextPlayerId = prev.playerOrder[nextIdx];
        const nextPlayer = prev.players[nextPlayerId];
        nextState = {
          ...nextState,
          currentTurnIndex: nextIdx,
          currentTurnPlayerId: nextPlayerId,
          hasDrawnThisTurn: false,
          mustDiscard: false,
          phase: 'DRAW',
          lastAction: `${currentActiveP.name}'s hand is empty (0 cards). Waiting for next turn. Turn moved to ${nextPlayer ? nextPlayer.name : nextPlayerId}.`,
          version: (nextState.version || 1) + 1,
          updatedAt: Date.now(),
        };
      }

      console.log(`[OPEN SERIES] SUCCESS! version:${nextState.version} room:${nextState.onlineRoomCode} comb:${newComb.id} type:${newComb.type}`);
      console.log(`[REALTIME BROADCAST] roomCode:${nextState.onlineRoomCode} version:${nextState.version}`);

      syncOnlineState(nextState);
      return nextState;
    });

    return { success: true, message: 'Series opened successfully!' };
  }, [state, selectedCardIds, addSelectionToCombination, syncOnlineState]);

  const openTriplicateFromSelection = useCallback((): { success: boolean; message: string } => {
    if (state.isOnlineMode && state.localPlayerId) {
      const currentTurnSlot = state.playerOrder[state.currentTurnIndex];
      if (state.localPlayerId !== currentTurnSlot) {
        console.warn(`[OPEN TRIPLICATE REJECTED] Not your turn.`);
        return { success: false, message: "It is not your turn!" };
      }
    }

    if (!state.hasDrawnThisTurn) {
      console.warn(`[OPEN TRIPLICATE REJECTED] Must draw a card before opening.`);
      return { success: false, message: "You must draw a card before opening combinations." };
    }

    const activeId = state.playerOrder[state.currentTurnIndex];
    const activePlayer = state.players[activeId];
    if (!activePlayer) {
      return { success: false, message: "Active player error." };
    }

    if (!activePlayer.hasOpenedPureSeries) {
      console.warn(`[OPEN TRIPLICATE REJECTED] Must open pure series first.`);
      return {
        success: false,
        message: "You must first open a Pure Same-Suit Series before creating Triplicates!",
      };
    }

    const selectedCards = activePlayer.hand.filter(c => selectedCardIds.includes(c.id));
    if (selectedCards.length === 0) {
      return { success: false, message: "Please select card(s) to open or add to Triplicate." };
    }

    const teamKey = getTeamKey(activePlayer, state.gameMode);
    const existingCombs = (state.combinations && state.combinations[teamKey]) ? state.combinations[teamKey] : [];

    // AUTO-ATTACH: Check if selected cards fit into an EXISTING Triplicate on team board
    if (activePlayer.hasOpenedPureSeries && existingCombs.length > 0) {
      const matchingTriplicate = existingCombs.find(comb =>
        comb.type === 'TRIPLICATE' && canCardsFitCombination(selectedCards, comb)
      );

      if (matchingTriplicate) {
        return addSelectionToCombination(matchingTriplicate.id);
      }
    }

    if (selectedCards.length < 3 || selectedCards.length > 7) {
      console.warn(`[OPEN TRIPLICATE REJECTED] Invalid card count: ${selectedCards.length}`);
      return { success: false, message: "New Triplicate requires 3 to 7 cards (or select cards fitting an existing open Triplicate)." };
    }

    if (!isValidTriplicate(selectedCards)) {
      console.warn(`[OPEN TRIPLICATE REJECTED] Invalid triplicate combination.`);
      return { success: false, message: "Invalid Triplicate combination (3-7 cards of same rank, max 1 Joker)." };
    }

    soundEngine.playMeldOpen();

    const nonJoker = selectedCards.find(c => !c.isJoker);

    const newComb: Combination = {
      id: `comb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'TRIPLICATE',
      cards: selectedCards,
      suit: null,
      rank: nonJoker?.rank || selectedCards[0].rank,
      ownerId: teamKey,
      points: 0,
    };

    console.log(`[OPEN TRIPLICATE REQUEST] roomCode: ${state.onlineRoomCode} sessionId: ${state.gameSessionId} playerId: ${activeId} selectedCards:`, selectedCards.map(c => `${c.rank}${c.suit}`));

    setSelectedCardIds([]);

    setState(prev => {
      const currentActiveId = prev.playerOrder[prev.currentTurnIndex];
      const currentActiveP = prev.players[currentActiveId];
      if (!currentActiveP) return prev;

      const remainingHand = currentActiveP.hand.filter(c => !selectedCards.some(sc => sc.id === c.id));
      const currentTeamKey = getTeamKey(currentActiveP, prev.gameMode);
      const teamCombs = (prev.combinations && prev.combinations[currentTeamKey]) ? prev.combinations[currentTeamKey] : [];

      const updatedPlayers = {
        ...prev.players,
      };
      if (updatedPlayers[currentActiveId]) {
        updatedPlayers[currentActiveId] = {
          ...updatedPlayers[currentActiveId],
          hand: remainingHand,
        };
      }

      const openTakenIds = prev.openDeckTakenCardIds || [];
      const isUsedFromOpen = (prev.pickedFromOpenDeckThisTurn && selectedCards.some(c => openTakenIds.includes(c.id))) || prev.usedOpenDeckCardThisTurn || false;

      let nextState: GameState = {
        ...prev,
        players: updatedPlayers,
        hasMeldedThisTurn: true,
        usedOpenDeckCardThisTurn: isUsedFromOpen,
        combinations: {
          ...(prev.combinations || {}),
          [currentTeamKey]: [...teamCombs, newComb],
        },
        lastAction: `${currentActiveP.name} opened a Triplicate (${selectedCards.length} cards).`,
        version: (prev.version || 1) + 1,
        updatedAt: Date.now(),
      };

      if (remainingHand.length === 0) {
        const nextIdx = (prev.currentTurnIndex + 1) % prev.playerOrder.length;
        const nextPlayerId = prev.playerOrder[nextIdx];
        const nextPlayer = prev.players[nextPlayerId];
        nextState = {
          ...nextState,
          currentTurnIndex: nextIdx,
          currentTurnPlayerId: nextPlayerId,
          hasDrawnThisTurn: false,
          mustDiscard: false,
          phase: 'DRAW',
          lastAction: `${currentActiveP.name}'s hand is empty (0 cards). Waiting for next turn. Turn moved to ${nextPlayer ? nextPlayer.name : nextPlayerId}.`,
          version: (nextState.version || 1) + 1,
          updatedAt: Date.now(),
        };
      }

      console.log(`[OPEN TRIPLICATE] SUCCESS! version:${nextState.version} room:${nextState.onlineRoomCode} comb:${newComb.id}`);
      console.log(`[REALTIME BROADCAST] roomCode:${nextState.onlineRoomCode} version:${nextState.version}`);

      syncOnlineState(nextState);
      return nextState;
    });

    return { success: true, message: 'Triplicate opened successfully!' };
  }, [state, selectedCardIds, addSelectionToCombination, syncOnlineState]);

  const discardSelectedCard = useCallback((): { success: boolean; message: string } => {
    if (state.isOnlineMode && state.localPlayerId) {
      const currentTurnSlot = state.playerOrder[state.currentTurnIndex];
      if (state.localPlayerId !== currentTurnSlot) {
        console.warn(`[DISCARD REJECTED] Not your turn.`);
        return { success: false, message: "It is not your turn!" };
      }
    }

    if (!state.hasDrawnThisTurn) {
      console.warn(`[DISCARD REJECTED] Must draw before discarding.`);
      return { success: false, message: 'You must draw a card before discarding.' };
    }

    const activeId = state.playerOrder[state.currentTurnIndex];
    const activePlayer = state.players[activeId];
    if (!activePlayer) {
      return { success: false, message: "Active player error." };
    }

    const selectedCards = activePlayer.hand.filter(c => selectedCardIds.includes(c.id));
    if (selectedCards.length !== 1) {
      console.warn(`[DISCARD REJECTED] Selected cards count = ${selectedCards.length}`);
      return { success: false, message: 'Please select exactly 1 card to discard.' };
    }

    const discardCard = selectedCards[0];
    soundEngine.playDiscardCard();

    setSelectedCardIds([]);

    setState(prev => {
      const currentActiveId = prev.playerOrder[prev.currentTurnIndex];
      const currentActivePlayer = prev.players[currentActiveId];
      if (!currentActivePlayer) return prev;

      const opponentWinner = prev.gameMode === '2P'
        ? (currentActiveId === 'P1' ? 'P2' : 'P1')
        : (currentActivePlayer.team === 'A' ? 'B' : 'A');

      // RULE 2: BHUKHARA HELLO DISCARD FOUL!
      // If player claimed Bhukhara and melded cards, but discards WITHOUT saying HELLO -> INSTANT FOUL!
      if ((prev.claimedBhukharaThisTurn || currentActivePlayer.justClaimedBhukharaThisTurn || prev.phase === 'HELLO_WAIT') && prev.hasMeldedThisTurn) {
        soundEngine.playFoul();
        const foulState: GameState = {
          ...prev,
          phase: 'FOUL',
          winner: opponentWinner,
          foul: {
            isFoul: true,
            player: currentActiveId,
            reason: `🚫 BHUKHARA HELLO FOUL! ${currentActivePlayer.name} discarded a card after claiming Bhukhara WITHOUT clicking 'SAY HELLO'! Presence of Mind Violation! Opponent Wins!`,
            winnerId: opponentWinner,
          },
          lastAction: `🚫 BHUKHARA HELLO FOUL! ${currentActivePlayer.name} discarded without saying HELLO! Match Won by Opponent!`,
          version: (prev.version || 1) + 1,
          updatedAt: Date.now(),
        };
        syncOnlineState(foulState);
        return foulState;
      }

      // RULE 1: BHUKHARA CLAIM REVERT LOGIC!
      // If player claimed Bhukhara 13 cards but could NOT open or add any card to combinations -> REVERT BHUKHARA PILE & CLOSE BACK!
      if ((prev.claimedBhukharaThisTurn || currentActivePlayer.justClaimedBhukharaThisTurn) && !prev.hasMeldedThisTurn) {
        soundEngine.playCardShuffle();
        const bhukharaRevertedPile = [...currentActivePlayer.hand]; // Return claimed 13 cards back to Bhukhara pile
        const restoredPlayerHand: Card[] = []; // Hand emptied back to 0 cards

        const stateAfterRevert: GameState = {
          ...prev,
          bhukharaPile: bhukharaRevertedPile,
          players: {
            ...prev.players,
            [currentActiveId]: {
              ...currentActivePlayer,
              hand: restoredPlayerHand,
              hasClaimedBhukhara: false,
              justClaimedBhukharaThisTurn: false,
              modaCount: Math.max(0, currentActivePlayer.modaCount - 1),
            },
          },
          modaCount: Math.max(0, prev.modaCount - 1),
          claimedBhukharaThisTurn: false,
          hasMeldedThisTurn: false,
          lastAction: `↩️ BHUKHARA REVERTED! ${currentActivePlayer.name} could not play any card from Bhukhara. 13 cards closed back to Bhukhara pile & turn ended.`,
          version: (prev.version || 1) + 1,
          updatedAt: Date.now(),
        };

        const nextState = advanceTurn(stateAfterRevert);
        syncOnlineState(nextState);
        return nextState;
      }

      // RULE 3: OPEN DECK PICKUP COMPULSORY PLAY FOUL!
      // If player picked up cards from Open Deck but discards WITHOUT using at least ONE of the cards taken from Open Deck in a combination -> INSTANT FOUL!
      if (prev.pickedFromOpenDeckThisTurn && !prev.usedOpenDeckCardThisTurn) {
        soundEngine.playFoul();
        const foulState: GameState = {
          ...prev,
          phase: 'FOUL',
          winner: opponentWinner,
          foul: {
            isFoul: true,
            player: currentActiveId,
            reason: `🚫 OPEN DECK PICKUP FOUL! ${currentActivePlayer.name} picked up cards from the Open Deck but discarded without using at least one of the cards taken from the Open Deck in a combination! Opponent Wins!`,
            winnerId: opponentWinner,
          },
          lastAction: `🚫 OPEN DECK PICKUP FOUL! ${currentActivePlayer.name} failed to use cards taken from Open Deck! Match Won by Opponent!`,
          version: (prev.version || 1) + 1,
          updatedAt: Date.now(),
        };
        syncOnlineState(foulState);
        return foulState;
      }

      const targetCard = currentActivePlayer.hand.find(c => c.id === discardCard.id);
      if (!targetCard) {
        console.warn(`[DISCARD REJECTED] Card ${discardCard.id} not found in active player's hand.`);
        return prev;
      }

      const remainingHand = currentActivePlayer.hand.filter(c => c.id !== targetCard.id);

      const stateAfterDiscard: GameState = {
        ...prev,
        openDeck: [...prev.openDeck, targetCard],
        players: {
          ...prev.players,
          [currentActiveId]: {
            ...currentActivePlayer,
            hand: remainingHand,
          },
        },
        lastAction: `${currentActivePlayer.name} discarded ${targetCard.rank} ${targetCard.suit}.`,
        version: (prev.version || 1) + 1,
        updatedAt: Date.now(),
      };

      const nextState = advanceTurn(stateAfterDiscard);

      console.log(`[DISCARD] SUCCESS! version:${nextState.version} discarded:${targetCard.rank}${targetCard.suit} nextTurnPlayer:${nextState.currentTurnPlayerId}`);
      console.log(`[REALTIME BROADCAST] roomCode:${nextState.onlineRoomCode} version:${nextState.version}`);

      syncOnlineState(nextState);
      return nextState;
    });

    return { success: true, message: 'Card discarded.' };
  }, [state, selectedCardIds, advanceTurn, syncOnlineState]);

  const attemptModa = useCallback((): { success: boolean; message: string } => {
    if (state.isOnlineMode && state.localPlayerId) {
      const currentTurnSlot = state.playerOrder[state.currentTurnIndex];
      if (state.localPlayerId !== currentTurnSlot) {
        return { success: false, message: "It is not your turn!" };
      }
    }

    const activeId = state.playerOrder[state.currentTurnIndex];
    const activePlayer = state.players[activeId];
    if (!activePlayer) {
      return { success: false, message: "Active player error." };
    }
    const teamKey = getTeamKey(activePlayer, state.gameMode);

    if (activePlayer.hand.length !== 1) {
      return {
        success: false,
        message: 'Moda can only be attempted when EXACTLY 1 card remains in hand!',
      };
    }

    const modaCard = activePlayer.hand[0];

    const allCombs: Combination[] = [];
    if (state.combinations) {
      Object.values(state.combinations).forEach(list => {
        if (Array.isArray(list)) allCombs.push(...list);
      });
    }

    const modaCheck = validateModa(modaCard, allCombs);

    if (modaCheck.isFoul) {
      soundEngine.playFoul();
      const opponentTeam = teamKey === 'A' ? 'B' : (teamKey === 'B' ? 'A' : (teamKey === 'P1' ? 'P2' : 'P1'));

      setState(prev => {
        const nextState: GameState = {
          ...prev,
          phase: 'FOUL',
          foul: {
            isFoul: true,
            player: activePlayer.id,
            reason: modaCheck.reason || 'Invalid Moda Foul! Card fits open combination.',
            winnerId: opponentTeam,
          },
          winner: opponentTeam,
          lastAction: `⚠️ FOUL! ${activePlayer.name} attempted invalid Moda. ${opponentTeam} wins immediately!`,
          version: (prev.version || 1) + 1,
          updatedAt: Date.now(),
        };
        syncOnlineState(nextState);
        return nextState;
      });

      return { success: false, message: modaCheck.reason || 'FOUL! Invalid Moda.' };
    }

    soundEngine.playModa();
    const newModaCount = state.modaCount + 1;

    if (newModaCount === 1) {
      const bhukharaCards = state.bhukharaPile;
      const updatedHand = [...bhukharaCards];

      setState(prev => {
        const nextState: GameState = {
          ...prev,
          modaCount: 1,
          openDeck: [...prev.openDeck, modaCard],
          bhukharaPile: [],
          players: {
            ...prev.players,
            [activeId]: {
              ...activePlayer,
              hand: updatedHand,
              hasClaimedBhukhara: true,
              justClaimedBhukharaThisTurn: true,
              modaCount: activePlayer.modaCount + 1,
            },
          },
          hasDrawnThisTurn: true,
          phase: 'MELD_OR_DISCARD',
          lastAction: `🎉 FIRST MODA! ${activePlayer.name} placed ${modaCard.rank}${modaCard.suit} in Open Deck & claimed the 13-card Bhukhara pile!`,
          version: (prev.version || 1) + 1,
          updatedAt: Date.now(),
        };
        syncOnlineState(nextState);
        return nextState;
      });

      return { success: true, message: `First Moda successful! ${modaCard.rank}${modaCard.suit} placed in Open Deck & 13 Bhukhara cards claimed.` };
    } else {
      soundEngine.playWin();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      setState(prev => {
        const currentActiveId = prev.playerOrder[prev.currentTurnIndex];
        const currentActiveP = prev.players[currentActiveId];
        const currentTeamKey = getTeamKey(currentActiveP, prev.gameMode);

        const updatedPlayers = {
          ...prev.players,
          [currentActiveId]: {
            ...currentActiveP,
            hand: [],
            modaCount: ((currentActiveP ? currentActiveP.modaCount : 0) || 0) + 1,
          },
        };

        const teamIds = prev.gameMode === '2P' ? ['P1', 'P2'] : ['A', 'B'];

        const handsByTeam: Record<string, Card[]> = {};
        teamIds.forEach(tId => { handsByTeam[tId] = []; });
        Object.values(updatedPlayers).forEach(p => {
          if (p) {
            const tId = getTeamKey(p, prev.gameMode);
            handsByTeam[tId].push(...p.hand);
          }
        });

        const modasByTeam: Record<string, number> = {};
        teamIds.forEach(tId => { modasByTeam[tId] = 0; });
        Object.values(updatedPlayers).forEach(p => {
          if (p) {
            const tId = getTeamKey(p, prev.gameMode);
            modasByTeam[tId] += p.modaCount;
          }
        });

        const bScores = calculateBazziScores(teamIds, prev.combinations, handsByTeam, modasByTeam);

        const bazziRes: BazziResult = {
          bazziNumber: prev.currentBazzi,
          scores: bScores,
          winnerId: currentTeamKey,
        };

        const updatedBazziResults = [...(prev.bazziResults || []), bazziRes];

        let overallWinner = currentTeamKey;
        if (teamIds.length === 2) {
          const scoreA = bScores[teamIds[0]]?.total || 0;
          const scoreB = bScores[teamIds[1]]?.total || 0;
          if (scoreA > scoreB) overallWinner = teamIds[0];
          else if (scoreB > scoreA) overallWinner = teamIds[1];
        }

        const nextState: GameState = {
          ...prev,
          modaCount: 2,
          players: updatedPlayers,
          bazziResults: updatedBazziResults,
          phase: 'GAME_OVER',
          winner: overallWinner,
          lastAction: `🎉 SECOND MODA COMPLETE! ${currentActiveP ? currentActiveP.name : activeId} completed the Bazzi! Champion: ${overallWinner}`,
          version: (prev.version || 1) + 1,
          updatedAt: Date.now(),
        };

        console.log(`[SECOND MODA] GAME OVER! Winner: ${overallWinner}, Scores:`, bScores);
        console.log(`[REALTIME BROADCAST] roomCode:${nextState.onlineRoomCode} version:${nextState.version}`);

        syncOnlineState(nextState);
        return nextState;
      });

      return { success: true, message: 'Second Moda successful! Game complete. Winner declared!' };
    }
  }, [state, endBazzi, syncOnlineState]);

  const sayHello = useCallback(() => {
    soundEngine.playClick();
    setState(prev => {
      const activeId = prev.playerOrder[prev.currentTurnIndex];
      const activePlayer = prev.players[activeId];
      if (!activePlayer) return prev;
      const activeName = activePlayer.name || activeId;

      const hasMelded = prev.hasMeldedThisTurn || (activePlayer.justClaimedBhukharaThisTurn && activePlayer.hand.length < 13);

      // RULE 1: If player claimed Bhukhara but did NOT meld/play any card, revert Bhukhara pile & end turn
      if ((prev.claimedBhukharaThisTurn || activePlayer.justClaimedBhukharaThisTurn) && !hasMelded) {
        soundEngine.playCardShuffle();
        const bhukharaRevertedPile = [...(activePlayer.hand || [])];
        const restoredPlayerHand: Card[] = [];

        const updatedPlayers = {
          ...prev.players,
          [activeId]: {
            ...activePlayer,
            hand: restoredPlayerHand,
            hasClaimedBhukhara: false,
            justClaimedBhukharaThisTurn: false,
            modaCount: Math.max(0, activePlayer.modaCount - 1),
          },
        };

        const stateAfterRevert: GameState = {
          ...prev,
          bhukharaPile: bhukharaRevertedPile,
          players: updatedPlayers,
          modaCount: Math.max(0, prev.modaCount - 1),
          claimedBhukharaThisTurn: false,
          hasMeldedThisTurn: false,
          lastAction: `↩️ BHUKHARA REVERTED! ${activeName} could not play any card from Bhukhara. 13 cards closed back to Bhukhara pile & turn ended.`,
          version: (prev.version || 1) + 1,
          updatedAt: Date.now(),
        };

        const nextState = advanceTurn(stateAfterRevert);
        syncOnlineState(nextState);
        return nextState;
      }

      // Valid Say Hello after melding cards: Preserve player's remaining hand cards INTACT!
      const updatedPlayers = {
        ...prev.players,
        [activeId]: {
          ...activePlayer,
          justClaimedBhukharaThisTurn: false,
          // hand remains intact with activePlayer.hand
        },
      };

      const stateBeforeAdvance: GameState = {
        ...prev,
        players: updatedPlayers,
        claimedBhukharaThisTurn: false,
        hasMeldedThisTurn: false,
        pickedFromOpenDeckThisTurn: false,
        lastAction: `👋 ${activeName} claimed Bhukhara cards, melded combinations, and said HELLO! Turn passed to next player.`,
        version: (prev.version || 1) + 1,
        updatedAt: Date.now(),
      };

      const nextState = advanceTurn(stateBeforeAdvance);
      console.log(`[SAY HELLO] SUCCESS! version:${nextState.version} room:${nextState.onlineRoomCode} nextPlayer:${nextState.currentTurnPlayerId}`);
      syncOnlineState(nextState);
      return nextState;
    });
  }, [advanceTurn, syncOnlineState]);

  const restartCurrentGame = useCallback(() => {
    startNewGame(state.gameMode, state.bazziMode);
  }, [state.gameMode, state.bazziMode, startNewGame]);

  const toggleSound = useCallback(() => {
    setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const toggleMusic = useCallback(() => {
    setState(prev => ({ ...prev, musicEnabled: !prev.musicEnabled }));
  }, []);

  const setAIDifficulty = useCallback((difficulty: any) => {
    setState(prev => ({ ...prev, aiDifficulty: difficulty }));
  }, []);

  useEffect(() => {
    if (state.phase === 'GAME_OVER' || state.phase === 'FOUL' || state.phase === 'DEAL' || state.isOnlineMode) return;

    const activeId = state.playerOrder[state.currentTurnIndex];
    const activePlayer = state.players[activeId];

    if (activePlayer && !activePlayer.isHuman) {
      const teamKey = getTeamKey(activePlayer, state.gameMode);
      const teamCombs = (state.combinations && state.combinations[teamKey]) ? state.combinations[teamKey] : [];
      const allCombs: Combination[] = [];
      if (state.combinations) {
        Object.values(state.combinations).forEach(list => {
          if (Array.isArray(list)) allCombs.push(...list);
        });
      }

      const aiDecision = getAIDecision(
        activePlayer,
        state.hasDrawnThisTurn,
        state.mustDiscard,
        teamCombs,
        allCombs,
        state.openDeck,
        state,
        state.aiDifficulty || 'MASTER'
      );

      const delay = aiDecision.thinkingDelayMs || 1200;

      const timer = setTimeout(() => {
        if (aiDecision.reasonLog) {
          console.log(`🤖 [AI ${state.aiDifficulty || 'MASTER'} TURN] Player:${activePlayer.name} (${activeId}) -> Action:${aiDecision.action} | Log:${aiDecision.reasonLog}`);
        }

        if (aiDecision.action === 'DRAW_CLOSE') {
          drawFromCloseDeck();
        } else if (aiDecision.action === 'TAKE_OPEN') {
          takeFromOpenDeck(aiDecision.openCardIndex);
        } else if (aiDecision.action === 'MODA') {
          attemptModa();
        } else if (aiDecision.action === 'HELLO') {
          sayHello();
        } else if (aiDecision.action === 'OPEN_COMBINATIONS') {
          if (aiDecision.cardsToMeld && aiDecision.cardsToMeld.length > 0) {
            const meld = aiDecision.cardsToMeld[0];
            setSelectedCardIds(meld.map(c => c.id));
            if (!activePlayer.hasOpenedPureSeries) {
              openSeriesFromSelection();
            } else {
              if (isValidPureSeries(meld) || isValidSeries(meld)) {
                openSeriesFromSelection();
              } else {
                openTriplicateFromSelection();
              }
            }
          } else if (aiDecision.cardsToAdd && aiDecision.cardsToAdd.length > 0) {
            const addTarget = aiDecision.cardsToAdd[0];
            setSelectedCardIds([addTarget.card.id]);
            addSelectionToCombination(addTarget.combinationId);
          } else {
            if (activePlayer.hand.length > 0) {
              const dCard = selectSmartAIDiscardCard(
                activePlayer.hand,
                activePlayer.hasOpenedPureSeries,
                teamCombs,
                allCombs,
                getPublicSeenCardCounts(allCombs, state.openDeck, activePlayer.hand),
                state.aiDifficulty || 'MASTER'
              );
              setSelectedCardIds([dCard.id]);
              discardSelectedCard();
            }
          }
        } else if (aiDecision.action === 'DISCARD') {
          const dCard = aiDecision.discardCard || activePlayer.hand[0];
          if (dCard) {
            setSelectedCardIds([dCard.id]);
            discardSelectedCard();
          }
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [
    state.currentTurnIndex,
    state.hasDrawnThisTurn,
    state.phase,
    state.playerOrder,
    state.players,
    drawFromCloseDeck,
    takeFromOpenDeck,
    attemptModa,
    openSeriesFromSelection,
    openTriplicateFromSelection,
    discardSelectedCard,
    state.gameMode,
    state.combinations,
    state.openDeck,
    state.mustDiscard,
  ]);

  return (
    <GameContext.Provider
      value={{
        state,
        selectedCardIds,
        activeEmote,
        selectCard,
        clearCardSelection,
        sortHand,
        startNewGame,
        continueSavedGame,
        drawFromCloseDeck,
        takeFromOpenDeck,
        openSeriesFromSelection,
        openTriplicateFromSelection,
        addSelectionToCombination,
        discardSelectedCard,
        attemptModa,
        sayHello,
        restartCurrentGame,
        resetToHome,
        toggleSound,
        toggleMusic,
        setAIDifficulty,
        setOnlineGameState,
        sendOnlineEmote,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
