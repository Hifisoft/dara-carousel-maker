'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, LogOut, Mail, UserRound } from 'lucide-react';
import { cloudEnabled, getCloudClient } from '../lib/cloud';
import { useWorkspace } from './WorkspaceGate';

export function ProfileSettingsPanel() {
  const workspace = useWorkspace();
  const displayName = typeof workspace?.user.user_metadata?.display_name === 'string' ? workspace.user.user_metadata.display_name : '';
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState<'profile' | 'reset' | 'sign-out' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setName(displayName); }, [workspace?.user.id, displayName]);

  if (!workspace) return <section className="ai-settings-section profile-settings" aria-labelledby="profile-title">
    <h2 id="profile-title">Profile</h2>
    <div className="profile-empty"><UserRound size={22} /><div><strong>No account connected</strong><p>{cloudEnabled ? 'Sign in to manage your profile.' : 'This preview uses a local workspace. Connect Supabase Auth to enable accounts and sign out.'}</p></div></div>
  </section>;

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy('profile'); setError(''); setMessage('');
    try {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 80) throw new Error('Enter a name between 1 and 80 characters.');
      const { error: updateError } = await getCloudClient().auth.updateUser({ data: { display_name: trimmed } });
      if (updateError) throw updateError;
      setMessage('Profile updated.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update profile.'); }
    finally { setBusy(null); }
  };

  const sendPasswordReset = async () => {
    if (!workspace.user.email) return;
    setBusy('reset'); setError(''); setMessage('');
    try {
      const redirect = new URL(window.location.pathname, window.location.origin).toString();
      const { error: resetError } = await getCloudClient().auth.resetPasswordForEmail(workspace.user.email, { redirectTo: redirect });
      if (resetError) throw resetError;
      setMessage('Password reset link sent. Check your inbox.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send reset link.'); }
    finally { setBusy(null); }
  };

  const signOut = async () => {
    setBusy('sign-out'); setError(''); setMessage('');
    try { await workspace.signOut(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign out.'); setBusy(null); }
  };

  const initials = (name.trim() || workspace.user.email || '?').slice(0, 1).toUpperCase();
  return <section className="ai-settings-section profile-settings" aria-labelledby="profile-title">
    <h2 id="profile-title">Profile</h2>
    <div className="profile-identity"><span className="profile-avatar" aria-hidden="true">{initials}</span><div><strong>{displayName || 'Your account'}</strong><span>{workspace.user.email}</span></div></div>
    <form onSubmit={saveProfile} className="profile-form">
      <label htmlFor="profile-name">Display name</label>
      <div className="profile-name-row"><input id="profile-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} autoComplete="name" required /><button className="primary-button" type="submit" disabled={busy !== null || !name.trim() || name.trim() === displayName}><Check size={15} /> Save</button></div>
    </form>
    <div className="profile-detail"><span>Email</span><strong>{workspace.user.email}</strong></div>
    <div className="profile-detail"><span>Organisation</span><strong>{workspace.organisation.name} · {workspace.organisation.role}</strong></div>
    <div className="profile-actions">
      <button type="button" onClick={sendPasswordReset} disabled={busy !== null || !workspace.user.email}>{busy === 'reset' ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />} Reset password</button>
      <button type="button" className="profile-sign-out" onClick={signOut} disabled={busy !== null}>{busy === 'sign-out' ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />} Sign out</button>
    </div>
    {message && <p role="status" className="profile-message">{message}</p>}
    {error && <p role="alert" className="profile-error">{error}</p>}
  </section>;
}
