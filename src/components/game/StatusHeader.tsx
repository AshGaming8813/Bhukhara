import React from 'react';
import { useGame } from '../../context/GameContext';
import { Settings, LogOut, Wifi, Users, Volume2, VolumeX, RotateCw } from 'lucide-react';

interface StatusHeaderProps {
  onOpenSettings: () => void;
  onConfirmRestart: () => void;
  onConfirmLeave?: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  onOpenSettings,
  onConfirmRestart,
  onConfirmLeave,
}) => {
  const { state, toggleSound } = useGame();

  const handleToggleRotateFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
          (window.screen as any).orientation.lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (e) {}
  };

  return (
    <div className="status-header mockup-status-header">
      <div className="header-left">
        <div className="logo-brand-container">
          <span className="logo-gold-text">BHUKHARA</span>
          <span className="logo-tagline">Play · Connect · Win</span>
        </div>
      </div>

      <div className="header-center">
      </div>

      <div className="header-right">
        <div className="wifi-status-pill" title="Connection Status: Online">
          <Wifi size={14} className="wifi-icon-active" />
        </div>

        {state?.isOnlineMode && state?.onlineRoomCode && (
          <div className="header-pill room-code-pill">
            <span className="pill-label">Room Code</span>
            <span className="pill-val">{state.onlineRoomCode}</span>
          </div>
        )}

        <div className="header-pill mode-players-pill">
          <Users size={14} />
          <span>{state?.gameMode === '4P' ? '4 Players' : '2 Players'}</span>
        </div>

        <button className="header-icon-btn" onClick={handleToggleRotateFullscreen} title="Rotate Landscape / Fullscreen">
          <RotateCw size={16} />
        </button>

        <button className="header-icon-btn" onClick={toggleSound} title="Toggle Sound">
          {state?.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <button className="header-icon-btn" onClick={onOpenSettings} title="Settings">
          <Settings size={16} />
        </button>

        <button className="btn-leave-match" onClick={onConfirmLeave || onConfirmRestart} title="Leave Match & Back to Home">
          <LogOut size={14} /> Leave
        </button>
      </div>
    </div>
  );
};
