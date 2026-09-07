import React, { useState } from 'react';
import { authBackend } from '../../services/authBackend';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import type { UserSession } from '../../types/auth';

interface PlayerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (session: UserSession) => void;
}

export const PlayerAuthModal: React.FC<PlayerAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const res = authBackend.login(email, password, 'player');
      setIsSubmitting(false);

      if (res.success && res.session) {
        onAuthSuccess(res.session);
        onClose();
      } else {
        setErrorMsg(res.error || 'Login failed. Invalid credentials.');
      }
    }, 400);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await authBackend.registerPlayerAsync(username, email, password, confirmPassword);
      setIsSubmitting(false);

      if (res.success && res.session) {
        onAuthSuccess(res.session);
        onClose();
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Registration error occurred.');
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setInfoMsg(`Password reset instructions sent to ${email}. Check your inbox.`);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-auth">
        {/* Header Banner */}
        <div className="auth-header-banner">
          <h2 className="auth-modal-title">
            {tab === 'login' ? 'PLAYER LOGIN' : tab === 'register' ? 'CREATE PLAYER ACCOUNT' : 'FORGOT PASSWORD'}
          </h2>
          <p className="auth-modal-subtitle">
            {tab === 'login'
              ? 'Access your Bhukhara profile and virtual coin balance'
              : tab === 'register'
              ? 'Register to receive your unique Player ID (BHUK-100001)'
              : 'Enter your email to recover password'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); setInfoMsg(''); }}
          >
            <LogIn size={16} /> LOGIN
          </button>

          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); setInfoMsg(''); }}
          >
            <UserPlus size={16} /> REGISTER
          </button>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} /> EMAIL OR USERNAME / PLAYER ID
              </label>
              <input
                type="text"
                className="admin-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. namit@bhukhara.app or BHUK-100001"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={14} /> PASSWORD
              </label>
              <input
                type="password"
                className="admin-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password..."
                required
              />
            </div>

            {errorMsg && <div className="admin-error-banner">⚠️ {errorMsg}</div>}

            <div className="auth-forgot-link-box">
              <button
                type="button"
                className="btn-forgot-link"
                onClick={() => { setTab('forgot'); setErrorMsg(''); setInfoMsg(''); }}
              >
                Forgot Password?
              </button>
            </div>

            <div className="modal-footer space-between">
              <button type="button" className="btn btn-secondary btn-medium" onClick={onClose}>
                CANCEL
              </button>

              <button type="submit" className="btn btn-gold btn-large" disabled={isSubmitting}>
                <LogIn size={18} /> {isSubmitting ? 'LOGGING IN...' : 'LOGIN TO ACCOUNT'}
              </button>
            </div>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label className="form-label">
                <User size={14} /> USERNAME
              </label>
              <input
                type="text"
                className="admin-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. Namit"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={14} /> EMAIL ADDRESS
              </label>
              <input
                type="email"
                className="admin-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. namit@bhukhara.app"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={14} /> PASSWORD
              </label>
              <input
                type="password"
                className="admin-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={14} /> CONFIRM PASSWORD
              </label>
              <input
                type="password"
                className="admin-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password..."
                required
              />
            </div>

            <div className="id-note-box">
              ℹ️ Your unique Player ID (e.g. <code>BHUK-100005</code>) will be generated automatically upon registration. Initial balance is 🪙 0 coins (coins are added/managed by Admin).
            </div>

            {errorMsg && <div className="admin-error-banner">⚠️ {errorMsg}</div>}

            <div className="modal-footer space-between">
              <button type="button" className="btn btn-secondary btn-medium" onClick={onClose}>
                CANCEL
              </button>

              <button type="submit" className="btn btn-success btn-large" disabled={isSubmitting}>
                <UserPlus size={18} /> {isSubmitting ? 'CREATING...' : 'REGISTER PLAYER'}
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password Form */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="auth-form">
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} /> ENTER YOUR REGISTERED EMAIL
              </label>
              <input
                type="email"
                className="admin-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. player@bhukhara.app"
                required
              />
            </div>

            {errorMsg && <div className="admin-error-banner">⚠️ {errorMsg}</div>}
            {infoMsg && <div className="auth-info-banner">✅ {infoMsg}</div>}

            <div className="modal-footer space-between">
              <button
                type="button"
                className="btn btn-secondary btn-medium"
                onClick={() => setTab('login')}
              >
                <ArrowLeft size={16} /> BACK TO LOGIN
              </button>

              <button type="submit" className="btn btn-gold btn-medium">
                <KeyRound size={16} /> SEND RESET LINK
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
