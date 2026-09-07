import React, { useState, useEffect } from 'react';
import type { User } from '../../types/auth';
import { authBackend } from '../../services/authBackend';
import { Search, Filter, ArrowUpDown, Coins, CheckCircle2, XCircle } from 'lucide-react';

interface AdminPlayersProps {
  onSelectPlayerForCoins: (player: User) => void;
}

export const AdminPlayers: React.FC<AdminPlayersProps> = ({ onSelectPlayerForCoins }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'balance' | 'username' | 'date'>('balance');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [players, setPlayers] = useState<User[]>([]);

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

  return (
    <div className="admin-players-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Player Management</h1>
          <p className="page-subtitle">View players, search balances, and adjust virtual coins</p>
        </div>
      </div>

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
