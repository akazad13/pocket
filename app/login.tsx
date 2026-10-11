"use client";
import React, {useState} from 'react';
import {Wallet,Lock,KeyRound,Eye,EyeOff,ArrowRight,ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';

interface LoginScreenProps {
  onAuthenticated: (user: {username: string}) => void;
}

export default function LoginScreen({onAuthenticated}: LoginScreenProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
      });

      const data = await res.json() as {ok?: boolean; user?: {username: string}; error?: string};

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      toast.success(`Welcome back, ${data.user?.username || username}!`);
      if (data.user) {
        onAuthenticated(data.user);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
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

        <form className="login-form" onSubmit={handleLogin}>
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
                placeholder="admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div className="login-input-wrap">
              <span className="login-input-icon"><KeyRound size={16} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
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

          <button
            type="submit"
            className="primary login-submit-btn"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? 'Authenticating…' : 'Unlock Pocket'}
            {!loading && <ArrowRight size={16} />}
          </button>

          <div className="login-demo-helper">
            <span>Default setup credentials:</span>
            <button type="button" className="demo-chip-btn" onClick={fillDemo} title="Click to prefill demo login">
              admin / pocket2026
            </button>
          </div>
        </form>

        <div className="login-footer">
          <ShieldCheck size={14} />
          <span>Protected with HMAC session authentication &amp; origin safety</span>
        </div>
      </div>
    </div>
  );
}
