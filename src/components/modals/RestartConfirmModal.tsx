import React from 'react';
import { useGame } from '../../context/GameContext';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface RestartConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RestartConfirmModal: React.FC<RestartConfirmModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { restartCurrentGame } = useGame();

  if (!isOpen) return null;

  const handleRestart = () => {
    restartCurrentGame();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-small">
        <div className="modal-header header-warning">
          <h2>
            <AlertCircle size={22} /> Restart Game?
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body align-center">
          <p>Are you sure you want to restart the current game? All active progress will be reset.</p>
        </div>

        <div className="modal-footer space-between">
          <button className="btn btn-secondary" onClick={onClose}>
            CANCEL
          </button>
          <button className="btn btn-danger" onClick={handleRestart}>
            <RefreshCw size={16} /> RESTART
          </button>
        </div>
      </div>
    </div>
  );
};
