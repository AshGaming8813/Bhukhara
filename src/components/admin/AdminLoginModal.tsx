import React, { useState } from 'react';
import { authBackend } from '../../services/authBackend';
import { ShieldCheck, Lock, Mail, LogIn } from 'lucide-react';
import type { UserSession } from '../../types/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [emailOrUser, setEmailOrUser] = useState('admin@bhukhara.app');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      // Server-Authoritative Admin Role Login
      const res = authBackend.login(emailOrUser, password, 'admin');
      setIsSubmitting(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Login failed. Invalid admin credentials or privileges.');
      }
    }, 400);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-admin-login">
        <div className="admin-login-header">
          <div className="shield-icon-badge">
            <ShieldCheck size={48} className="shield-icon" />
          </div>
          <h1 className="admin-title">BHUKHARA ADMIN PANEL</h1>
          <p className="admin-subtitle">Dedicated Server & Virtual Coin Management</p>
        </div>

        {/* Demo Credentials Helper */}
        <div className="demo-credentials-box">
          <span>Admin Login Credentials:</span>
          <strong>Email: admin@bhukhara.app | Password: admin123</strong>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label className="form-label">
              <Mail size={14} /> ADMIN EMAIL
            </label>
            <input
              type="email"
              className="admin-input"
              value={emailOrUser}
              onChange={e => setEmailOrUser(e.target.value)}
              placeholder="admin@bhukhara.app"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={14} /> ADMIN PASSWORD
            </label>
            <input
              type="password"
              className="admin-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password..."
              required
            />
          </div>

          {errorMsg && <div className="admin-error-banner">⚠️ {errorMsg}</div>}

          <div className="modal-footer" style={{ justifyContent: 'center', marginTop: '10px' }}>
            <button type="submit" className="btn btn-gold btn-large" style={{ width: '100%' }} disabled={isSubmitting}>
              <LogIn size={18} /> {isSubmitting ? 'VERIFYING ADMIN ROLE...' : 'AUTHENTICATE & OPEN DASHBOARD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
