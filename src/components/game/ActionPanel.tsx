import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Layers, Plus, Users, Trash2, Award, Smile, ArrowUpDown, Palette, XCircle } from 'lucide-react';

export const ActionPanel: React.FC = () => {
  const {
    state,
    selectedCardIds,
    drawFromCloseDeck,
    openSeriesFromSelection,
    openTriplicateFromSelection,
    discardSelectedCard,
    attemptModa,
    sayHello,
    sortHand,
    clearCardSelection
  } = useGame();

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!state) return null;

  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const players = state.players || {};
  const myPlayer = players[myPlayerId] || players['P1'] || Object.values(players)[0];
  const playerOrder = state.playerOrder || ['P1', 'P2'];
  const currentTurnIndex = (typeof state.currentTurnIndex === 'number' && state.currentTurnIndex < playerOrder.length) ? state.currentTurnIndex : 0;
  const activePlayer = players[playerOrder[currentTurnIndex]];
  const isHumanTurn = playerOrder[currentTurnIndex] === myPlayerId;

  const showMsg = (text: string, type: 'success' | 'error' = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleOpenSeries = () => {
    const res = openSeriesFromSelection();
    if (!res.success) {
      if (res.message && res.message.toLowerCase().includes('pure') && typeof (window as any).__showPureSeriesNeeded === 'function') {
        (window as any).__showPureSeriesNeeded();
      } else {
        showMsg(res.message, 'error');
      }
    } else {
      showMsg(res.message, 'success');
    }
  };

  const handleOpenTriplicate = () => {
    const res = openTriplicateFromSelection();
    if (!res.success) {
      if (res.message && res.message.toLowerCase().includes('pure') && typeof (window as any).__showPureSeriesNeeded === 'function') {
        (window as any).__showPureSeriesNeeded();
      } else {
        showMsg(res.message, 'error');
      }
    } else {
      showMsg(res.message, 'success');
    }
  };

  const handleDiscard = () => {
    const res = discardSelectedCard();
    if (!res.success) showMsg(res.message, 'error');
  };

  const handleModa = () => {
    const res = attemptModa();
    if (!res.success) showMsg(res.message, 'error');
    else showMsg(res.message, 'success');
  };

  const hasClaimedBhukhara = !!activePlayer?.justClaimedBhukharaThisTurn || !!state.claimedBhukharaThisTurn || state.phase === 'HELLO_WAIT';
  const isDrawDisabled = !isHumanTurn || state.hasDrawnThisTurn;
  const isMeldDisabled = !isHumanTurn || !state.hasDrawnThisTurn;
  const isDiscardDisabled = !isHumanTurn || !state.hasDrawnThisTurn || selectedCardIds.length !== 1 || hasClaimedBhukhara;
  const isModaDisabled = !isHumanTurn || activePlayer?.hand?.length !== 1 || !state.hasDrawnThisTurn || (activePlayer?.justClaimedBhukharaThisTurn && state.modaCount >= 1);
  const isHelloDisabled = !isHumanTurn;
  const showHelloButton = hasClaimedBhukhara;

  const count = myPlayer?.hand?.length || 0;

  return (
    <div className="action-panel-compact-container mockup-action-panel">
      {message && (
        <div className={`toast-message toast-${message.type}`}>{message.text}</div>
      )}

      <div className="unified-action-bar">
        {/* Left Side: Hand Info */}
        <div className="hand-title-compact">
          <span className="hand-count-pill">🃏 {count} {count === 1 ? 'Card' : 'Cards'}</span>
          {myPlayer?.hasOpenedPureSeries
            ? <span className="pure-status pure-opened">✓ Pure</span>
            : <span className="pure-status pure-needed-mini">Pure ✗</span>
          }
        </div>

        {/* Center: Action Buttons */}
        <div className="mockup-action-buttons-group">
          <button
            className="btn-mockup-action btn-open-series"
            disabled={isMeldDisabled}
            onClick={handleOpenSeries}
            title="Open Series (3–7 cards same suit in sequence)"
          >
            <div className="btn-icon-circle"><Plus size={14} /></div>
            <span className="btn-main-label">Series</span>
          </button>

          <button
            className="btn-mockup-action btn-open-triplicate"
            disabled={isMeldDisabled}
            onClick={handleOpenTriplicate}
            title="Open Triplicate (3–7 cards same rank)"
          >
            <div className="btn-icon-circle"><Users size={14} /></div>
            <span className="btn-main-label">Tripl.</span>
          </button>

          <button
            className="btn-mockup-action btn-draw-card"
            disabled={isDrawDisabled || (state.closeDeck.length === 0 && state.openDeck.length === 0)}
            onClick={drawFromCloseDeck}
            title="Draw 1 card from Close Deck"
          >
            <div className="btn-icon-circle"><Layers size={14} /></div>
            <span className="btn-main-label">Draw</span>
          </button>

          <button
            className="btn-mockup-action btn-discard-card"
            disabled={isDiscardDisabled}
            onClick={handleDiscard}
            title="Discard selected card"
          >
            <div className="btn-icon-circle"><Trash2 size={14} /></div>
            <span className="btn-main-label">Discard</span>
          </button>

          <button
            className="btn-mockup-action btn-moda-gold"
            disabled={isModaDisabled}
            onClick={handleModa}
            title="Declare Moda (1 card left)"
          >
            <div className="btn-icon-circle"><Award size={14} /></div>
            <span className="btn-main-label">Moda</span>
          </button>

          {showHelloButton && (
            <button
              className="btn-mockup-action btn-say-hello"
              disabled={isHelloDisabled}
              onClick={sayHello}
              title="Say Hello after Bhukhara"
            >
              <div className="btn-icon-circle"><Smile size={14} /></div>
              <span className="btn-main-label">Hello</span>
            </button>
          )}
        </div>

        {/* Right Side: Sorting */}
        <div className="hand-sort-controls-compact">
          <button className="btn btn-tiny-compact" onClick={() => sortHand('rank')}>
            <ArrowUpDown size={11} /> Rank
          </button>
          <button className="btn btn-tiny-compact" onClick={() => sortHand('suit')}>
            <Palette size={11} /> Suit
          </button>
          {isHumanTurn && selectedCardIds.length > 0 && (
            <button className="btn btn-tiny-compact btn-danger" onClick={clearCardSelection}>
              <XCircle size={11} /> ({selectedCardIds.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
