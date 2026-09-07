import React, { useState } from 'react';
import { authBackend } from '../../services/authBackend';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User, ShieldCheck } from 'lucide-react';
import type { UserSession } from '../../types/auth';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const res = authBackend.login(email, password);
      setIsSubmitting(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Login failed. Invalid credentials.');
      }
    }, 300);
  };



  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const res = authBackend.registerPlayer(username, email, password, confirmPassword);
      setIsSubmitting(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    }, 300);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setInfoMsg(`Password reset link sent to ${email}. Check your inbox.`);
  };

  return (
    <div className="login-screen-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top, #0c382b 0%, #041410 100%)', padding: '20px' }}>
      <div className="login-card-box" style={{ width: '100%', maxWidth: '440px', background: 'rgba(4, 20, 16, 0.92)', border: '1.5px solid #d4af37', borderRadius: '16px', padding: '24px', boxShadow: '0 0 30px rgba(212, 175, 55, 0.25)', color: '#fff' }}>
        
        {/* Logo & Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f1c40f', letterSpacing: '2px', textShadow: '0 2px 10px rgba(241,196,15,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>🃏 BHUKHARA</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px' }}>
            The Ultimate 7-Card Combination Card Game
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); setInfoMsg(''); }}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: tab === 'login' ? '#d4af37' : 'transparent', color: tab === 'login' ? '#000' : '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
          >
            <LogIn size={16} /> LOGIN FIRST
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); setInfoMsg(''); }}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: tab === 'register' ? '#d4af37' : 'transparent', color: tab === 'register' ? '#000' : '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
          >
            <UserPlus size={16} /> REGISTER
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1c40f', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> EMAIL / USERNAME / PLAYER ID
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. namit@bhukhara.app or BHUK-100001"
                required
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1c40f', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(231,76,60,0.2)', border: '1px solid #e74c3c', color: '#ff6b6b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => { setTab('forgot'); setErrorMsg(''); setInfoMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(241,196,15,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}
            >
              <LogIn size={20} /> {isSubmitting ? 'LOGGING IN...' : 'LOGIN TO PLAY'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1c40f', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. Namit"
                required
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1c40f', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. player@bhukhara.app"
                required
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1c40f', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters..."
                required
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1c40f', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password..."
                required
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(231,76,60,0.2)', border: '1px solid #e74c3c', color: '#ff6b6b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(46,204,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}
            >
              <UserPlus size={20} /> {isSubmitting ? 'CREATING...' : 'REGISTER & START'}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1c40f', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> REGISTERED EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. player@bhukhara.app"
                required
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {errorMsg && <div style={{ background: 'rgba(231,76,60,0.2)', border: '1px solid #e74c3c', color: '#ff6b6b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>⚠️ {errorMsg}</div>}
            {infoMsg && <div style={{ background: 'rgba(46,204,113,0.2)', border: '1px solid #2ecc71', color: '#2ecc71', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>✅ {infoMsg}</div>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setTab('login')}
                style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                style={{ flex: 1.5, padding: '10px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <KeyRound size={16} /> RESET LINK
              </button>
            </div>
          </form>
        )}



        {/* Security Badge */}
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <ShieldCheck size={14} style={{ color: '#2ecc71' }} /> Secure Authentication System
        </div>
      </div>
    </div>
  );
};
