import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowLeft, LogIn, Loader2, Globe, Users, ArrowRight, Coins, AlertCircle } from 'lucide-react';
import { onlineEngine } from '../../services/onlineEngine';
import { getEffectiveCoinBalance } from '../../services/authBackend';
import type { OnlineRoom } from '../../types/game';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
}) => {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRooms, setActiveRooms] = useState<OnlineRoom[]>([]);

  const playerCoins = getEffectiveCoinBalance();

  useEffect(() => {
    if (isOpen) {
      const refreshRooms = async () => {
        const rooms = await onlineEngine.getActiveRooms();
        setActiveRooms(rooms);
      };
      refreshRooms();
      const interval = setInterval(refreshRooms, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const recentActiveRooms = activeRooms.filter(r => Date.now() - r.createdAt <= 5 * 60 * 1000);

  if (!isOpen) return null;

  const handleJoinDirect = async (targetCode: string) => {
    setIsSubmitting(true);
    setErrorMsg('');

    const timeoutPromise = new Promise<{ success: boolean; error?: string }>(resolve => {
      setTimeout(() => resolve({ success: false, error: 'Room lookup timed out. Please check room code with Host and try again.' }), 5000);
    });

    try {
      const res = await Promise.race([onJoinRoom(targetCode), timeoutPromise]);
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to join room.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMsg('Error connecting to room. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter a valid 6-character room code.');
      return;
    }
    await handleJoinDirect(cleanCode);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    setCode(cleanVal);
    if (cleanVal) setErrorMsg('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-join-room">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="join-header-banner" style={{ margin: 0 }}>
            <KeyRound size={32} className="key-icon" />
            <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>JOIN ONLINE ROOM</h2>
          </div>
          <div style={{ background: 'rgba(212, 175, 55, 0.15)', border: '1px solid #d4af37', padding: '4px 10px', borderRadius: '20px', fontSize: '0.88rem', fontWeight: 800, color: '#f1c40f', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Coins size={15} /> Your Coins: {playerCoins.toLocaleString()}
          </div>
        </div>

        <p className="join-subtitle" style={{ marginBottom: '12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
          Select an active room or enter a 6-character room code from host
        </p>

        <form onSubmit={handleSubmit} className="join-room-form" style={{ marginBottom: '16px' }}>
          <div className="code-input-container">
            <label className="input-label" style={{ marginBottom: '6px', fontWeight: 'bold' }}>
              ENTER 6-DIGIT ROOM CODE (FROM HOST)
            </label>
            <input
              type="text"
              className="room-code-input"
              value={code}
              onChange={handleInputChange}
              placeholder="e.g. BH7K29"
              maxLength={10}
              autoFocus
            />
          </div>

          {errorMsg && (
            <div className="join-error-banner" style={{ background: 'rgba(231, 76, 60, 0.25)', border: '1.5px solid #e74c3c', color: '#ff6b6b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800, marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          <div className="modal-footer space-between" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary btn-medium" onClick={onClose}>
              <ArrowLeft size={16} /> CANCEL
            </button>
            <button type="submit" className="btn btn-gold btn-large" disabled={code.length < 4 || isSubmitting}>
              {isSubmitting ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />}
              {isSubmitting ? 'FINDING ROOM...' : 'JOIN ROOM NOW'}
            </button>
          </div>
        </form>

        {/* Active Open Rooms List (Recent < 5 mins) */}
        {recentActiveRooms.length > 0 && (
          <div className="active-rooms-section">
            <div className="active-rooms-header">
              <Globe size={14} /> RECENT OPEN ROOMS ({recentActiveRooms.length})
            </div>
            <div className="active-rooms-list">
              {recentActiveRooms.map(room => {
                const count = Object.keys(room.players).length;
                const hostName = room.players[room.hostId]?.displayName || 'Player';
                const wager = room.coinWager || 100;
                const canAfford = playerCoins >= wager;

                return (
                  <div key={room.roomCode} className="active-room-card" style={{ opacity: canAfford ? 1 : 0.65 }}>
                    <div className="room-card-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="room-card-code"># {room.roomCode}</span>
                        <span style={{ background: '#d4af37', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '1px 6px', borderRadius: '10px' }}>
                          🪙 {wager.toLocaleString()} Wager
                        </span>
                      </div>
                      <span className="room-card-host"><Users size={12} /> Host: {hostName}</span>
                      <span className="room-card-meta">
                        {room.gameMode === '2P' ? '2 Players' : '4 Players'} • {room.bazziMode === 1 ? '1 Bazzi' : '2 Bazzi'} • ({count}/{room.maxPlayers})
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-gold btn-small btn-quick-join"
                      onClick={() => handleJoinDirect(room.roomCode)}
                      disabled={isSubmitting}
                    >
                      {canAfford ? 'JOIN NOW' : 'LACK COINS'} <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
