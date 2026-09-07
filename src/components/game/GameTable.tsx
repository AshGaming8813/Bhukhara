import React from 'react';
import { useGame } from '../../context/GameContext';
import { StatusHeader } from './StatusHeader';
import { TableCenter } from './TableCenter';
import { CombinationBoard } from './CombinationBoard';
import { PlayerHand } from './PlayerHand';
import { ActionPanel } from './ActionPanel';
import { EmotePicker } from '../online/EmotePicker';
import { Loader2 } from 'lucide-react';

interface GameTableProps {
  onOpenSettings: () => void;
  onConfirmRestart: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  onOpenSettings,
  onConfirmRestart,
}) => {
  const { state, activeEmote, sendOnlineEmote } = useGame();
  const is4P = state.gameMode === '4P';
  const myPlayerId = state.isOnlineMode ? (state.localPlayerId || 'P1') : 'P1';
  const playerOrder = state.playerOrder || [];
  const myPlayer = state.players ? state.players[myPlayerId] : undefined;

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
      {/* Top Header Bar */}
      <StatusHeader onOpenSettings={onOpenSettings} onConfirmRestart={onConfirmRestart} />

      {/* Main Table Felt Container */}
      <div className="table-felt-container">
        {/* Real-time Emote Toast Overlay */}
        {activeEmote && (
          <div className="active-emote-toast animate-bounce-pop">
            <span className="emote-sender-name">{activeEmote.senderName}</span>
            <span className="emote-icon-large">{activeEmote.emote}</span>
          </div>
        )}

        {/* Full Top-to-Bottom Table Body Section */}
        <div className="table-middle-section full-height-body">
          <div className="table-boards-area">
            {is4P ? (
              <>
                <CombinationBoard teamKey="A" title="Team A Combinations (You & P3)" />
                <TableCenter />
                <CombinationBoard teamKey="B" title="Team B Combinations (P2 & P4)" />
              </>
            ) : (
              <>
                <CombinationBoard teamKey={myPlayerId} title={`Your Combinations (${myName})`} />
                <TableCenter />
                <CombinationBoard teamKey={opponentSlotId} title={`${opponentName}'s Combinations`} />
              </>
            )}
          </div>
        </div>

        {/* Bottom Section: Human Player Hand, Action Controls & Game Info */}
        <div className="table-bottom-section mockup-bottom-section">
          {state.isOnlineMode && (
            <div className="online-table-top-bar">
              <span className="online-room-tag">🟢 ONLINE ROOM #{state.onlineRoomCode}</span>
              <EmotePicker onSendEmote={sendOnlineEmote} />
            </div>
          )}

          <div className="bottom-layout-three-columns">
            {/* Left Column: Player Hand */}
            <div className="hand-container-box">
              <div className="hand-box-header">
                <span className="hand-title-text">Your Hand ({myPlayer?.hand?.length ?? 0} Cards)</span>
                <span className="hand-info-icon" title="Tap cards to select, then click Open Series/Triplicate or Discard">ⓘ</span>
              </div>
              <PlayerHand />
            </div>

            {/* Center Column: Action Control Buttons */}
            <div className="actions-center-column">
              <ActionPanel />
            </div>

            {/* Right Column: Game Info Box */}
            <div className="game-info-side-box">
              <div className="game-info-header">
                <span className="info-title">ⓘ Game Info</span>
              </div>
              <div className="game-info-body">
                <div className="info-row">
                  <span className="info-label">Game Mode :</span>
                  <span className="info-value">{state.gameMode === '4P' ? '4 Players' : '2 Players'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Bazzi Mode :</span>
                  <span className="info-value">{state.bazziMode || 'Classic'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">First Turn :</span>
                  <span className="info-value">{state.playerOrder[0] === myPlayerId ? 'Player 1' : 'Player 2'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
