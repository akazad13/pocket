'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  User,
  KeyRound,
  ShieldCheck,
  Calendar,
  Wallet,
  ReceiptText,
  TrendingUp,
  Landmark,
  LogOut,
  Download,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: { username: string; name?: string } | null;
  onUserUpdated: (user: { username: string; name: string }) => void;
  onLogout: () => void;
}

interface ProfileStats {
  expenses: number;
  income: number;
  accounts: number;
  goals: number;
  bills: number;
}

export default function ProfileDialog({
  open,
  onClose,
  currentUser,
  onUserUpdated,
  onLogout
}: ProfileDialogProps) {
  const [tab, setTab] = useState<'overview' | 'edit' | 'password'>('overview');
  const [displayName, setDisplayName] = useState(currentUser?.name || currentUser?.username || '');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [stats, setStats] = useState<ProfileStats>({ expenses: 0, income: 0, accounts: 0, goals: 0, bills: 0 });
  const [loading, setLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    if (open) {
      void fetchProfile();
      setDisplayName(currentUser?.name || currentUser?.username || '');
      setPassError('');
      setNameError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTab('overview');
    }
  }, [open, currentUser]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json() as {
          user: { username: string; name: string; createdAt: string };
          stats: ProfileStats;
        };
        if (data.user) {
          setDisplayName(data.user.name);
          setCreatedAt(data.user.createdAt);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      // Non-blocking fetch failure
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');
    const clean = displayName.trim();
    if (!clean) {
      setNameError('Name cannot be blank.');
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean })
      });
      const data = await res.json() as { ok?: boolean; user?: { username: string; name: string }; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to update name.');
      }

      if (data.user) {
        onUserUpdated(data.user);
      }
      toast.success('Display name updated successfully.');
      setTab('overview');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassError('');

    if (!currentPassword) {
      setPassError('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setSavingPass(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to change password.');
      }

      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTab('overview');
    } catch (err) {
      setPassError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSavingPass(false);
    }
  }

  const initial = (displayName || currentUser?.username || 'U').slice(0, 1).toUpperCase();
  const formattedJoinDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Active';

  return (
    <Dialog open={open} onOpenChange={v => { if (!savingName && !savingPass) onClose(); }}>
      <DialogContent className="expense-dialog profile-dialog">
        <DialogTitle className="profile-dialog-title">
          <div className="profile-header-badge">
            <span className="profile-avatar-large">{initial}</span>
            <div>
              <h3>{displayName || currentUser?.username}</h3>
              <p className="profile-username-tag">@{currentUser?.username}</p>
            </div>
          </div>
        </DialogTitle>
        <DialogDescription>
          Manage your personal account profile, credentials, and data.
        </DialogDescription>

        <div className="login-tabs profile-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            className={`login-tab ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            <User size={14} /> Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'edit'}
            className={`login-tab ${tab === 'edit' ? 'active' : ''}`}
            onClick={() => setTab('edit')}
          >
            <Save size={14} /> Edit profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'password'}
            className={`login-tab ${tab === 'password' ? 'active' : ''}`}
            onClick={() => setTab('password')}
          >
            <KeyRound size={14} /> Change password
          </button>
        </div>

        {tab === 'overview' && (
          <div className="profile-overview-panel">
            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <ReceiptText size={16} className="stat-icon-blue" />
                <span className="stat-count">{stats.expenses}</span>
                <span className="stat-label">Expenses</span>
              </div>
              <div className="profile-stat-box">
                <TrendingUp size={16} className="stat-icon-green" />
                <span className="stat-count">{stats.income}</span>
                <span className="stat-label">Income entries</span>
              </div>
              <div className="profile-stat-box">
                <Landmark size={16} className="stat-icon-amber" />
                <span className="stat-count">{stats.accounts}</span>
                <span className="stat-label">Accounts</span>
              </div>
              <div className="profile-stat-box">
                <Calendar size={16} className="stat-icon-purple" />
                <span className="stat-count">{stats.goals + stats.bills}</span>
                <span className="stat-label">Goals &amp; Bills</span>
              </div>
            </div>

            <div className="profile-meta-info">
              <div className="meta-row">
                <span className="meta-label"><ShieldCheck size={14} /> Tenant isolation</span>
                <span className="meta-value badge-isolated">Private &amp; isolated</span>
              </div>
              <div className="meta-row">
                <span className="meta-label"><Clock size={14} /> Member since</span>
                <span className="meta-value">{formattedJoinDate}</span>
              </div>
            </div>

            <div className="profile-quick-actions">
              <a href="/api/backup" download className="profile-action-btn" title="Download personal JSON backup">
                <Download size={15} /> Download personal backup
              </a>
              <button
                type="button"
                className="profile-action-btn danger"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                title="Lock session"
              >
                <LogOut size={15} /> Lock session
              </button>
            </div>
          </div>
        )}

        {tab === 'edit' && (
          <form onSubmit={handleSaveName} className="profile-form">
            <label>
              Username
              <input
                type="text"
                disabled
                value={`@${currentUser?.username}`}
                className="input-disabled"
              />
              <small className="form-hint">Usernames are permanent and unique.</small>
            </label>

            <label>
              Display name
              <input
                type="text"
                autoFocus
                required
                maxLength={60}
                placeholder="Your full name or alias"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </label>

            {nameError && <p className="error" role="alert">{nameError}</p>}

            <div className="profile-form-buttons">
              <button type="submit" className="primary" disabled={savingName || !displayName.trim()}>
                {savingName ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="text-button" onClick={() => setTab('overview')}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={handleChangePassword} className="profile-form">
            <label>
              Current password
              <div className="password-wrapper">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="password-toggle"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  aria-label={showCurrentPass ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label>
              New password
              <div className="password-wrapper">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  maxLength={128}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="password-toggle"
                  onClick={() => setShowNewPass(!showNewPass)}
                  aria-label={showNewPass ? 'Hide password' : 'Show password'}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                required
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </label>

            {passError && <p className="error" role="alert">{passError}</p>}

            <div className="profile-form-buttons">
              <button
                type="submit"
                className="primary"
                disabled={savingPass || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              >
                {savingPass ? 'Updating…' : 'Update password'}
              </button>
              <button type="button" className="text-button" onClick={() => setTab('overview')}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
