import React from 'react';
import type { Card } from '../../types/game';
import { SUIT_CONFIGS } from '../../constants/gameConfig';

interface CardComponentProps {
  card: Card;
  isSelected?: boolean;
  isFaceDown?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isSelected = false,
  isFaceDown = false,
  onClick,
  small = false,
}) => {
  if (isFaceDown) {
    return (
      <div
        className={`card card-back ${small ? 'card-small' : ''}`}
        onClick={onClick}
      >
        <div className="card-back-pattern">
          <div className="card-back-logo">♠</div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const suitConfig = (card.suit && SUIT_CONFIGS[card.suit]) ? SUIT_CONFIGS[card.suit] : { symbol: '♠', color: '#ffffff' };

  return (
    <div
      className={`card ${isSelected ? 'selected' : ''} ${card.isJoker ? 'joker-card' : ''} ${
        small ? 'card-small' : ''
      }`}
      onClick={onClick}
      style={{ color: suitConfig.color }}
    >
      <div className="card-top-left">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit-icon">{suitConfig.symbol}</span>
      </div>

      <div className="card-center">
        {card.isJoker ? (
          <div className="joker-badge">
            <span className="joker-icon">★</span>
            <span className="joker-text">JOKER</span>
          </div>
        ) : (
          <span className="card-main-symbol">{suitConfig.symbol}</span>
        )}
      </div>

      {card.isJoker && <div className="joker-ribbon">2</div>}
    </div>
  );
};
