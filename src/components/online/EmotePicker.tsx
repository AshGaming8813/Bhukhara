import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { soundEngine } from '../../engine/sound';

interface EmotePickerProps {
  onSendEmote: (emote: string) => void;
}

const EMOTES = ['👋', '👍', '😂', '😮', '🔥', '🎉', 'GG'];

export const EmotePicker: React.FC<EmotePickerProps> = ({ onSendEmote }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmoteClick = (emote: string) => {
    soundEngine.playClick();
    onSendEmote(emote);
    setIsOpen(false);
  };

  return (
    <div className="emote-picker-wrapper">
      {isOpen && (
        <div className="emote-popover-menu">
          {EMOTES.map(emoji => (
            <button
              key={emoji}
              className="btn-emote-item"
              onClick={() => handleEmoteClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <button
        className={`btn-emote-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        title="Send Emote / Quick Chat"
      >
        <Smile size={16} /> EMOTES
      </button>
    </div>
  );
};
