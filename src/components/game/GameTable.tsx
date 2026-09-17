import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { StatusHeader } from './StatusHeader';
import { TableCenter } from './TableCenter';
import { CombinationBoard } from './CombinationBoard';
import { PlayerHand } from './PlayerHand';
import { ActionPanel } from './ActionPanel';
import { EmotePicker } from '../online/EmotePicker';
import { Loader2, RotateCw, Maximize2 } from 'lucide-react';

interface GameTableProps {
  onOpenSettings: () => void;
  onConfirmRestart: () => void;
  onConfirmLeave?: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  onOpenSettings,
  onConfirmRestart,
  onConfirmLeave,
}) => {
  const { state, activeEmote, sendOnlineEmote } = useGame();
  const is4P = state.gameMode === '4P';
  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const playerOrder = state.playerOrder || [];
  const myPlayer = state.players ? state.players[myPlayerId] : undefined;

  // Mobile Phone Portrait Orientation Detector
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    }
    return false;
  });
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isPortrait);
    };

    // Attempt Screen Orientation Lock to Landscape on mobile
    try {
      if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
        (window.screen as any).orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {
      console.warn('Orientation lock notice:', e);
    }

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleFullscreenAndRotate = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
        (window.screen as any).orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {
      console.warn(e);
    }
    setDismissRotatePrompt(true);
  };

  // Render transitional loading state if online game is initializing cards and player slots
  if (state.isOnlineMode && (!myPlayer || playerOrder.length === 0)) {
    return (
      <div className="game-table-screen flex-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(circle at top, #0c382b 0%, #041410 100%)', color: '#f1c40f' }}>
        <div style={{ textAlign: 'center', padding: '24px 32px', background: 'rgba(0,0,0,0.7)', borderRadius: '16px', border: '1.5px solid #d4af37', boxShadow: '0 0 25px rgba(212,175,55,0.3)' }}>
          <Loader2 size={36} className="spin" style={{ margin: '0 auto 12px auto', color: '#f1c40f' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '1px' }}>STARTING ONLINE MATCH...</h2>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Dealing cards & synchronizing game table</p>
        </div>
      </div>
    );
  }

  const opponentSlotId = playerOrder.find(id => id !== myPlayerId) || (myPlayerId === 'P1' ? 'P2' : 'P1');
  const opponentPlayer = state.players ? state.players[opponentSlotId] : undefined;
  const myName = myPlayer ? (myPlayer.name + (state.isOnlineMode ? ' (You)' : '')) : 'You';
  const opponentName = opponentPlayer ? opponentPlayer.name : 'Opponent';

  return (
    <div className="game-table-screen">
      {/* Portrait overlay */}
      {isPortraitMobile && !dismissRotatePrompt && (
        <div className="rotate-device-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(4,18,14,0.96)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', color: '#fff' }}>
          <div style={{ background: 'linear-gradient(145deg,#0c2b20,#04120e)', border: '2px solid #d4af37', borderRadius: '24px', padding: '28px 24px', maxWidth: '340px', boxShadow: '0 0 40px rgba(212,175,55,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid #d4af37', padding: '16px', borderRadius: '50%', color: '#f1c40f' }}>
              <RotateCw size={44} className="spin-slow" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f1c40f', margin: 0 }}>ROTATE PHONE TO LANDSCAPE</h2>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
              Bhukhara needs landscape mode for the card table.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button className="btn btn-gold btn-large" onClick={handleFullscreenAndRotate} style={{ width: '100%', justifyContent: 'center', gap: '8px' }}>
                <Maximize2 size={18} /> ROTATE &amp; PLAY FULLSCREEN
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => setDismissRotatePrompt(true)} style={{ width: '100%', justifyContent: 'center', opacity: 0.8, fontSize: '0.75rem' }}>
                Continue in Portrait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status bar */}
      <StatusHeader onOpenSettings={onOpenSettings} onConfirmRestart={onConfirmRestart} onConfirmLeave={onConfirmLeave} />

      {/* Green felt — simple column layout */}
      <div className="table-felt-container">
        {activeEmote && (
          <div className="active-emote-toast animate-bounce-pop">
            <span className="emote-sender-name">{activeEmote.senderName}</span>
            <span className="emote-icon-large">{activeEmote.emote}</span>
          </div>
        )}

        {/* ── ROW 1 (DOMINANT): Combos + Decks in center ── */}
        <div className="table-combo-workspace">
          {is4P ? (
            <>
              <CombinationBoard teamKey="A" title="Team A" />
              <div className="table-center-column">
                <TableCenter />
              </div>
              <CombinationBoard teamKey="B" title="Team B" />
            </>
          ) : (
            <>
              <CombinationBoard teamKey={myPlayerId} title={myName} />
              <div className="table-center-column">
                {state.isOnlineMode && (
                  <div className="online-room-inline">
                    <span className="online-room-tag">🟢 #{state.onlineRoomCode}</span>
                    <EmotePicker onSendEmote={sendOnlineEmote} />
                  </div>
                )}
                <TableCenter />
              </div>
              <CombinationBoard teamKey={opponentSlotId} title={opponentName} />
            </>
          )}
        </div>

        {/* ── ROW 2: Player's private hand ── */}
        <div className="table-hand-row">
          <PlayerHand />
        </div>

        {/* ── ROW 3: Action buttons ── */}
        <div className="table-actions-row">
          <ActionPanel />
        </div>
      </div>
    </div>
  );
};

