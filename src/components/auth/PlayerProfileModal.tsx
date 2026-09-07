import React from 'react';
import type { User } from '../../types/auth';
import { Coins, LogOut, X, Shield, Calendar, Mail } from 'lucide-react';

interface PlayerProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onLogout,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-profile">
        <button className="btn-close-modal" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="profile-header">
          <div className="profile-avatar-circle">👑</div>
          <h2 className="profile-username">{user.username}</h2>
          <span className="profile-player-id">
            Unique ID: <code>{user.player_id}</code>
          </span>
        </div>

        <div className="profile-details-grid">
          <div className="profile-item-card">
            <Coins size={20} className="icon-gold" />
            <div className="item-text">
              <span className="item-label">Virtual Coin Balance</span>
              <strong className="item-value-gold">🪙 {user.coin_balance.toLocaleString()}</strong>
            </div>
          </div>

          <div className="profile-item-card">
            <Mail size={18} className="icon-muted" />
            <div className="item-text">
              <span className="item-label">Email Address</span>
              <strong className="item-value">{user.email}</strong>
            </div>
          </div>

          <div className="profile-item-card">
            <Shield size={18} className="icon-muted" />
            <div className="item-text">
              <span className="item-label">Account Role</span>
              <strong className="item-value uppercase">{user.role}</strong>
            </div>
          </div>

          <div className="profile-item-card">
            <Calendar size={18} className="icon-muted" />
            <div className="item-text">
              <span className="item-label">Joined Date</span>
              <strong className="item-value">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
            </div>
          </div>
        </div>

        <div className="modal-footer space-between">
          <button className="btn btn-secondary btn-medium" onClick={onClose}>
            CLOSE
          </button>

          <button className="btn btn-danger btn-medium" onClick={onLogout}>
            <LogOut size={16} /> LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
};
