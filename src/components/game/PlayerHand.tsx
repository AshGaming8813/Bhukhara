import React from 'react';
import { useGame } from '../../context/GameContext';
import { CardComponent } from '../common/CardComponent';
import { ArrowUpDown, Palette, XCircle } from 'lucide-react';

export const PlayerHand: React.FC = () => {
  const { state, selectedCardIds, selectCard, clearCardSelection, sortHand } = useGame();
  const players = state?.players || {};
  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const humanPlayer = players[myPlayerId] || players['P1'] || Object.values(players)[0];

  if (!humanPlayer || !Array.isArray(humanPlayer.hand)) return null;

  const count = humanPlayer.hand.length;
  const getOverlapMargin = (index: number): string => {
    if (index === 0) return '0px';
    if (count <= 6) return '-8px';
    if (count <= 10) return '-14px';
    if (count <= 14) return '-18px';
    return '-22px';
  };

  return (
    <div className="player-hand-compact-section">
      <div className="hand-compact-header">
        <div className="hand-title-compact">
          <span className="hand-count">Your Hand ({count} Cards)</span>
          {humanPlayer.hasOpenedPureSeries ? (
            <span className="pure-status pure-opened">✓ Pure Series Opened</span>
          ) : (
            <span className="pure-status pure-needed">⚡ Pure Series Needed</span>
          )}
        </div>

        <div className="hand-sort-controls-compact">
          <button className="btn btn-tiny-compact" onClick={() => sortHand('rank')}>
            <ArrowUpDown size={12} /> Sort Rank
          </button>
          <button className="btn btn-tiny-compact" onClick={() => sortHand('suit')}>
            <Palette size={12} /> Sort Suit
          </button>
          {selectedCardIds.length > 0 && (
            <button className="btn btn-tiny-compact btn-danger" onClick={clearCardSelection}>
              <XCircle size={12} /> Clear ({selectedCardIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Ultra-Compact Cards Row */}
      <div className="cards-hand-compact-container">
        {count === 0 ? (
          <div className="empty-hand-banner-compact">
            ✋ HAND EMPTY — WAITING FOR NEXT TURN
          </div>
        ) : (
          humanPlayer.hand.map((card, idx) => {
            const isSelected = selectedCardIds.includes(card.id);
            return (
              <div
                key={card.id}
                className="hand-card-compact-wrapper"
                style={{
                  marginLeft: getOverlapMargin(idx),
                  zIndex: isSelected ? 50 : idx + 1,
                }}
              >
                <CardComponent
                  card={card}
                  isSelected={isSelected}
                  onClick={() => selectCard(card.id)}
                  small={true}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
