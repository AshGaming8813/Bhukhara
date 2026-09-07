import React, { useState } from 'react';
import type { User } from '../../types/auth';
import type { AdjustmentAction } from '../../types/admin';
import { authBackend } from '../../services/authBackend';
import { Coins, PlusCircle, MinusCircle, AlertTriangle, CheckCircle2, X, ArrowLeft } from 'lucide-react';

interface CoinManagementModalProps {
  player: User | null;
  adminToken: string;
  isOpen: boolean;
  onClose: () => void;
  onAdjustmentComplete: () => void;
}

export const CoinManagementModal: React.FC<CoinManagementModalProps> = ({
  player,
  adminToken,
  isOpen,
  onClose,
  onAdjustmentComplete,
}) => {
  const [action, setAction] = useState<AdjustmentAction>('ADD');
  const [amountStr, setAmountStr] = useState('500');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !player) return null;

  const amount = Math.floor(Number(amountStr));

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid positive coin amount.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Mandatory reason is required for coin adjustments.');
      return;
    }

    if (action === 'REMOVE' && amount > player.coin_balance) {
      setErrorMsg(`Insufficient coin balance. Player currently has only ${player.coin_balance.toLocaleString()} virtual coins.`);
      return;
    }

    setShowConfirm(true);
  };

  const handleExecuteAdjustment = () => {
    if (isSubmitting) return; // Prevent double-clicks!
    setIsSubmitting(true);
    setErrorMsg('');

    setTimeout(() => {
      // Server-Authoritative Adjustment with Admin Token Validation
      const res = authBackend.adjustPlayerCoins(adminToken, player.id, action, amount, reason);
      setIsSubmitting(false);

      if (res.success) {
        setShowConfirm(false);
        setReason('');
        onAdjustmentComplete();
        onClose();
      } else {
        setShowConfirm(false);
        setErrorMsg(res.error || 'Adjustment failed.');
      }
    }, 400);
  };

  const newPredictedBalance = action === 'ADD' ? player.coin_balance + amount : player.coin_balance - amount;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-coin-manage">
        <button className="btn-close-modal" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Compact Player Profile Header */}
        <div className="coin-player-header">
          <div className="player-avatar-large">👑</div>
          <div className="player-meta-info">
            <h2 className="player-meta-name">{player.username}</h2>
            <span className="player-meta-id">Player ID: <code>{player.player_id}</code></span>
          </div>
          <div className="player-balance-badge">
            <span className="badge-label">Current Coin Balance</span>
            <span className="badge-value">🪙 {player.coin_balance.toLocaleString()}</span>
          </div>
        </div>

        {/* Confirmation Modal Sub-View */}
        {showConfirm ? (
          <div className="confirm-step-box">
            <div className="confirm-header">
              <AlertTriangle size={36} className="warn-icon" />
              <h3>CONFIRM COIN ADJUSTMENT</h3>
            </div>

            <div className="confirm-details-card">
              <p className="confirm-question-text">
                Are you sure you want to <strong>{action === 'ADD' ? 'ADD' : 'REMOVE'} {amount.toLocaleString()} virtual coins</strong> {action === 'ADD' ? 'to' : 'from'} {player.username} ({player.player_id})?
              </p>

              <div className="math-flow-preview">
                <div className="flow-item">
                  <span>Current Balance</span>
                  <strong>{player.coin_balance.toLocaleString()} 🪙</strong>
                </div>
                <div className="flow-sign">{action === 'ADD' ? '+' : '-'} {amount.toLocaleString()} 🪙</div>
                <div className="flow-item highlight">
                  <span>New Balance</span>
                  <strong className={action === 'ADD' ? 'text-success' : 'text-danger'}>
                    {newPredictedBalance.toLocaleString()} 🪙
                  </strong>
                </div>
              </div>

              <div className="reason-review">
                <span>Mandatory Reason:</span>
                <em>"{reason.trim()}"</em>
              </div>
            </div>

            <div className="modal-footer space-between">
              <button
                type="button"
                className="btn btn-secondary btn-medium"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} /> CANCEL & EDIT
              </button>

              <button
                type="button"
                className={`btn ${action === 'ADD' ? 'btn-success' : 'btn-danger'} btn-large`}
                onClick={handleExecuteAdjustment}
                disabled={isSubmitting}
              >
                <CheckCircle2 size={18} /> {isSubmitting ? 'PROCESSING...' : `CONFIRM ${action}`}
              </button>
            </div>
          </div>
        ) : (
          /* Primary Add / Remove Form */
          <form onSubmit={handleOpenConfirm} className="coin-manage-form">
            {/* Action Tabs */}
            <div className="action-tabs-group">
              <button
                type="button"
                className={`tab-btn add-tab ${action === 'ADD' ? 'active' : ''}`}
                onClick={() => { setAction('ADD'); setErrorMsg(''); }}
              >
                <PlusCircle size={18} /> ADD COINS
              </button>

              <button
                type="button"
                className={`tab-btn remove-tab ${action === 'REMOVE' ? 'active' : ''}`}
                onClick={() => { setAction('REMOVE'); setErrorMsg(''); }}
              >
                <MinusCircle size={18} /> REMOVE COINS
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Coins size={14} /> NUMBER OF VIRTUAL COINS ({action})
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className="coin-amount-input"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="Enter coin amount (e.g. 500)..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                MANDATORY REASON / AUDIT NOTE
              </label>
              <textarea
                className="coin-reason-input"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Enter exact reason (e.g. Tournament reward, Administrative correction)..."
                rows={3}
                required
              />
            </div>

            {errorMsg && <div className="coin-error-banner">⚠️ {errorMsg}</div>}

            <div className="modal-footer space-between">
              <button type="button" className="btn btn-secondary btn-medium" onClick={onClose}>
                CANCEL
              </button>

              <button
                type="submit"
                className={`btn ${action === 'ADD' ? 'btn-success' : 'btn-danger'} btn-large`}
              >
                PROCEED TO CONFIRM
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
