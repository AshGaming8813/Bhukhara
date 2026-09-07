import React from 'react';
import { useGame } from '../../context/GameContext';
import { X, Volume2, Music, Home, RefreshCw, Globe } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRestart: () => void;
  onBackToHome: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfirmRestart,
  onBackToHome,
}) => {
  const { state, toggleSound, toggleMusic } = useGame();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-medium">
        <div className="modal-header">
          <h2>Game Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body settings-body">
          <div className="setting-item">
            <div className="setting-label">
              <Volume2 className="setting-icon" /> Sound Effects
            </div>
            <button
              className={`toggle-btn ${state.soundEnabled ? 'toggle-on' : 'toggle-off'}`}
              onClick={toggleSound}
            >
              {state.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <Music className="setting-icon" /> Background Music
            </div>
            <button
              className={`toggle-btn ${state.musicEnabled ? 'toggle-on' : 'toggle-off'}`}
              onClick={toggleMusic}
            >
              {state.musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <Globe className="setting-icon" /> Language
            </div>
            <div className="lang-selector">
              <span className="lang-badge active">English</span>
              <span className="lang-badge">Hindi (Soon)</span>
            </div>
          </div>
        </div>

        <div className="modal-footer settings-footer">
          <button
            className="btn btn-warning"
            onClick={() => {
              onClose();
              onConfirmRestart();
            }}
          >
            <RefreshCw size={16} /> Restart Game
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              onClose();
              onBackToHome();
            }}
          >
            <Home size={16} /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
