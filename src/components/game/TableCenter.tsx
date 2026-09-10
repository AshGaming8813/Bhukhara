import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { CardComponent } from '../common/CardComponent';
import { X } from 'lucide-react';

export const TableCenter: React.FC = () => {
  const { state, drawFromCloseDeck, takeFromOpenDeck } = useGame();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isOpenDeckExpanded, setIsOpenDeckExpanded] = useState(false);

  if (!state) return null;

  const playerOrder = Array.isArray(state.playerOrder) ? state.playerOrder : ['P1', 'P2'];
  const currentTurnIndex = (typeof state.currentTurnIndex === 'number' && state.currentTurnIndex < playerOrder.length) ? state.currentTurnIndex : 0;

  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const isHumanTurn = playerOrder[currentTurnIndex] === myPlayerId;
  const canDraw = isHumanTurn && !state.hasDrawnThisTurn;

  const closeDeck = Array.isArray(state.closeDeck) ? state.closeDeck : [];
  const openDeck = Array.isArray(state.openDeck) ? state.openDeck : [];
  const bhukharaPile = Array.isArray(state.bhukharaPile) ? state.bhukharaPile : [];

  const lastPlayedCard = openDeck.length > 0 ? openDeck[openDeck.length - 1] : null;

  // Single Click / Tap handler (opens/toggles viewer)
  const handleOpenDeckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpenDeckExpanded(prev => !prev);
  };

  // Double Click / Double Tap handler (takes cards)
  const handleOpenDeckDoubleClick = (e: React.MouseEvent, cardIndex: number) => {
    e.stopPropagation();
    if (canDraw) {
      takeFromOpenDeck(cardIndex);
      setIsOpenDeckExpanded(false);
    }
  };

  return (
    <div className="table-center-area mockup-center-area">
      {/* 2-Bazzi Mode Badge & Lead Status Indicator */}
      {state.bazziMode === 2 && (
        <div className="bazzi-mode-tracker-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ background: 'rgba(212, 175, 55, 0.25)', border: '1px solid #d4af37', padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 900, color: '#f1c40f' }}>
            🏆 BAZZI {state.currentBazzi || 1} OF 2
          </span>
          {state.currentBazzi === 2 && state.leadScore && (
            <span style={{ background: 'rgba(46, 204, 113, 0.25)', border: '1px solid #2ecc71', padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, color: '#2ecc71' }}>
              📊 Bazzi 1 Lead: {Object.entries(state.leadScore).map(([team, val]) => `${team}: ${val >= 0 ? '+' : ''}${val.toFixed(1)}`).join(' · ')}
            </span>
          )}
        </div>
      )}

      {/* 4P & 2P Turn Sequence Tracker */}
      <div className="turn-sequence-tracker" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
        {playerOrder.map((pid, idx) => {
          const isCurrent = idx === currentTurnIndex;
          const pObj = state.players ? state.players[pid] : undefined;
          const pLabel = pid === myPlayerId ? 'P1 (You)' : (pObj?.name || pid);
          return (
            <React.Fragment key={pid}>
              <span style={{
                padding: '3px 9px',
                borderRadius: '12px',
                fontSize: '0.74rem',
                fontWeight: isCurrent ? 900 : 600,
                background: isCurrent ? 'linear-gradient(135deg, #f39c12, #d4af37)' : 'rgba(0, 0, 0, 0.45)',
                color: isCurrent ? '#000' : 'rgba(255, 255, 255, 0.7)',
                border: isCurrent ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: isCurrent ? '0 0 12px rgba(241, 196, 15, 0.7)' : 'none',
                transition: 'all 0.3s ease',
              }}>
                {pLabel} {isCurrent ? '⚡' : ''}
              </span>
              {idx < playerOrder.length - 1 && <span style={{ color: '#d4af37', fontSize: '0.75rem', fontWeight: 800 }}>➔</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Close Deck, Open Deck & Bhukhara Deck Unified 3-Box Stage */}
      <div className="decks-row-unified">
        {/* Close Deck Box */}
        <div className="deck-card-box close-deck-box" title="Close Draw Deck">
          <div className="deck-card-stage">
            {closeDeck.length > 0 ? (
              <div
                className={`deck-stack-3d ${canDraw ? 'clickable-deck' : ''}`}
                onClick={() => {
                  if (canDraw) drawFromCloseDeck();
                }}
                title={canDraw ? 'Click to draw 1 card from Close Deck' : ''}
              >
                {closeDeck.length > 2 && <div className="card-stack-back card-back-layer-2" />}
                {closeDeck.length > 1 && <div className="card-stack-back card-back-layer-1" />}
                <CardComponent card={closeDeck[0]} isFaceDown={true} />
                <div className="deck-count-pill-gold">{closeDeck.length} Cards</div>
              </div>
            ) : (
              <div className="empty-deck-slot">
                <span>EMPTY</span>
              </div>
            )}
          </div>
        </div>

        {/* Open Deck Box */}
        <div
          className="deck-card-box open-deck-box"
          onMouseEnter={() => setIsOpenDeckExpanded(true)}
          onMouseLeave={() => setIsOpenDeckExpanded(false)}
          title="Open Discard Deck"
        >
          <div className="deck-card-stage">
            {openDeck.length > 0 ? (
              <div
                className="open-deck-stage-wrapper"
                onClick={handleOpenDeckClick}
                onDoubleClick={(e) => handleOpenDeckDoubleClick(e, 0)}
              >
                <div className="open-deck-card-container">
                  {openDeck.slice(-3).map((card, sliceIdx, arr) => {
                    const globalIdx = openDeck.length - arr.length + sliceIdx;
                    const offsetLeft = sliceIdx * 4;
                    const offsetTop = sliceIdx * 2;

                    return (
                      <div
                        key={card.id}
                        className={`open-card-item-stacked ${canDraw ? 'clickable-card' : ''} ${
                          hoveredIndex === globalIdx ? 'will-take-highlight' : ''
                        }`}
                        style={{
                          position: sliceIdx === 0 ? 'relative' : 'absolute',
                          left: `${offsetLeft}px`,
                          top: `${offsetTop}px`,
                          zIndex: sliceIdx + 1,
                        }}
                        onMouseEnter={() => setHoveredIndex(globalIdx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={handleOpenDeckClick}
                        onDoubleClick={(e) => handleOpenDeckDoubleClick(e, globalIdx)}
                        title={canDraw ? 'Hover/Tap to inspect · Double Tap/Click to take cards' : 'Hover/Tap to inspect cards'}
                      >
                        <CardComponent card={card} />
                      </div>
                    );
                  })}
                  <div className="deck-count-pill-gold open-count-pill">{openDeck.length} Cards</div>
                </div>
              </div>
            ) : (
              <div className="empty-deck-slot">
                <span>EMPTY</span>
              </div>
            )}
          </div>
        </div>

        {/* Decorated Bhukhara Deck Box */}
        <div className="deck-card-box bhukhara-deck-box" title="Bhukhara 13-Card Bonus Deck Pile">
          <div className="deck-card-stage">
            {bhukharaPile.length > 0 ? (
              <div className="bhukhara-corner-card-stack">
                <div className="bhukhara-deck-back layer-2" />
                <div className="bhukhara-deck-back layer-1" />
                <div className="bhukhara-deck-top-card">
                  <span className="bhukhara-deck-star">⭐</span>
                  <span className="bhukhara-deck-label">BHUKHARA</span>
                </div>
                <div className="bhukhara-badge-count">{bhukharaPile.length} Cards</div>
              </div>
            ) : (
              <div className="empty-deck-slot bhukhara-claimed-slot">
                <span className="claimed-star">⭐</span>
                <span>CLAIMED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Bottom Info Strip */}
      <div className="center-bottom-info-strip">
        <div className="info-chip last-card-chip" title="Last Card Played into Open Deck">
          <span className="chip-label">LAST DISCARD:</span>
          {lastPlayedCard ? (
            <span className={`chip-val ${lastPlayedCard.color === 'RED' ? 'text-red' : 'text-white'}`}>
              {lastPlayedCard.rank}{lastPlayedCard.suit === 'HEARTS' ? '♥' : lastPlayedCard.suit === 'DIAMONDS' ? '♦' : lastPlayedCard.suit === 'CLUBS' ? '♣' : '♠'}
            </span>
          ) : (
            <span className="chip-val muted-val">None</span>
          )}
        </div>

        <div className="info-chip moda-chip">
          <span className="chip-label">MODAS:</span>
          <span className="chip-val gold-val">{state.modaCount} / 2</span>
        </div>
      </div>

      {/* Interactive Expanded Open Deck Cards Viewer Overlay */}
      {isOpenDeckExpanded && openDeck.length > 0 && (
        <div
          className="open-deck-viewer-overlay"
          onMouseEnter={() => setIsOpenDeckExpanded(true)}
          onMouseLeave={() => setIsOpenDeckExpanded(false)}
        >
          <div className="viewer-header">
            <span>ALL OPEN DECK CARDS ({openDeck.length} CARDS)</span>
            <button
              className="btn-close-viewer"
              onClick={() => setIsOpenDeckExpanded(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="viewer-cards-scroll">
            {openDeck.map((card, idx) => (
              <div
                key={card.id}
                className={`viewer-card-wrapper ${canDraw ? 'clickable-card' : ''}`}
                onClick={(e) => {
                  if (canDraw) {
                    e.stopPropagation();
                    takeFromOpenDeck(idx);
                    setIsOpenDeckExpanded(false);
                  }
                }}
                onDoubleClick={(e) => handleOpenDeckDoubleClick(e, idx)}
                title={canDraw ? `Click / Double Tap to pick up ALL cards starting from ${card.rank} ${card.suit}` : ''}
              >
                <CardComponent card={card} />
                <span className="card-index-tag">#{idx + 1}</span>
              </div>
            ))}
          </div>

          {canDraw && (
            <div className="viewer-action-hint">
              ✋ Double tap or click any card to compulsory pick up ALL {openDeck.length} cards from Open Deck!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
