import React, { useState } from 'react';
import type { OnlineRoom } from '../../types/game';
import { Copy, Share2, Play, CheckCircle2, User, Crown, Loader2, ArrowLeft } from 'lucide-react';

interface RoomLobbyModalProps {
  isOpen: boolean;
  room: OnlineRoom | null;
  localPlayerId: string;
  onToggleReady: () => void;
  onStartGame: () => { success: boolean; error?: string };
  onLeaveRoom: () => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  room,
  localPlayerId,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [startError, setStartError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  if (!isOpen || !room) return null;

  const isHost = room.hostId === localPlayerId || (room.players[localPlayerId]?.isHost ?? false);
  const playersList = Object.values(room.players);
  const localPlayer = room.players[localPlayerId] || playersList.find(p => p.id === localPlayerId) || (isHost ? playersList.find(p => p.isHost) : playersList.find(p => !p.isHost)) || playersList[0];
  const maxPlayers = room.maxPlayers;
  const isFull = playersList.length === maxPlayers;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `Join my Bhukhara online game!\nRoom Code: ${room.roomCode}\nOpen Bhukhara and select Join Room.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bhukhara Room Invite',
          text: shareText,
        });
      } catch {
        handleCopyCode();
      }
    } else {
      handleCopyCode();
    }
  };

  const handleHostStart = () => {
    setIsStarting(true);
    setStartError('');
    const res = onStartGame();
    if (!res.success) {
      setIsStarting(false);
      setStartError(res.error || 'Cannot start game yet.');
    }
  };

  // Generate 2 or 4 slots
  const slots = Array.from({ length: maxPlayers }).map((_, idx) => {
    const player = playersList.find(p => p.seat === idx);
    return {
      seat: idx,
      player,
    };
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lobby">
        <div className="lobby-header">
          <div className="lobby-title-badge">🃏 BHUKHARA ROOM LOBBY</div>
          
          {/* Prominent Room Code Section */}
          <div className="room-code-display-box">
            <span className="code-label">ROOM CODE</span>
            <span className="code-value"># {room.roomCode}</span>

            <div className="lobby-share-actions">
              <button className="btn-lobby-action" onClick={handleCopyCode}>
                <Copy size={14} /> {copySuccess ? 'COPIED!' : 'COPY CODE'}
              </button>
              <button className="btn-lobby-action btn-share" onClick={handleShare}>
                <Share2 size={14} /> SHARE ROOM
              </button>
            </div>
          </div>
        </div>

        {/* Players Waiting List */}
        <div className="lobby-players-section">
          <h3 className="section-subtitle">
            <User size={16} /> PLAYERS ({playersList.length} / {maxPlayers})
          </h3>

          <div className="players-slots-grid">
            {slots.map(slot => {
              const p = slot.player;
              if (p) {
                return (
                  <div key={p.id} className={`player-slot-card filled ${p.id === localPlayerId ? 'local-user' : ''}`}>
                    <div className="avatar-circle">
                      {p.isHost ? <Crown size={18} className="crown-icon" /> : <User size={18} />}
                    </div>
                    <div className="player-info-text">
                      <span className="player-name">{p.displayName} {p.id === localPlayerId ? '(You)' : ''}</span>
                      <span className="player-role-tag">
                        {p.isHost ? 'HOST' : `Slot ${p.seat + 1}`} • Team {p.team}
                      </span>
                    </div>
                    <div className={`ready-status-badge ${p.isReady ? 'is-ready' : 'is-waiting'}`}>
                      {p.isReady ? <CheckCircle2 size={14} /> : <Loader2 size={14} className="spin" />}
                      <span>{p.isReady ? 'READY' : 'WAITING'}</span>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={slot.seat} className="player-slot-card empty">
                    <div className="avatar-circle empty-avatar">?</div>
                    <div className="player-info-text">
                      <span className="player-name empty-text">Waiting for Player...</span>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Game Settings Summary */}
        <div className="lobby-settings-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Players: <strong>{room.gameMode === '2P' ? '2 (1v1)' : '4 (Team A vs B)'}</strong></span>
          <span>Match: <strong>{room.bazziMode === 1 ? '1 Bazzi' : '2 Bazzi (Lead Carry)'}</strong></span>
          <span style={{ color: '#f1c40f', fontWeight: 800 }}>Wager: 🪙 <strong>{(room.coinWager || 100).toLocaleString()} Coins</strong></span>
        </div>

        {startError && <div className="lobby-error-banner">⚠️ {startError}</div>}

        {/* Bottom Actions */}
        <div className="modal-footer space-between">
          <button className="btn btn-secondary btn-medium" onClick={onLeaveRoom}>
            <ArrowLeft size={16} /> LEAVE LOBBY
          </button>

          <div className="lobby-right-buttons">
            <button
              className={`btn ${localPlayer?.isReady ? 'btn-success' : 'btn-gold'} btn-large`}
              onClick={onToggleReady}
            >
              <CheckCircle2 size={18} /> {localPlayer?.isReady ? '✓ READY' : 'CLICK TO READY'}
            </button>

            {isHost && (
              <button
                className="btn btn-gold btn-large start-game-btn"
                disabled={!isFull || isStarting}
                onClick={handleHostStart}
              >
                {isStarting ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
                {isStarting ? ' STARTING...' : ' START GAME'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
