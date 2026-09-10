import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { CardComponent } from '../common/CardComponent';
import type { Combination, Card } from '../../types/game';
import { canCardsFitCombination } from '../../engine/validation';
import { calculateCombinationPoints } from '../../engine/scoring';
import { PlusCircle, CheckCircle2, Eye, EyeOff, User, Star } from 'lucide-react';

interface CombinationBoardProps {
  teamKey: string;
  title: string;
}

export const CombinationBoard: React.FC<CombinationBoardProps> = ({ teamKey, title: _title }) => {
  const { state, selectedCardIds = [], addSelectionToCombination } = useGame();

  if (!state) return null;

  const combinations = (state.combinations && state.combinations[teamKey]) ? state.combinations[teamKey] : [];
  const players = state.players || {};
  const playerOrder = state.playerOrder || ['P1', 'P2'];
  const currentTurnIndex = (typeof state.currentTurnIndex === 'number' && state.currentTurnIndex < playerOrder.length) ? state.currentTurnIndex : 0;

  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const activePlayer = players[playerOrder[currentTurnIndex]];
  const isHumanTurn = activePlayer?.id === myPlayerId;

  const humanPlayer = players[myPlayerId] || players['P1'] || Object.values(players)[0];
  const selectedCards: Card[] =
    humanPlayer && Array.isArray(humanPlayer.hand) && selectedCardIds.length > 0
      ? humanPlayer.hand.filter(c => c && selectedCardIds.includes(c.id))
      : [];

  const [expandedCompletedIds, setExpandedCompletedIds] = useState<string[]>([]);

  const toggleExpandCompleted = (combId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCompletedIds(prev =>
      prev.includes(combId) ? prev.filter(id => id !== combId) : [...prev, combId]
    );
  };

  const handleAddToCombination = (comb: Combination) => {
    if (!isHumanTurn || !comb) return;
    if (selectedCards.length > 0 && canCardsFitCombination(selectedCards, comb)) {
      addSelectionToCombination(comb.id);
    }
  };

  const myPlayer = players[myPlayerId];
  const myTeam = myPlayer ? myPlayer.team : 'A';
  const isHumanTeam = state.isOnlineMode ? (teamKey === myPlayerId || teamKey === myTeam) : (teamKey === 'P1' || teamKey === 'A');

  const opponentSlot = playerOrder.find(id => id !== myPlayerId) || 'P2';
  const boardOwner = players[teamKey] || (isHumanTeam ? humanPlayer : players[opponentSlot]);
  const isOwnerP1 = boardOwner?.id === myPlayerId;
  const coinsText = isOwnerP1 ? '🪙 1,250' : '🪙 980';

  let handCardsInfo = '';
  if (state.gameMode === '4P') {
    if (teamKey === 'A') {
      const p1Count = players['P1']?.hand?.length ?? 0;
      const p3Count = players['P3']?.hand?.length ?? 0;
      handCardsInfo = `P1: ${p1Count}c · P3: ${p3Count}c`;
    } else {
      const p2Count = players['P2']?.hand?.length ?? 0;
      const p4Count = players['P4']?.hand?.length ?? 0;
      handCardsInfo = `P2: ${p2Count}c · P4: ${p4Count}c`;
    }
  } else {
    const ownerHandCount = boardOwner?.hand?.length ?? 0;
    handCardsInfo = `${ownerHandCount} Cards`;
  }

  return (
    <div className={`comb-panel-container mockup-comb-panel ${isHumanTeam ? 'is-human-panel' : 'is-opponent-panel'}`}>
      {/* Panel Header Matching Mockup */}
      <div className="comb-panel-header mockup-panel-header">
        <div className="player-avatar-badge">
          <div className={`avatar-circle ${isHumanTeam ? 'blue-avatar' : 'red-avatar'}`}>
            <User size={18} />
          </div>
          <div className="player-meta-info">
            <span className="player-name-title">
              {boardOwner ? boardOwner.name : (isHumanTeam ? 'Player 1' : 'Player 2')} {isHumanTeam ? '👑' : ''}
            </span>
            <span className="player-sub-tag">
              {isHumanTeam ? `${myPlayerId} · You` : (boardOwner?.id || opponentSlot)}
              <span className="hand-count-pill-tag" title="Cards in hand">🎴 {handCardsInfo}</span>
              <span className="coins-pill-text">{coinsText}</span>
            </span>
          </div>
        </div>

        <div className="panel-title-pill">
          <span className="comb-open-count">({combinations.length} open)</span>
        </div>
      </div>

      {/* Grid of Spider Solitaire Cascade Combinations */}
      <div className="comb-panel-body">
        {combinations.length === 0 ? (
          <div className="empty-slots-wrapper">
            <div className="comb-slot-box series-slot">
              <span className="slot-title">{isHumanTeam ? 'SERIES — 0 pts' : 'SERIES'}</span>
              <div className="slot-add-icon">+</div>
            </div>
            <div className="comb-slot-box triplicate-slot">
              <span className="slot-title">{isHumanTeam ? 'TRIPLICATE — 0 pts' : 'TRIPLICATE'}</span>
              <div className="slot-add-icon">+</div>
            </div>
          </div>
        ) : (
          combinations.map(comb => {
            const pts = calculateCombinationPoints(comb);
            const isCompleted = comb.cards.length >= 7;
            const isExpanded = expandedCompletedIds.includes(comb.id);
            const isCanAdd = isHumanTurn && selectedCards.length > 0 && !isCompleted ? canCardsFitCombination(selectedCards, comb) : false;
            const jokersInComb = comb.cards.filter(c => c.isJoker);
            const hasJoker = jokersInComb.length > 0;
            const isTriplicate = comb.type === 'TRIPLICATE';

            // COMPLETED 7-CARD COMBINATION (AUTO-COLLAPSED STACK PREVIEW)
            if (isCompleted && !isExpanded) {
              return (
                <div
                  key={comb.id}
                  className="spider-stack-group completed-box"
                  onClick={e => toggleExpandCompleted(comb.id, e)}
                  title="Completed 7-Card Combination! Click to view all cards."
                >
                  <div className="stack-badge-header">
                    <span className="type-pill completed-pill">
                      <CheckCircle2 size={11} /> {isTriplicate ? 'Triplicate (7)' : 'Series (7)'}
                    </span>
                    {isHumanTeam && (
                      <span className="pts-pill">{(pts ?? 0).toFixed(0)} pts {hasJoker ? '★' : ''}</span>
                    )}
                  </div>

                  <div className="completed-stack-preview">
                    <div className="completed-card-peek peek-3"></div>
                    <div className="completed-card-peek peek-2"></div>
                    <div className="completed-card-top">
                      <CardComponent card={comb.cards[comb.cards.length - 1]} small={true} />
                    </div>
                  </div>

                  <div className="tap-view-hint">
                    <Eye size={10} /> View 7 Cards
                  </div>
                </div>
              );
            }

            // OPEN COMBINATION - SPIDER SOLITAIRE VERTICAL/CASCADE STACK
            return (
              <div
                key={comb.id}
                className={`spider-stack-group ${comb.type === 'PURE_SERIES' ? 'pure-series-group' : ''} ${isCanAdd ? 'can-add-target' : ''} ${
                  isCompleted ? 'completed-expanded' : ''
                }`}
                onClick={() => handleAddToCombination(comb)}
              >
                {/* Header Pills */}
                <div className="stack-badge-header">
                  <span className={`type-pill ${isTriplicate ? 'triplicate-pill' : 'series-pill'}`}>
                    {isTriplicate ? `Triplicate (${comb.cards.length})` : `Series (${comb.cards.length})`}
                  </span>
                  {isHumanTeam && (
                    <span className="pts-pill">{(pts ?? 0).toFixed(0)} pts {hasJoker ? '★' : ''}</span>
                  )}

                  {isCompleted && (
                    <button
                      className="btn-collapse-compact"
                      onClick={e => toggleExpandCompleted(comb.id, e)}
                      title="Collapse completed stack"
                    >
                      <EyeOff size={10} />
                    </button>
                  )}
                </div>

                {isCanAdd && (
                  <div className="add-card-overlay">
                    <PlusCircle size={14} /> ADD ({selectedCards.length})
                  </div>
                )}

                {/* Spider Solitaire Cascade Stack View */}
                <div className="spider-vertical-stack">
                  {comb.cards.map((card, idx) => {
                    const isJokerCard = card.isJoker;

                    return (
                      <div
                        key={card.id}
                        className={`spider-card-wrapper ${isJokerCard ? 'joker-card-wrapper' : ''}`}
                        style={{
                          marginTop: idx === 0 ? '0px' : '-44px',
                          zIndex: idx + 1,
                        }}
                      >
                        {isJokerCard && (
                          <div className="joker-badge-mini" title="Joker Wild Card (2)">
                            <Star size={10} fill="#f1c40f" color="#f1c40f" />
                          </div>
                        )}
                        <CardComponent card={card} small={true} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
