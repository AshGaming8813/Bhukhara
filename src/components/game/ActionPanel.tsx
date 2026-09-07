import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Layers, Plus, Users, Trash2, Award, Smile } from 'lucide-react';

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
  } = useGame();

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!state) return null;

  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const players = state.players || {};
  const playerOrder = state.playerOrder || ['P1', 'P2'];
  const currentTurnIndex = (typeof state.currentTurnIndex === 'number' && state.currentTurnIndex < playerOrder.length) ? state.currentTurnIndex : 0;
  const activePlayer = players[playerOrder[currentTurnIndex]];
  const isHumanTurn = playerOrder[currentTurnIndex] === myPlayerId;

  const showMsg = (text: string, type: 'success' | 'error' = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleOpenSeries = () => {
    const res = openSeriesFromSelection();
    if (!res.success) {
      showMsg(res.message, 'error');
    } else {
      showMsg(res.message, 'success');
    }
  };

  const handleOpenTriplicate = () => {
    const res = openTriplicateFromSelection();
    if (!res.success) {
      showMsg(res.message, 'error');
    } else {
      showMsg(res.message, 'success');
    }
  };

  const handleDiscard = () => {
    const res = discardSelectedCard();
    if (!res.success) {
      showMsg(res.message, 'error');
    }
  };

  const handleModa = () => {
    const res = attemptModa();
    if (!res.success) {
      showMsg(res.message, 'error');
    } else {
      showMsg(res.message, 'success');
    }
  };

  const hasClaimedBhukhara = !!activePlayer?.justClaimedBhukharaThisTurn || !!state.claimedBhukharaThisTurn || state.phase === 'HELLO_WAIT';
  const isDrawDisabled = !isHumanTurn || state.hasDrawnThisTurn;
  const isMeldDisabled = !isHumanTurn || !state.hasDrawnThisTurn;
  const isDiscardDisabled = !isHumanTurn || !state.hasDrawnThisTurn || selectedCardIds.length !== 1 || hasClaimedBhukhara;
  const isModaDisabled = !isHumanTurn || activePlayer?.hand?.length !== 1;
  const isHelloDisabled = !isHumanTurn;
  const showHelloButton = hasClaimedBhukhara;

  return (
    <div className="action-panel-compact-container mockup-action-panel">
      {message && (
        <div className={`toast-message toast-${message.type}`}>{message.text}</div>
      )}

      <div className="mockup-action-buttons-group">
        {/* Series (Green) */}
        <button
          className="btn-mockup-action btn-open-series"
          disabled={isMeldDisabled}
          onClick={handleOpenSeries}
        >
          <div className="btn-icon-circle"><Plus size={15} /></div>
          <div className="btn-text-content">
            <span className="btn-main-label">Series</span>
            <span className="btn-sub-label">(3–7 cards)</span>
          </div>
        </button>

        {/* Triplicate (Purple) */}
        <button
          className="btn-mockup-action btn-open-triplicate"
          disabled={isMeldDisabled}
          onClick={handleOpenTriplicate}
        >
          <div className="btn-icon-circle"><Users size={15} /></div>
          <div className="btn-text-content">
            <span className="btn-main-label">Triplicate</span>
            <span className="btn-sub-label">(3–7 cards)</span>
          </div>
        </button>

        {/* Draw Button (Blue) */}
        <button
          className="btn-mockup-action btn-draw-card"
          disabled={isDrawDisabled || (state.closeDeck.length === 0 && state.openDeck.length === 0)}
          onClick={drawFromCloseDeck}
        >
          <div className="btn-icon-circle"><Layers size={16} /></div>
          <div className="btn-text-content">
            <span className="btn-main-label">Draw</span>
            <span className="btn-sub-label">(1 card)</span>
          </div>
        </button>

        {/* Discard Button (Red) */}
        <button
          className="btn-mockup-action btn-discard-card"
          disabled={isDiscardDisabled}
          onClick={handleDiscard}
        >
          <div className="btn-icon-circle"><Trash2 size={16} /></div>
          <div className="btn-text-content">
            <span className="btn-main-label">Discard</span>
            <span className="btn-sub-label">(1 card)</span>
          </div>
        </button>

        {/* Moda Button (Gold) */}
        <button
          className="btn-mockup-action btn-moda-gold"
          disabled={isModaDisabled}
          onClick={handleModa}
        >
          <div className="btn-icon-circle"><Award size={16} /></div>
          <div className="btn-text-content">
            <span className="btn-main-label">Moda</span>
            <span className="btn-sub-label">(1 card left)</span>
          </div>
        </button>

        {/* Say Hello Button */}
        {showHelloButton && (
          <button
            className="btn-mockup-action btn-say-hello"
            disabled={isHelloDisabled}
            onClick={sayHello}
          >
            <div className="btn-icon-circle"><Smile size={16} /></div>
            <div className="btn-text-content">
              <span className="btn-main-label">Say Hello</span>
              <span className="btn-sub-label">(No discard)</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
