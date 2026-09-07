import React, { useState, useEffect } from 'react';
import type { User } from '../../types/auth';
import { authBackend } from '../../services/authBackend';
import { Search, Filter, ArrowUpDown, Coins, CheckCircle2, XCircle, UserPlus, X } from 'lucide-react';

interface AdminPlayersProps {
  onSelectPlayerForCoins: (player: User) => void;
}

export const AdminPlayers: React.FC<AdminPlayersProps> = ({ onSelectPlayerForCoins }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'balance' | 'username' | 'date'>('balance');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [players, setPlayers] = useState<User[]>([]);

  // Modal State for Adding New Player
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('player123');
  const [addError, setAddError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlayers = () => {
    let allUsers = authBackend.getUsers().filter(u => u.role === 'player');

    if (filterStatus !== 'all') {
      allUsers = allUsers.filter(u => u.status === filterStatus);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      allUsers = allUsers.filter(
        u => u.username.toLowerCase().includes(q) || u.player_id.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'balance') {
      allUsers.sort((a, b) => b.coin_balance - a.coin_balance);
    } else if (sortBy === 'username') {
      allUsers.sort((a, b) => a.username.localeCompare(b.username));
    } else if (sortBy === 'date') {
      allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setPlayers(allUsers);
  };

  useEffect(() => {
    loadPlayers();
    const unsub = authBackend.subscribe(loadPlayers);
    return () => unsub();
  }, [search, sortBy, filterStatus]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setIsSubmitting(true);

    try {
      const res = await authBackend.registerPlayerAsync(newUsername, newEmail, newPassword, newPassword);
      setIsSubmitting(false);

      if (res.success) {
        setShowAddModal(false);
        setNewUsername('');
        setNewEmail('');
        setNewPassword('player123');
        loadPlayers();
      } else {
        setAddError(res.error || 'Failed to add player.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setAddError(err?.message || 'Failed to create player record.');
    }
  };

  return (
    <div className="admin-players-view">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Player Management</h1>
          <p className="page-subtitle">View players, search balances, and adjust virtual coins</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setShowAddModal(true); setAddError(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#d4af37', color: '#000', fontWeight: 800, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          <UserPlus size={18} /> ADD NEW PLAYER
        </button>
      </div>

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#0a221a', border: '2px solid #d4af37', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f1c40f', fontSize: '1.2rem', fontWeight: 800 }}>➕ Add New Player Account</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {addError && (
              <div style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#ff6b6b', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '14px' }}>
                ⚠️ {addError}
              </div>
            )}

            <form onSubmit={handleAddPlayer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 700, display: 'block', marginBottom: '4px' }}>PLAYER NAME / USERNAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 700, display: 'block', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. amit@bhukhara.app"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 700, display: 'block', marginBottom: '4px' }}>PASSWORD</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #666', background: 'transparent', color: '#ccc', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#d4af37', color: '#000', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Creating...' : 'CREATE PLAYER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="filters-bar-card">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username, Player ID (BHUK-100001), or email..."
          />
        </div>

        <div className="filter-controls-group">
          <div className="filter-item">
            <ArrowUpDown size={14} />
            <label>Sort:</label>
            <select className="select-control" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="balance">Highest Coin Balance</option>
              <option value="username">Username A-Z</option>
              <option value="date">Newest Registered</option>
            </select>
          </div>

          <div className="filter-item">
            <Filter size={14} />
            <label>Status:</label>
            <select className="select-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="all">All Players</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players List Table */}
      <div className="dashboard-section-box">
        {players.length === 0 ? (
          <div className="no-data-notice">No players match your search criteria.</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Player Name</th>
                  <th>Player ID</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Virtual Coin Balance</th>
                  <th>Joined Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map(player => (
                  <tr key={player.id}>
                    <td className="player-col">
                      <div className="player-avatar-badge">👑</div>
                      <span className="player-username-text">{player.username}</span>
                    </td>
                    <td className="id-cell"><code>{player.player_id}</code></td>
                    <td className="email-cell">{player.email}</td>
                    <td>
                      <span className={`status-pill ${player.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {player.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {player.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="balance-cell">
                      <span className="balance-highlight">🪙 {player.coin_balance.toLocaleString()}</span>
                    </td>
                    <td className="timestamp-cell">
                      {new Date(player.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="text-right">
                      <button
                        className="btn-manage-coins"
                        onClick={() => onSelectPlayerForCoins(player)}
                      >
                        <Coins size={14} /> MANAGE COINS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
