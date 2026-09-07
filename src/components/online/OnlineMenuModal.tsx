import React, { useState } from 'react';
import { getStoredDisplayName, setStoredDisplayName } from '../../services/onlineEngine';
import { Globe, PlusCircle, LogIn, ArrowLeft, User } from 'lucide-react';

interface OnlineMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const OnlineMenuModal: React.FC<OnlineMenuModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [displayName, setDisplayName] = useState(getStoredDisplayName());
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    setStoredDisplayName(val);
    if (val.trim()) setErrorMsg('');
  };

  const handleAction = (action: () => void) => {
    if (!displayName.trim()) {
      setErrorMsg('Please enter your name before playing online!');
      return;
    }
    action();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-online-menu">
        <div className="online-header-banner">
          <Globe size={42} className="online-globe-icon" />
          <h1 className="online-menu-title">PLAY ONLINE</h1>
          <p className="online-subtitle">Play Bhukhara real-time with friends anywhere!</p>
        </div>

        {/* Display Name Box */}
        <div className="name-input-section">
          <label className="input-label">
            <User size={16} /> YOUR DISPLAY NAME
          </label>
          <input
            type="text"
            className="online-name-input"
            value={displayName}
            onChange={handleNameChange}
            placeholder="Enter your name..."
            maxLength={16}
          />
          {errorMsg && <div className="name-error-text">{errorMsg}</div>}
        </div>

        {/* Play Options */}
        <div className="online-options-grid">
          <button
            className="btn-online-card create-card"
            onClick={() => handleAction(onCreateRoom)}
          >
            <PlusCircle size={32} />
            <div className="card-text-group">
              <span className="card-main-title">CREATE ROOM</span>
              <span className="card-sub-title">Host a new private room & invite friends</span>
            </div>
          </button>

          <button
            className="btn-online-card join-card"
            onClick={() => handleAction(onJoinRoom)}
          >
            <LogIn size={32} />
            <div className="card-text-group">
              <span className="card-main-title">JOIN ROOM</span>
              <span className="card-sub-title">Enter a 6-digit room code to join</span>
            </div>
          </button>
        </div>

        <div className="modal-footer flex-center">
          <button className="btn btn-secondary btn-medium" onClick={onClose}>
            <ArrowLeft size={16} /> BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
