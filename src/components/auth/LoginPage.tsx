import React, { useState } from 'react';
import { authBackend } from '../../services/authBackend';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User, ShieldCheck, Play } from 'lucide-react';
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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanInput = email.trim();
    if (!cleanInput) {
      setErrorMsg('Please enter your email, username, or Player ID.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await authBackend.loginAsync(cleanInput, password);
      setIsSubmitting(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Login failed. Invalid credentials.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Login failed. Invalid credentials.');
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanName = username.trim();
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Username must be at least 2 characters long.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await authBackend.registerPlayerAsync(cleanName, cleanEmail, password, confirmPassword);
      setIsSubmitting(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
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

    setInfoMsg(`Password reset link sent to ${email}. Check your inbox.`);
  };

  const handleGuestLogin = () => {
    const session = authBackend.createGuestSession();
    onLoginSuccess(session);
  };

  return (
    <div
      className="login-screen-container"
      style={{
        minHeight: '100vh',
        maxHeight: '100vh',
        width: '100vw',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #0c382b 0%, #041410 100%)',
        padding: '16px',
        zIndex: 100,
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="login-card-box"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(4, 20, 16, 0.96)',
          border: '1.5px solid #d4af37',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 35px rgba(212, 175, 55, 0.35)',
          color: '#fff',
          zIndex: 101,
          position: 'relative',
          margin: 'auto',
        }}
      >
        {/* Logo & Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#f1c40f',
              letterSpacing: '2px',
              textShadow: '0 2px 10px rgba(241,196,15,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>🃏 BHUKHARA</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '2px' }}>
            The Ultimate 7-Card Combination Card Game
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '16px',
            background: 'rgba(0,0,0,0.5)',
            padding: '4px',
            borderRadius: '10px',
          }}
        >
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setErrorMsg('');
              setInfoMsg('');
            }}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: tab === 'login' ? '#d4af37' : 'transparent',
              color: tab === 'login' ? '#000' : '#fff',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              touchAction: 'manipulation',
            }}
          >
            <LogIn size={16} /> LOGIN
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setErrorMsg('');
              setInfoMsg('');
            }}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: tab === 'register' ? '#d4af37' : 'transparent',
              color: tab === 'register' ? '#000' : '#fff',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              touchAction: 'manipulation',
            }}
          >
            <UserPlus size={16} /> REGISTER
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form noValidate onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f1c40f',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Mail size={14} /> EMAIL / USERNAME / PLAYER ID
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. namit@bhukhara.app or BHUK-100001"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f1c40f',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={14} /> PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'rgba(231,76,60,0.2)',
                  border: '1px solid #e74c3c',
                  color: '#ff6b6b',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => {
                  setTab('forgot');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  touchAction: 'manipulation',
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              onClick={(e) => handleLogin(e)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 15px rgba(241,196,15,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                touchAction: 'manipulation',
              }}
            >
              <LogIn size={20} /> {isSubmitting ? 'VERIFYING LOGIN...' : 'LOGIN TO PLAY'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <form noValidate onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f1c40f',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={14} /> USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Namit"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f1c40f',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Mail size={14} /> EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. player@bhukhara.app"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f1c40f',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={14} /> PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f1c40f',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={14} /> CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'rgba(231,76,60,0.2)',
                  border: '1px solid #e74c3c',
                  color: '#ff6b6b',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              onClick={(e) => handleRegister(e)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 15px rgba(46,204,113,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                touchAction: 'manipulation',
              }}
            >
              <UserPlus size={20} /> {isSubmitting ? 'CREATING ACCOUNT...' : 'REGISTER & START'}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {tab === 'forgot' && (
          <form noValidate onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#f1c40f',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Mail size={14} /> REGISTERED EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. player@bhukhara.app"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'rgba(231,76,60,0.2)',
                  border: '1px solid #e74c3c',
                  color: '#ff6b6b',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}
            {infoMsg && (
              <div
                style={{
                  background: 'rgba(46,204,113,0.2)',
                  border: '1px solid #2ecc71',
                  color: '#2ecc71',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                ✅ {infoMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setTab('login')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                onClick={(e) => handleForgot(e)}
                style={{
                  flex: 1.5,
                  padding: '10px',
                  background: '#d4af37',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  touchAction: 'manipulation',
                }}
              >
                <KeyRound size={16} /> RESET LINK
              </button>
            </div>
          </form>
        )}

        {/* PROMINENT GUEST LOGIN / QUICK START OPTION */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px dashed rgba(212,175,55,0.3)',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleGuestLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(212,175,55,0.15)',
              border: '1.5px solid #d4af37',
              borderRadius: '8px',
              color: '#f1c40f',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              touchAction: 'manipulation',
            }}
          >
            <Play size={18} fill="#f1c40f" /> 🎮 PLAY AS GUEST / QUICK START
          </button>
        </div>

        {/* Security Badge */}
        <div
          style={{
            marginTop: '14px',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <ShieldCheck size={14} style={{ color: '#2ecc71' }} /> Secure Authentication System
        </div>
      </div>
    </div>
  );
};

export default LoginPage;


