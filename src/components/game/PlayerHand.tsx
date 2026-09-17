import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { CardComponent } from '../common/CardComponent';

export const PlayerHand: React.FC = () => {
  const { state, selectedCardIds, selectCard } = useGame();
  const [pureSeriesToast, setPureSeriesToast] = useState(false);

  const players = state?.players || {};
  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const humanPlayer = players[myPlayerId] || players['P1'] || Object.values(players)[0];

  // Register global toast trigger for ActionPanel to call
  useEffect(() => {
    (window as any).__showPureSeriesNeeded = () => {
      setPureSeriesToast(true);
      setTimeout(() => setPureSeriesToast(false), 2800);
    };
    return () => { delete (window as any).__showPureSeriesNeeded; };
  }, []);

  if (!humanPlayer || !Array.isArray(humanPlayer.hand)) return null;

  const count = humanPlayer.hand.length;

  const getOverlapMargin = (index: number): string => {
    if (index === 0) return '0px';
    if (count <= 4) return '4px';
    if (count <= 6) return '-4px';
    if (count <= 9) return '-10px';
    if (count <= 12) return '-16px';
    if (count <= 14) return '-20px';
    return '-24px';
  };

  return (
    <div className="player-hand-compact-section">
      {/* Pure Series Toast */}
      {pureSeriesToast && (
        <div className="pure-series-toast">⚡ Pure Series required first!</div>
      )}



      {/* Cards Row */}
      <div className="cards-hand-compact-container">
        {count === 0 ? (
          <div className="empty-hand-banner-compact">✋ Hand empty</div>
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
                  small={false}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
