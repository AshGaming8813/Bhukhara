import React from 'react';
import { AlertTriangle, Home, X } from 'lucide-react';

interface LeaveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLeave: () => void;
}

export const LeaveConfirmModal: React.FC<LeaveConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmLeave,
}) => {
  if (!isOpen) return null;

  const handleLeave = () => {
    onClose();
    onConfirmLeave();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-small">
        <div className="modal-header header-warning">
          <h2>
            <AlertTriangle size={22} /> Leave Match?
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body align-center">
          <p>Are you sure you want to leave the game and return to the Home page?</p>
        </div>

        <div className="modal-footer space-between">
          <button className="btn btn-secondary" onClick={onClose}>
            CANCEL
          </button>
          <button className="btn btn-gold" onClick={handleLeave}>
            <Home size={16} /> LEAVE TO HOME
          </button>
        </div>
      </div>
    </div>
  );
};
