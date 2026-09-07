import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { loadGameState } from '../../utils/storage';
import { Play, Users, BookOpen, Settings as SettingsIcon, RotateCcw, Globe, LogIn, Coins } from 'lucide-react';
import type { BazziMode } from '../../types/game';
import type { User } from '../../types/auth';

interface HomeScreenProps {
  currentUser: User | null;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onStartGame: () => void;
  onOpenOnlineMenu: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  onOpenHowToPlay,
  onOpenSettings,
  onStartGame,
  onOpenOnlineMenu,
  onOpenAuthModal,
  onOpenProfileModal,
}) => {
  const { startNewGame, continueSavedGame } = useGame();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [bazziMode, setBazziMode] = useState<BazziMode>(1);

  useEffect(() => {
    const saved = loadGameState();
    if (saved && saved.phase !== 'GAME_OVER') {
      setHasSavedGame(true);
    }
  }, []);

  const handlePlay2P = () => {
    startNewGame('2P', bazziMode);
    onStartGame();
  };

  const handlePlay4P = () => {
    startNewGame('4P', bazziMode);
    onStartGame();
  };

  const handleContinue = () => {
    if (continueSavedGame()) {
      onStartGame();
    }
  };

  return (
    <div className="home-screen">
      {/* Background Animated Cards */}
      <div className="bg-cards-container">
        <div className="floating-card c1">♠</div>
        <div className="floating-card c2">♥</div>
        <div className="floating-card c3">♦</div>
        <div className="floating-card c4">♣</div>
      </div>

      <div className="home-content">
        {/* Top Header Player Info / Auth Bar */}
        <div className="home-user-auth-bar">
          {currentUser ? (
            <div className="player-account-badge" onClick={onOpenProfileModal}>
              <div className="avatar-mini">👑</div>
              <div className="user-text-info">
                <span className="user-name-text">{currentUser.username}</span>
                <span className="user-id-text"><code>{currentUser.player_id}</code></span>
              </div>
              <div className="user-coin-tag">
                <Coins size={14} />
                <span>🪙 {currentUser.coin_balance.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <button className="btn-auth-trigger" onClick={onOpenAuthModal}>
              <LogIn size={16} /> LOGIN / REGISTER
            </button>
          )}
        </div>

        <div className="logo-container">
          <h1 className="game-logo">BHUKHARA</h1>
          <p className="game-subtitle">“The Ultimate Indian Card Challenge”</p>
          <div className="gold-divider"></div>
        </div>

        {/* Online Multiplayer Hero Button */}
        <div className="online-hero-section">
          <button className="btn btn-gold btn-large online-hero-btn" onClick={onOpenOnlineMenu}>
            <Globe className="btn-icon pulse-glow" />
            PLAY ONLINE WITH FRIENDS
          </button>
        </div>

        {/* Mode Selector */}
        <div className="bazzi-selector">
          <label className="bazzi-label">Offline Match Length:</label>
          <div className="bazzi-options">
            <button
              className={`bazzi-btn ${bazziMode === 1 ? 'active' : ''}`}
              onClick={() => setBazziMode(1)}
            >
              1 Bazzi
            </button>
            <button
              className={`bazzi-btn ${bazziMode === 2 ? 'active' : ''}`}
              onClick={() => setBazziMode(2)}
            >
              2 Bazzi (Lead System)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="home-buttons">
          {hasSavedGame && (
            <button className="btn btn-gold btn-large" onClick={handleContinue}>
              <RotateCcw className="btn-icon" />
              CONTINUE SAVED GAME
            </button>
          )}

          <button className="btn btn-primary btn-large" onClick={handlePlay2P}>
            <Play className="btn-icon" />
            PLAY OFFLINE (2 PLAYERS)
          </button>

          <button className="btn btn-primary btn-large" onClick={handlePlay4P}>
            <Users className="btn-icon" />
            PLAY OFFLINE (4 PLAYERS)
          </button>

          <button className="btn btn-secondary" onClick={onOpenHowToPlay}>
            <BookOpen className="btn-icon" />
            HOW TO PLAY
          </button>

          <button className="btn btn-secondary" onClick={onOpenSettings}>
            <SettingsIcon className="btn-icon" />
            SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};
