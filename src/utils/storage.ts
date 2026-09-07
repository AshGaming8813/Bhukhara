import type { GameState } from '../types/game';

const SAVE_KEY = 'BHUKHARA_GAME_SAVE_V1';

export function saveGameState(state: GameState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, serialized);
  } catch (err) {
    console.error('Failed to save game state to localStorage:', err);
  }
}

export function loadGameState(): GameState | null {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.players || !parsed.playerOrder || !Array.isArray(parsed.playerOrder) || parsed.playerOrder.length === 0) {
      return null;
    }
    return parsed as GameState;
  } catch (err) {
    console.error('Failed to load game state from localStorage:', err);
    return null;
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.error('Failed to clear game state:', err);
  }
}
