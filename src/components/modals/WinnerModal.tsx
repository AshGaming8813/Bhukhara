import React, { useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { Trophy, RotateCcw, Home, Star, Coins } from 'lucide-react';
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

  useEffect(() => {
    if (isGameOver && !isDraw && coinWager > 0 && !hasAwardedRef.current) {
      const myPlayerId = state.localPlayerId || 'P1';
      const myPlayer = state.players ? state.players[myPlayerId] : undefined;
      const myTeam = myPlayer ? myPlayer.team : 'A';
      const isWinner = state.winner === myPlayerId || state.winner === myTeam || state.winner === 'P1' || state.winner === 'A';

      if (isWinner) {
        hasAwardedRef.current = true;
        addPlayerCoins(totalPot);
      }
    }
  }, [isGameOver, isDraw, coinWager, totalPot, state.localPlayerId, state.players, state.winner]);

  if (!isGameOver) return null;

  const winnerName = isDraw
    ? 'BAZZI DRAW'
    : is2P
    ? state.winner === 'P1'
      ? 'PLAYER 1 (YOU)'
      : 'PLAYER 2 (AI)'
    : `TEAM ${state.winner}`;

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

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-winner">
        <div className="trophy-header">
          <Trophy size={64} className="winner-trophy-icon" />
          <h1 className="winner-main-title">{isDraw ? '🤝 BAZZI DRAW!' : 'BHUKHARA CHAMPION'}</h1>
          <div className="winner-name-badge">
            <Star className="star-icon" /> {isDraw ? 'Close Deck Empty (0 Cards) — Game Draw' : winnerName} <Star className="star-icon" />
          </div>

          {/* Coin Challenge Winner Prize Banner */}
          {coinWager > 0 && !isDraw && (
            <div style={{ background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)', color: '#000', padding: '8px 16px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 900, marginTop: '12px', boxShadow: '0 4px 15px rgba(241, 196, 15, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={20} /> PRIZE POOL WON: +{totalPot.toLocaleString()} VIRTUAL COINS!
            </div>
          )}
        </div>

        <div className="winner-scores-box">
          <div className="score-summary-row">
            <div className="score-col winner-col">
              <span className="col-label">{winnerName}</span>
              <span className="col-score">{winnerScore.toFixed(1)} pts</span>
            </div>
            <div className="vs-col">VS</div>
            <div className="score-col loser-col">
              <span className="col-label">{is2P ? (loserKey === 'P1' ? 'P1' : 'P2') : `Team ${loserKey}`}</span>
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
