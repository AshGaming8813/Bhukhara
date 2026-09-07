import React, { useState, useEffect } from 'react';
import type { AdminDashboardMetrics } from '../../types/admin';
import { authBackend } from '../../services/authBackend';
import { Users, UserCheck, Coins, PlusCircle, MinusCircle, History, ArrowRight } from 'lucide-react';

interface AdminDashboardProps {
  onNavigatePlayers: () => void;
  onNavigateHistory: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigatePlayers,
  onNavigateHistory,
}) => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>(() => authBackend.getDashboardMetrics());

  useEffect(() => {
    const refresh = () => setMetrics(authBackend.getDashboardMetrics());
    const unsub = authBackend.subscribe(refresh);
    return () => unsub();
  }, []);

  return (
    <div className="admin-dashboard-view">
      <div className="dashboard-header-row">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Real-time metrics for Bhukhara virtual coins & player activity</p>
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card gold-border" onClick={onNavigatePlayers}>
          <div className="card-icon-box bg-gold">
            <Users size={24} />
          </div>
          <div className="card-info">
            <span className="metric-label">Total Players</span>
            <span className="metric-value">{metrics.totalPlayers}</span>
          </div>
        </div>

        <div className="metric-card green-border" onClick={onNavigatePlayers}>
          <div className="card-icon-box bg-green">
            <UserCheck size={24} />
          </div>
          <div className="card-info">
            <span className="metric-label">Active Players</span>
            <span className="metric-value">{metrics.activePlayers}</span>
          </div>
        </div>

        <div className="metric-card amber-border">
          <div className="card-icon-box bg-amber">
            <Coins size={24} />
          </div>
          <div className="card-info">
            <span className="metric-label">Total Virtual Coins Held</span>
            <span className="metric-value">🪙 {metrics.totalCoinsHeld.toLocaleString()}</span>
          </div>
        </div>

        <div className="metric-card blue-border">
          <div className="card-icon-box bg-blue">
            <PlusCircle size={24} />
          </div>
          <div className="card-info">
            <span className="metric-label">Coins Added by Admin</span>
            <span className="metric-value text-success">+{metrics.totalCoinsAdded.toLocaleString()}</span>
          </div>
        </div>

        <div className="metric-card red-border">
          <div className="card-icon-box bg-red">
            <MinusCircle size={24} />
          </div>
          <div className="card-info">
            <span className="metric-label">Coins Removed by Admin</span>
            <span className="metric-value text-danger">-{metrics.totalCoinsRemoved.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Recent Adjustments Log Table */}
      <div className="dashboard-section-box">
        <div className="section-header-row">
          <h2 className="section-title">
            <History size={18} /> Recent Coin Adjustments
          </h2>
          <button className="btn-link-action" onClick={onNavigateHistory}>
            View All History <ArrowRight size={14} />
          </button>
        </div>

        {metrics.recentAdjustments.length === 0 ? (
          <div className="no-data-notice">No coin adjustments logged yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Player Name</th>
                  <th>Player ID</th>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>Balance Flow</th>
                  <th>Reason</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentAdjustments.map(adj => (
                  <tr key={adj.id}>
                    <td className="timestamp-cell">
                      {new Date(adj.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
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
                    <td className="flow-cell">
                      <span className="old-bal">{adj.previousBalance.toLocaleString()}</span>
                      <ArrowRight size={12} className="flow-arrow" />
                      <span className="new-bal">{adj.newBalance.toLocaleString()}</span>
                    </td>
                    <td className="reason-cell">{adj.reason}</td>
                    <td className="admin-cell">{adj.adminUsername}</td>
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
