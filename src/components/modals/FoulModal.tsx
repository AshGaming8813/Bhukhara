import React from 'react';
import { useGame } from '../../context/GameContext';
import { ShieldAlert, RotateCcw, Home } from 'lucide-react';

interface FoulModalProps {
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

export const FoulModal: React.FC<FoulModalProps> = ({ onPlayAgain, onBackToHome }) => {
  const { state } = useGame();

  if (state.phase !== 'FOUL' || !state.foul) return null;

  const winnerTitle =
    state.gameMode === '2P'
      ? `${state.foul.winnerId === 'P1' ? 'PLAYER 1 (YOU)' : 'P2 (AI)'} WINS!`
      : `TEAM ${state.foul.winnerId} WINS!`;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-foul">
        <div className="foul-icon-container">
          <ShieldAlert size={64} className="foul-pulse-icon" />
        </div>

        <h1 className="foul-title">⚠️ FOUL!</h1>
        <h2 className="foul-subtitle">Invalid Moda Attempted</h2>

        <div className="foul-details-box">
          <p className="foul-reason">{state.foul.reason}</p>
          <div className="foul-winner-banner">🏆 {winnerTitle}</div>
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
