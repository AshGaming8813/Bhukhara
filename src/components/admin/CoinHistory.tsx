import React, { useState, useEffect } from 'react';
import type { DbCoinAdjustment } from '../../types/admin';
import { authBackend } from '../../services/authBackend';
import { Search, Filter, Shield, Lock } from 'lucide-react';

export const CoinHistory: React.FC = () => {
  const [searchPlayer, setSearchPlayer] = useState('');
  const [filterAction, setFilterAction] = useState<'ALL' | 'ADD' | 'REMOVE'>('ALL');
  const [searchAdmin, setSearchAdmin] = useState('');
  const [history, setHistory] = useState<DbCoinAdjustment[]>([]);

  const loadHistory = () => {
    let list = authBackend.getAdjustmentsList();

    if (filterAction !== 'ALL') {
      list = list.filter(h => h.action === filterAction);
    }

    if (searchPlayer.trim()) {
      const q = searchPlayer.trim().toLowerCase();
      list = list.filter(
        h => h.playerUsername.toLowerCase().includes(q) || h.playerId.toLowerCase().includes(q)
      );
    }

    if (searchAdmin.trim()) {
      const q = searchAdmin.trim().toLowerCase();
      list = list.filter(
        h => h.adminUsername.toLowerCase().includes(q) || h.adminId.toLowerCase().includes(q)
      );
    }

    setHistory(list);
  };

  useEffect(() => {
    loadHistory();
    const unsub = authBackend.subscribe(loadHistory);
    return () => unsub();
  }, [searchPlayer, filterAction, searchAdmin]);

  return (
    <div className="admin-history-view">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Coin Adjustment History</h1>
          <p className="page-subtitle">Read-only audit log of all virtual coin additions and removals</p>
        </div>
        <div className="read-only-badge">
          <Lock size={14} /> IMMUTABLE LOG (READ-ONLY)
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar-card">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            value={searchPlayer}
            onChange={e => setSearchPlayer(e.target.value)}
            placeholder="Filter by player username or ID..."
          />
        </div>

        <div className="filter-controls-group">
          <div className="filter-item">
            <Filter size={14} />
            <label>Action:</label>
            <select
              className="select-control"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value as any)}
            >
              <option value="ALL">All Actions</option>
              <option value="ADD">ADD Only</option>
              <option value="REMOVE">REMOVE Only</option>
            </select>
          </div>

          <div className="filter-item">
            <Shield size={14} />
            <label>Admin:</label>
            <input
              type="text"
              className="search-input-small"
              value={searchAdmin}
              onChange={e => setSearchAdmin(e.target.value)}
              placeholder="Admin ID/name..."
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="dashboard-section-box">
        {history.length === 0 ? (
          <div className="no-data-notice">No adjustment records match your filters.</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Adjustment ID</th>
                  <th>Timestamp</th>
                  <th>Player Name</th>
                  <th>Player ID</th>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>Previous Balance</th>
                  <th>New Balance</th>
                  <th>Reason</th>
                  <th>Admin ID</th>
                </tr>
              </thead>
              <tbody>
                {history.map(adj => (
                  <tr key={adj.id}>
                    <td className="id-cell"><code>{adj.id}</code></td>
                    <td className="timestamp-cell">
                      {new Date(adj.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="username-cell"><strong>{adj.playerUsername}</strong></td>
                    <td className="id-cell"><code>{adj.playerId}</code></td>
                    <td>
                      <span className={`action-badge ${adj.action === 'ADD' ? 'badge-add' : 'badge-remove'}`}>
                        {adj.action === 'ADD' ? '+ ADD' : '- REMOVE'}
                      </span>
                    </td>
                    <td className="amount-cell">
                      <strong>{adj.action === 'ADD' ? `+${adj.amount.toLocaleString()}` : `-${adj.amount.toLocaleString()}`} 🪙</strong>
                    </td>
                    <td className="old-bal">{adj.previousBalance.toLocaleString()}</td>
                    <td className="new-bal">{adj.newBalance.toLocaleString()}</td>
                    <td className="reason-cell">{adj.reason}</td>
                    <td className="admin-cell"><code>{adj.adminUsername}</code></td>
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
