import React, { useState } from 'react';
import type { GameMode, BazziMode } from '../../types/game';
import { Users, Layers, Sparkles, ArrowLeft, CheckCircle2, Coins, AlertTriangle } from 'lucide-react';
import { getEffectiveCoinBalance } from '../../services/authBackend';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (mode: GameMode, bazziMode: BazziMode, coinWager: number) => void;
}

const WAGER_OPTIONS = [100, 250, 500, 1000, 2500, 5000];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
}) => {
  const [mode, setMode] = useState<GameMode>('2P');
  const [bazziMode, setBazziMode] = useState<BazziMode>(1);
  const [coinWager, setCoinWager] = useState<number>(100);

  if (!isOpen) return null;

  const playerCoins = getEffectiveCoinBalance();
  const hasEnoughCoins = playerCoins >= coinWager;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEnoughCoins) return;
    onCreateRoom(mode, bazziMode, coinWager);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-create-room">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>CREATE PRIVATE ROOM</h2>
          <div style={{ background: 'rgba(212, 175, 55, 0.15)', border: '1px solid #d4af37', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, color: '#f1c40f', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Coins size={14} /> Balance: {playerCoins.toLocaleString()} Coins
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-room-form">
          {/* Game Mode Selection */}
          <div className="form-group">
            <label className="form-label">
              <Users size={16} /> GAME MODE
            </label>
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`mode-btn ${mode === '2P' ? 'active' : ''}`}
                onClick={() => setMode('2P')}
                aria-pressed={mode === '2P'}
              >
                {mode === '2P' && <CheckCircle2 size={16} className="mode-btn-check" />}
                2 PLAYERS (1 v 1)
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === '4P' ? 'active' : ''}`}
                onClick={() => setMode('4P')}
                aria-pressed={mode === '4P'}
              >
                {mode === '4P' && <CheckCircle2 size={16} className="mode-btn-check" />}
                4 PLAYERS (Team A vs Team B)
              </button>
            </div>
          </div>

          {/* Bazzi Mode Selection */}
          <div className="form-group">
            <label className="form-label">
              <Layers size={16} /> BAZZI MATCH LENGTH
            </label>
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`mode-btn ${bazziMode === 1 ? 'active' : ''}`}
                onClick={() => setBazziMode(1)}
                aria-pressed={bazziMode === 1}
              >
                {bazziMode === 1 && <CheckCircle2 size={16} className="mode-btn-check" />}
                1 BAZZI MATCH
              </button>
              <button
                type="button"
                className={`mode-btn ${bazziMode === 2 ? 'active' : ''}`}
                onClick={() => setBazziMode(2)}
                aria-pressed={bazziMode === 2}
              >
                {bazziMode === 2 && <CheckCircle2 size={16} className="mode-btn-check" />}
                2 BAZZI (LEAD CARRYOVER)
              </button>
            </div>
          </div>

          {/* Coin Challenge / Wager Selection */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#f1c40f' }}>
              <Coins size={16} /> MATCH COIN WAGER / ENTRY FEE PER PLAYER
            </label>
            <div className="wager-options-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px' }}>
              {WAGER_OPTIONS.map(amt => (
                <button
                  key={amt}
                  type="button"
                  className={`mode-btn ${coinWager === amt ? 'active' : ''}`}
                  onClick={() => setCoinWager(amt)}
                  style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                >
                  🪙 {amt.toLocaleString()} Coins
                </button>
              ))}
            </div>
          </div>

          {/* Insufficient Coins Warning Banner */}
          {!hasEnoughCoins && (
            <div style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1.5px solid #e74c3c', color: '#ff6b6b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                INSUFFICIENT COINS! You have {playerCoins.toLocaleString()} coins, but selected a {coinWager.toLocaleString()} coin wager. Please select a lower wager or top up your coins.
              </div>
            </div>
          )}

          <div className="modal-footer space-between" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary btn-medium" onClick={onClose}>
              <ArrowLeft size={16} /> CANCEL
            </button>
            <button type="submit" className="btn btn-gold btn-large" disabled={!hasEnoughCoins}>
              <Sparkles size={18} /> CREATE ROOM NOW (🪙 {coinWager.toLocaleString()})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
