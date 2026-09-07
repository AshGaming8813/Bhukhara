import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { HomeScreen } from './components/home/HomeScreen';
import { GameTable } from './components/game/GameTable';
import { HowToPlayModal } from './components/modals/HowToPlayModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { RestartConfirmModal } from './components/modals/RestartConfirmModal';
import { FoulModal } from './components/modals/FoulModal';
import { WinnerModal } from './components/modals/WinnerModal';

import { OnlineMenuModal } from './components/online/OnlineMenuModal';
import { CreateRoomModal } from './components/online/CreateRoomModal';
import { JoinRoomModal } from './components/online/JoinRoomModal';
import { RoomLobbyModal } from './components/online/RoomLobbyModal';
import { onlineEngine, getStoredPlayerId, getStoredDisplayName } from './services/onlineEngine';
import type { GameMode, BazziMode, OnlineRoom } from './types/game';

// Auth & Admin Imports
import { authBackend } from './services/authBackend';
import { LoginPage } from './components/auth/LoginPage';
import { PlayerAuthModal } from './components/auth/PlayerAuthModal';
import { PlayerProfileModal } from './components/auth/PlayerProfileModal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminPlayers } from './components/admin/AdminPlayers';
import { CoinHistory } from './components/admin/CoinHistory';
import { CoinManagementModal } from './components/admin/CoinManagementModal';

import type { User, UserSession } from './types/auth';

import './styles/main.css';
import './styles/table.css';
import './styles/cards.css';
import './styles/modals.css';
import './styles/online.css';
import './styles/admin.css';

const MainApp: React.FC = () => {
  const { state, startNewGame, resetToHome, setOnlineGameState } = useGame();
  const [view, setView] = useState<'HOME' | 'GAME' | 'ADMIN'>('HOME');

  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);

  // Online Multiplayer States
  const [isOnlineMenuOpen, setIsOnlineMenuOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);

  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<OnlineRoom | null>(null);

  // Auth & Session States
  const [currentSession, setCurrentSession] = useState<UserSession | null>(() => authBackend.verifySession());
  const [currentUser, setCurrentUser] = useState<User | null>(() => authBackend.getCurrentUser());
  const [isPlayerAuthOpen, setIsPlayerAuthOpen] = useState(false);
  const [isPlayerProfileOpen, setIsPlayerProfileOpen] = useState(false);

  // Admin Hidden Route States
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'players' | 'history' | 'account'>('dashboard');
  const [selectedPlayerForCoins, setSelectedPlayerForCoins] = useState<User | null>(null);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState('');

  const localPlayerId = getStoredPlayerId();

  // Listen to Auth State Updates
  useEffect(() => {
    const refreshUser = () => {
      const sess = authBackend.verifySession();
      setCurrentSession(sess);
      setCurrentUser(authBackend.getCurrentUser());
    };

    refreshUser();
    const unsub = authBackend.subscribe(refreshUser);
    return () => unsub();
  }, []);

  // Server-Authoritative Route Guard & Hash Handler
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setAccessDeniedMsg('');

      if (hash.startsWith('#admin')) {
        const adminSess = authBackend.verifyAdminSession();

        if (hash === '#admin/login') {
          if (adminSess && adminSess.role === 'admin') {
            setCurrentSession(adminSess);
            setIsAdminLoginOpen(false);
            setView('ADMIN');
            window.location.hash = '#admin/dashboard';
          } else {
            setIsAdminLoginOpen(true);
          }
          return;
        }

        // Check Server-Authoritative Admin Session & Role
        if (adminSess && adminSess.role === 'admin') {
          setCurrentSession(adminSess);
          setIsAdminLoginOpen(false);
          setView('ADMIN');
          if (hash.includes('players')) setAdminTab('players');
          else if (hash.includes('history') || hash.includes('coins')) setAdminTab('history');
          else if (hash.includes('account')) setAdminTab('account');
          else setAdminTab('dashboard');
        } else {
          // REJECT ACCESS FOR NORMAL PLAYERS OR UNAUTHENTICATED USERS
          setAccessDeniedMsg('Access Denied. Administrator authentication required.');
          window.location.hash = '';
          setView('HOME');
        }
      } else if (hash === '#login' || hash === '#register') {
        setIsPlayerAuthOpen(true);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen to active online room updates
  useEffect(() => {
    if (onlineRoomCode) {
      const unsub = onlineEngine.subscribeToRoom(onlineRoomCode, ({ room, gameState }) => {
        setCurrentRoom(room);
        if (gameState) {
          const mySlotId = room?.players[localPlayerId]?.slotId ||
            Object.values(room?.players || {}).find(p => p.id === localPlayerId)?.slotId ||
            (room?.hostId === localPlayerId ? 'P1' : 'P2');

          const onlineState = {
            ...gameState,
            isOnlineMode: true,
            onlineRoomCode: onlineRoomCode,
            localPlayerId: mySlotId,
          };
          setOnlineGameState(onlineState);
        }
        if (room?.status === 'PLAYING') {
          setIsLobbyOpen(false);
          setIsOnlineMenuOpen(false);
          setIsCreateRoomOpen(false);
          setIsJoinRoomOpen(false);
          setView('GAME');
        }
      });
      return () => unsub();
    }
  }, [onlineRoomCode, localPlayerId, setOnlineGameState]);

  const handleStartGame = () => {
    setView('GAME');
  };

  const handleBackToHome = () => {
    resetToHome();
    setOnlineRoomCode(null);
    setCurrentRoom(null);
    window.location.hash = '';
    setView('HOME');
  };

  const handlePlayAgain = () => {
    startNewGame(state.gameMode, state.bazziMode);
    setView('GAME');
  };

  // Online Handlers
  const handleOpenOnlineMenu = () => {
    setIsOnlineMenuOpen(true);
  };

  const handleCreateRoomAction = (mode: GameMode, bazziMode: BazziMode, coinWager: number) => {
    const name = currentUser ? currentUser.username : getStoredDisplayName();
    const { roomCode } = onlineEngine.createRoom(name, mode, bazziMode, coinWager);
    setOnlineRoomCode(roomCode);
    setIsCreateRoomOpen(false);
    setIsOnlineMenuOpen(false);
    setIsLobbyOpen(true);
  };

  const handleJoinRoomAction = async (code: string) => {
    const name = currentUser ? currentUser.username : getStoredDisplayName();
    const res = await onlineEngine.joinRoom(code, name);
    if (res.success) {
      setOnlineRoomCode(code);
      setIsJoinRoomOpen(false);
      setIsOnlineMenuOpen(false);
      setIsLobbyOpen(true);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const handleToggleReadyAction = () => {
    if (onlineRoomCode) {
      onlineEngine.toggleReady(onlineRoomCode, localPlayerId);
    }
  };

  const handleStartOnlineGameAction = () => {
    if (onlineRoomCode) {
      return onlineEngine.startGame(onlineRoomCode, localPlayerId);
    }
    return { success: false, error: 'No active room.' };
  };

  const handleLeaveLobbyAction = () => {
    setOnlineRoomCode(null);
    setCurrentRoom(null);
    setIsLobbyOpen(false);
  };

  // Player Auth Handlers
  const handlePlayerAuthSuccess = (session: UserSession) => {
    setCurrentSession(session);
    setCurrentUser(authBackend.getCurrentUser());
    setIsPlayerAuthOpen(false);
    if (session.role === 'admin') {
      setView('ADMIN');
      setIsAdminLoginOpen(false);
      window.location.hash = '#admin/dashboard';
    } else {
      setView('HOME');
    }
  };

  const handlePlayerLogout = () => {
    authBackend.logout();
    setCurrentSession(null);
    setCurrentUser(null);
    setIsPlayerProfileOpen(false);
    window.location.hash = '';
    setView('HOME');
  };

  // Admin Handlers
  const handleAdminLoginSuccess = (session: UserSession) => {
    setCurrentSession(session);
    setIsAdminLoginOpen(false);
    setView('ADMIN');
    window.location.hash = '#admin/dashboard';
  };

  const handleAdminLogout = () => {
    authBackend.logout();
    setCurrentSession(null);
    window.location.hash = '#admin/login';
    setIsAdminLoginOpen(true);
  };

  const activeAdminSession = currentSession?.role === 'admin' ? currentSession : authBackend.verifyAdminSession();

  return (
    <div className="app-container">
      {/* Access Denied Notification Banner */}
      {accessDeniedMsg && (
        <div className="access-denied-toast">
          <span>🚫 {accessDeniedMsg}</span>
          <button onClick={() => setAccessDeniedMsg('')}>✕</button>
        </div>
      )}

      {(view === 'ADMIN' || activeAdminSession?.role === 'admin' || window.location.hash.startsWith('#admin/')) && activeAdminSession ? (
        <AdminLayout
          session={{
            token: activeAdminSession.token,
            adminId: activeAdminSession.userId,
            email: activeAdminSession.email,
            username: activeAdminSession.username,
            role: 'SUPER_ADMIN',
            expiresAt: activeAdminSession.expiresAt,
          }}
          activeTab={adminTab}
          onTabChange={tab => {
            setAdminTab(tab);
            window.location.hash = `#admin/${tab}`;
          }}
          onLogout={handleAdminLogout}
        >
          {adminTab === 'dashboard' && (
            <AdminDashboard
              onNavigatePlayers={() => {
                setAdminTab('players');
                window.location.hash = '#admin/players';
              }}
              onNavigateHistory={() => {
                setAdminTab('history');
                window.location.hash = '#admin/history';
              }}
            />
          )}

          {adminTab === 'players' && (
            <AdminPlayers
              onSelectPlayerForCoins={player => setSelectedPlayerForCoins(player)}
            />
          )}

          {adminTab === 'history' && <CoinHistory />}

          {adminTab === 'account' && (
            <div className="dashboard-section-box">
              <h2 className="section-title">Admin Account Credentials</h2>
              <div style={{ marginTop: '12px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                <p>Username: <strong>{activeAdminSession.username}</strong></p>
                <p>Email: <strong>{activeAdminSession.email}</strong></p>
                <p>Role: <strong style={{ color: '#f1c40f' }}>{activeAdminSession.role.toUpperCase()}</strong></p>
                <p>Admin ID: <code>{activeAdminSession.userId}</code></p>
              </div>
            </div>
          )}
        </AdminLayout>
      ) : !currentSession ? (
        <LoginPage onLoginSuccess={handlePlayerAuthSuccess} />
      ) : view === 'HOME' ? (
        <HomeScreen
          currentUser={currentUser}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onStartGame={handleStartGame}
          onOpenOnlineMenu={handleOpenOnlineMenu}
          onOpenAuthModal={() => setIsPlayerAuthOpen(true)}
          onOpenProfileModal={() => setIsPlayerProfileOpen(true)}
        />
      ) : (
        <GameTable
          onOpenSettings={() => setIsSettingsOpen(true)}
          onConfirmRestart={() => setIsRestartConfirmOpen(true)}
        />
      )}

      {/* Offline Modals */}
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfirmRestart={() => setIsRestartConfirmOpen(true)}
        onBackToHome={handleBackToHome}
      />
      <RestartConfirmModal
        isOpen={isRestartConfirmOpen}
        onClose={() => setIsRestartConfirmOpen(false)}
      />
      <FoulModal onPlayAgain={handlePlayAgain} onBackToHome={handleBackToHome} />
      <WinnerModal onPlayAgain={handlePlayAgain} onBackToHome={handleBackToHome} />

      {/* Player Auth & Profile Modals */}
      <PlayerAuthModal
        isOpen={isPlayerAuthOpen}
        onClose={() => setIsPlayerAuthOpen(false)}
        onAuthSuccess={handlePlayerAuthSuccess}
      />

      <PlayerProfileModal
        isOpen={isPlayerProfileOpen}
        user={currentUser}
        onClose={() => setIsPlayerProfileOpen(false)}
        onLogout={handlePlayerLogout}
      />

      {/* Online Multiplayer Modals */}
      <OnlineMenuModal
        isOpen={isOnlineMenuOpen}
        onClose={() => setIsOnlineMenuOpen(false)}
        onCreateRoom={() => {
          setIsOnlineMenuOpen(false);
          setIsCreateRoomOpen(true);
        }}
        onJoinRoom={() => {
          setIsOnlineMenuOpen(false);
          setIsJoinRoomOpen(true);
        }}
      />

      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreateRoom={handleCreateRoomAction}
      />

      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
        onJoinRoom={handleJoinRoomAction}
      />

      <RoomLobbyModal
        isOpen={isLobbyOpen}
        room={currentRoom}
        localPlayerId={localPlayerId}
        onToggleReady={handleToggleReadyAction}
        onStartGame={handleStartOnlineGameAction}
        onLeaveRoom={handleLeaveLobbyAction}
      />

      {/* Hidden Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Coin Management Modal */}
      {selectedPlayerForCoins && activeAdminSession && activeAdminSession.role === 'admin' && (
        <CoinManagementModal
          isOpen={!!selectedPlayerForCoins}
          player={selectedPlayerForCoins}
          adminToken={activeAdminSession.token}
          onClose={() => setSelectedPlayerForCoins(null)}
          onAdjustmentComplete={() => {
            setSelectedPlayerForCoins(null);
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <GameProvider>
      <MainApp />
    </GameProvider>
  );
}

export default App;
