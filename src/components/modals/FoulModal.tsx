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

  const myPlayerId = state.localPlayerId || 'P1';
  const myPlayer = state.players ? state.players[myPlayerId] : undefined;
  const myTeam = myPlayer ? myPlayer.team : (myPlayerId === 'P1' || myPlayerId === 'P3' ? 'A' : 'B');

  const winnerId = state.foul.winnerId || 'P1';
  const foulerId = state.foul.player || 'P1';
  const isIWinner = state.gameMode === '2P'
    ? winnerId === myPlayerId
    : (winnerId === myTeam || winnerId === myPlayerId);

  const isFouler = foulerId === myPlayerId;
  const foulerPlayer = state.players ? state.players[foulerId] : null;
  const foulerName = isFouler
    ? 'YOU'
    : foulerPlayer?.name
    ? `${foulerPlayer.name} (${foulerId})`
    : (foulerId === 'P1' ? 'Player 1' : 'Player 2');

  const winnerTitle = isIWinner
    ? '🏆 YOU WIN!'
    : (state.players && state.players[winnerId]?.name
        ? `🏆 ${state.players[winnerId].name} (${winnerId}) WINS!`
        : `🏆 ${state.gameMode === '2P' ? (winnerId === 'P1' ? 'PLAYER 1' : (state.isOnlineMode ? 'PLAYER 2' : 'P2 (AI)')) : 'TEAM ' + winnerId} WINS!`);

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-foul">
        <div className="foul-icon-container">
          <ShieldAlert size={64} className="foul-pulse-icon" />
        </div>

        <h1 className="foul-title">⚠️ FOUL!</h1>
        <h2 className="foul-subtitle">{isFouler ? 'You Committed a Foul' : `${foulerName} Committed a Foul`}</h2>

        <div className="foul-details-box">
          <p className="foul-reason">{state.foul.reason}</p>
          <div className="foul-winner-banner">{winnerTitle}</div>
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
