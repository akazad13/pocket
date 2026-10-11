"use client";
import React, {useState} from 'react';
import {Wallet,Lock,KeyRound,Eye,EyeOff,ArrowRight,ShieldCheck,UserPlus,LogIn,User} from 'lucide-react';
import {toast} from 'sonner';

interface LoginScreenProps {
  onAuthenticated: (user: {username: string; name?: string}) => void;
}

export default function LoginScreen({onAuthenticated}: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('admin');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setError('Please enter a username.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'register'
        ? {username: cleanUser, password, name: name.trim()}
        : {username: cleanUser, password};

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      const data = await res.json() as {ok?: boolean; user?: {username: string; name?: string}; error?: string};

      if (!res.ok || !data.ok) {
        throw new Error(data.error || (mode === 'register' ? 'Registration failed' : 'Invalid credentials'));
      }

      const displayName = data.user?.name || data.user?.username || cleanUser;
      if (mode === 'register') {
        toast.success(`Account created! Welcome to Pocket, ${displayName}!`);
      } else {
        toast.success(`Welcome back, ${displayName}!`);
      }

      if (data.user) {
        onAuthenticated(data.user);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setMode('login');
    setUsername('admin');
    setPassword('pocket2026');
    setError('');
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand-icon">
            <Wallet size={28} />
          </div>
          <h1>pocket<span className="brand-dot">.</span></h1>
          <p>Everything you have, earn and spend · Secure Access</p>
        </div>

        <div className="login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'login-tab active' : 'login-tab'}
            onClick={() => { setMode('login'); setError(''); }}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'login-tab active' : 'login-tab'}
            onClick={() => { setMode('register'); setError(''); if (username === 'admin') setUsername(''); }}
          >
            <UserPlus size={15} /> Create Account
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error-alert" role="alert">
              {error}
            </div>
          )}

          <label className="login-field">
            <span>Username</span>
            <div className="login-input-wrap">
              <span className="login-input-icon"><Lock size={16} /></span>
              <input
                type="text"
                required
                autoFocus
                placeholder={mode === 'register' ? 'e.g. kalam' : 'admin'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          {mode === 'register' && (
            <label className="login-field">
              <span>Display Name <small>(optional)</small></span>
              <div className="login-input-wrap">
                <span className="login-input-icon"><User size={16} /></span>
                <input
                  type="text"
                  placeholder="e.g. Kalam"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </label>
          )}

          <label className="login-field">
            <span>Password</span>
            <div className="login-input-wrap">
              <span className="login-input-icon"><KeyRound size={16} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {mode === 'register' && (
            <label className="login-field">
              <span>Confirm Password</span>
              <div className="login-input-wrap">
                <span className="login-input-icon"><KeyRound size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </label>
          )}

          <button
            type="submit"
            className="primary login-submit-btn"
            disabled={loading || !username.trim() || !password || (mode === 'register' && !confirmPassword)}
          >
            {loading ? (mode === 'register' ? 'Creating account…' : 'Authenticating…') : (mode === 'register' ? 'Register & Unlock Pocket' : 'Unlock Pocket')}
            {!loading && <ArrowRight size={16} />}
          </button>

          {mode === 'login' && (
            <div className="login-demo-helper">
              <span>Default setup credentials:</span>
              <button type="button" className="demo-chip-btn" onClick={fillDemo} title="Click to prefill demo login">
                admin / pocket2026
              </button>
            </div>
          )}
        </form>

        <div className="login-footer">
          <ShieldCheck size={14} />
          <span>Multi-tenant data isolation with salted PBKDF2 &amp; HMAC sessions</span>
        </div>
      </div>
    </div>
  );
}
