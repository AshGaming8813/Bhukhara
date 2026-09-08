import React, { useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { Trophy, RotateCcw, Home, Star, Coins, Frown } from 'lucide-react';
import { addPlayerCoins } from '../../services/authBackend';

interface WinnerModalProps {
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ onPlayAgain, onBackToHome }) => {
  const { state } = useGame();
  const hasAwardedRef = useRef(false);

  const isGameOver = state.phase === 'GAME_OVER' && !!state.winner;
  const is2P = state.gameMode === '2P';
  const isDraw = state.winner === 'DRAW';
  const coinWager = state.coinWager || 0;
  const totalPot = coinWager * (is2P ? 2 : 4);

  const myPlayerId = state.localPlayerId || 'P1';
  const myPlayer = state.players ? state.players[myPlayerId] : undefined;
  const myTeam = myPlayer ? myPlayer.team : (myPlayerId === 'P1' || myPlayerId === 'P3' ? 'A' : 'B');

  // Determine if THIS specific client is the winner
  const isWinner = !isDraw && (
    is2P
      ? state.winner === myPlayerId
      : (state.winner === myTeam || state.winner === myPlayerId)
  );

  useEffect(() => {
    if (isGameOver && !isDraw && coinWager > 0 && !hasAwardedRef.current) {
      if (isWinner) {
        hasAwardedRef.current = true;
        addPlayerCoins(totalPot);
      }
    }
  }, [isGameOver, isDraw, coinWager, totalPot, isWinner]);

  if (!isGameOver) return null;

  // Winner display name calculation for client UI
  const winnerPlayer = state.winner && state.players ? state.players[state.winner] : null;
  const winnerNameStr = winnerPlayer?.name
    ? `${winnerPlayer.name} (${state.winner})`
    : is2P
    ? (state.winner === 'P1' ? 'PLAYER 1' : (state.isOnlineMode ? 'PLAYER 2' : 'P2 (AI)'))
    : `TEAM ${state.winner}`;

  const winnerTitle = isDraw
    ? '🤝 BAZZI DRAW!'
    : isWinner
    ? '🏆 YOU WIN!'
    : '💔 YOU LOST!';

  const winnerBadgeText = isDraw
    ? 'Close Deck Empty (0 Cards) — Game Draw'
    : isWinner
    ? 'YOU ARE THE BHUKHARA CHAMPION!'
    : `WINNER: ${winnerNameStr}`;

  const teamKeys = is2P ? ['P1', 'P2'] : ['A', 'B'];
  const winnerKey = state.winner || 'P1';
  const loserKey = teamKeys.find(k => k !== winnerKey) || teamKeys[0];

  let winnerScore = 0;
  let loserScore = 0;

  state.bazziResults.forEach(res => {
    winnerScore += res.scores[winnerKey]?.total || 0;
    loserScore += res.scores[loserKey]?.total || 0;
  });

  const lead = winnerScore - loserScore;

  // Get human-readable label for score columns
  const getColLabel = (key: string) => {
    if (key === myPlayerId) return `YOU (${key})`;
    if (state.players && state.players[key]) return `${state.players[key].name} (${key})`;
    if (is2P) {
      if (key === 'P1') return 'Player 1';
      return state.isOnlineMode ? 'Player 2' : 'P2 (AI)';
    }
    return `Team ${key}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-winner">
        <div className="trophy-header">
          {isDraw ? (
            <Trophy size={64} className="winner-trophy-icon" style={{ color: '#f39c12' }} />
          ) : isWinner ? (
            <Trophy size={64} className="winner-trophy-icon" />
          ) : (
            <Frown size={64} className="winner-trophy-icon" style={{ color: '#e74c3c' }} />
          )}

          <h1 className="winner-main-title">{winnerTitle}</h1>

          <div className="winner-name-badge">
            <Star className="star-icon" /> {winnerBadgeText} <Star className="star-icon" />
          </div>

          {/* Coin Challenge Winner Prize Banner */}
          {coinWager > 0 && !isDraw && isWinner && (
            <div style={{ background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)', color: '#000', padding: '8px 16px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 900, marginTop: '12px', boxShadow: '0 4px 15px rgba(241, 196, 15, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={20} /> PRIZE POOL WON: +{totalPot.toLocaleString()} VIRTUAL COINS!
            </div>
          )}

          {/* Coin Challenge Loser Banner */}
          {coinWager > 0 && !isDraw && !isWinner && (
            <div style={{ background: 'rgba(231, 76, 60, 0.15)', border: '1px solid rgba(231, 76, 60, 0.4)', color: '#ff6b6b', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700, marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={18} /> Wager Loss: -{coinWager.toLocaleString()} Virtual Coins
            </div>
          )}
        </div>

        <div className="winner-scores-box">
          <div className="score-summary-row">
            <div className="score-col winner-col">
              <span className="col-label">{getColLabel(winnerKey)}</span>
              <span className="col-score">{winnerScore.toFixed(1)} pts</span>
            </div>
            <div className="vs-col">VS</div>
            <div className="score-col loser-col">
              <span className="col-label">{getColLabel(loserKey)}</span>
              <span className="col-score">{loserScore.toFixed(1)} pts</span>
            </div>
          </div>

          {state.bazziMode === 2 && (
            <div className="lead-summary-badge">
              Victory Lead: <strong>+{lead.toFixed(1)} points</strong>
            </div>
          )}
        </div>

        {/* Detailed Bazzi breakdown table */}
        <div className="bazzi-breakdown-section">
          <h3>Bazzi Performance Breakdown</h3>
          <table className="bazzi-table">
            <thead>
              <tr>
                <th>Bazzi</th>
                <th>Combinations</th>
                <th>Moda Bonus</th>
                <th>Opponent Hand Pts</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {state.bazziResults.map((res, idx) => {
                const wScore = res.scores[winnerKey];
                return (
                  <tr key={idx}>
                    <td>Bazzi {res.bazziNumber}</td>
                    <td>{(wScore?.openPoints ?? 0).toFixed(1)}</td>
                    <td>+{(wScore?.modaBonus ?? 0)}</td>
                    <td>+{(wScore?.oppositeHandPoints ?? 0).toFixed(1)}</td>
                    <td>
                      <strong>{(wScore?.total ?? 0).toFixed(1)}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="modal-footer space-around">
          <button className="btn btn-gold btn-large" onClick={onPlayAgain}>
            <RotateCcw size={18} /> PLAY AGAIN
          </button>
          <button className="btn btn-secondary btn-large" onClick={onBackToHome}>
            <Home size={18} /> HOME
          </button>
        </div>
      </div>
    </div>
  );
};
