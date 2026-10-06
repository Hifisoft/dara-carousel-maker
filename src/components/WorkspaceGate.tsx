'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowRight, Building2, Check, ChevronDown, Loader2, LogOut, Mail, Plus, RefreshCw, Users, X } from 'lucide-react';
import { authorisedFetch, cloudEnabled, getCloudClient, setCloudWorkspace } from '../lib/cloud';
import { getLocalDocuments, saveDocumentToIDB } from '../lib/idb';
import { useCarouselStore } from '../store/useCarouselStore';

type Organisation = { id: string; name: string; role: 'owner' | 'member' };
type Member = { user_id: string; email: string; role: string };
type WorkspaceContextValue = {
  organisation: Organisation;
  organisations: Organisation[];
  user: User;
  switchOrganisation: (id: string) => void;
  refreshOrganisations: () => Promise<void>;
  signOut: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const resetWorkspace = useCarouselStore(state => state.resetWorkspace);
  const loadDocuments = useCarouselStore(state => state.loadDocumentsFromStorage);
  const loadTemplates = useCarouselStore(state => state.loadTemplatesFromStorage);
  const loadBrandProfiles = useCarouselStore(state => state.loadBrandProfilesFromStorage);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(cloudEnabled);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up' | 'reset' | 'email-link'>('sign-in');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [name, setName] = useState('');
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [readyOrganisationId, setReadyOrganisationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remoteChange, setRemoteChange] = useState(false);
  const acceptedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!cloudEnabled) return;
    const supabase = getCloudClient();
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshOrganisations = useCallback(async () => {
    if (!user) return;
    const supabase = getCloudClient();
    const [{ data: memberships, error: memberError }, { data: orgs, error: orgError }] = await Promise.all([
      supabase.from('organisation_members').select('organisation_id, role').eq('user_id', user.id),
      supabase.from('organisations').select('id, name')
    ]);
    if (memberError || orgError) throw memberError || orgError;
    const roles = new Map((memberships || []).map(row => [row.organisation_id, row.role]));
    const list = (orgs || []).filter(org => roles.has(org.id)).map(org => ({
      id: org.id, name: org.name, role: roles.get(org.id) as Organisation['role']
    }));
    setOrganisations(list);
    setOrganisationId(previous => {
      const preferred = previous || localStorage.getItem(`dara-org:${user.id}`);
      return list.find(org => org.id === preferred)?.id || list[0]?.id || null;
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setOrganisations([]);
      setOrganisationId(null);
      setReadyOrganisationId(null);
      setCloudWorkspace(null);
      return;
    }
    refreshOrganisations().catch(err => setError(err.message || 'Could not load organisations.'));
  }, [user?.id, refreshOrganisations]);

  useEffect(() => {
    if (!user || !organisationId) return;
    setCloudWorkspace(organisationId, user.id);
    localStorage.setItem(`dara-org:${user.id}`, organisationId);
    resetWorkspace();
    Promise.all([loadDocuments(), loadTemplates(), loadBrandProfiles()])
      .catch(err => setError(err.message || 'Could not load workspace.'))
      .finally(() => setReadyOrganisationId(organisationId));
    setRemoteChange(false);
    const supabase = getCloudClient();
    const channel = supabase.channel(`workspace-${organisationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_documents', filter: `organisation_id=eq.${organisationId}` }, payload => {
        const editedBy = (payload.new as { last_editor?: string })?.last_editor;
        if (editedBy === user.id) return;
        if (useCarouselStore.getState().currentView === 'editor') setRemoteChange(true);
        else void loadDocuments().catch(err => setError(err.message || 'Could not refresh workspace.'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_templates', filter: `organisation_id=eq.${organisationId}` }, payload => {
        const editedBy = (payload.new as { last_editor?: string })?.last_editor;
        if (editedBy !== user.id) void loadTemplates().catch(err => setError(err.message || 'Could not refresh templates.'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_profiles', filter: `organisation_id=eq.${organisationId}` }, payload => {
        const editedBy = (payload.new as { last_editor?: string })?.last_editor;
        if (editedBy !== user.id) void loadBrandProfiles().catch(err => setError(err.message || 'Could not refresh brand profiles.'));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, organisationId, resetWorkspace, loadDocuments, loadTemplates, loadBrandProfiles]);

  useEffect(() => {
    if (!user) return;
    const token = new URLSearchParams(window.location.search).get('invite');
    if (!token || acceptedToken.current === token) return;
    acceptedToken.current = token;
    authorisedFetch('/api/invites/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not accept invitation.');
      window.history.replaceState({}, '', window.location.pathname);
      await refreshOrganisations();
      setOrganisationId(data.organisationId);
    }).catch(err => setError(err.message));
  }, [user?.id, refreshOrganisations]);

  useEffect(() => {
    const onError = (event: Event) => setError((event as CustomEvent<string>).detail);
    window.addEventListener('dara-cloud-error', onError);
    window.addEventListener('dara-storage-error', onError);
    return () => {
      window.removeEventListener('dara-cloud-error', onError);
      window.removeEventListener('dara-storage-error', onError);
    };
  }, []);

  const switchAuthMode = (mode: typeof authMode) => {
    setAuthMode(mode); setError(''); setLinkSent(false); setPassword(''); setConfirmPassword('');
  };

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const supabase = getCloudClient();
      const normalizedEmail = email.trim().toLowerCase();
      const redirect = new URL(window.location.pathname + window.location.search, window.location.origin).toString();
      if (authMode === 'sign-up' && password !== confirmPassword) throw new Error('Passwords do not match.');
      if (authMode === 'sign-up' && password.length < 12) throw new Error('Use at least 12 characters for your password.');
      const result = authMode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : authMode === 'sign-up'
          ? await supabase.auth.signUp({ email: normalizedEmail, password, options: { emailRedirectTo: redirect } })
          : authMode === 'reset'
            ? await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: redirect })
            : await supabase.auth.signInWithOtp({ email: normalizedEmail, options: { emailRedirectTo: redirect, shouldCreateUser: false } });
      if (result.error) throw result.error;
      if (authMode !== 'sign-in') setLinkSent(true);
      setPassword(''); setConfirmPassword('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not continue. Please try again.'); }
    finally { setBusy(false); }
  };

  const finishPasswordRecovery = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (password.length < 12) throw new Error('Use at least 12 characters for your password.');
      if (password !== confirmPassword) throw new Error('Passwords do not match.');
      const { error: authError } = await getCloudClient().auth.updateUser({ password });
      if (authError) throw authError;
      setPassword(''); setConfirmPassword(''); setPasswordRecovery(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update password.'); }
    finally { setBusy(false); }
  };

  const createOrganisation = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await authorisedFetch('/api/organisations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create organisation.');
      await refreshOrganisations();
      setOrganisationId(data.organisation.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create organisation.'); }
    finally { setBusy(false); }
  };

  if (!cloudEnabled && process.env.NODE_ENV === 'production') return <main className="workspace-gate"><section className="account-panel"><div className="account-mark"><Building2 size={21} /> DARA Studio</div><h1>Workspace unavailable</h1><p>Account services are not configured for this deployment. Please contact the workspace administrator.</p></section></main>;
  if (!cloudEnabled) return <>{children}</>;
  if (loading) return <div className="workspace-gate"><Loader2 className="animate-spin" aria-label="Loading account" /></div>;
  if (passwordRecovery && user) return <main className="workspace-gate"><section className="account-panel">
    <div className="account-mark"><Building2 size={21} /> DARA Studio</div>
    <h1>Set a new password</h1>
    <p>Choose a new password for your account.</p>
    <form onSubmit={finishPasswordRecovery}>
      <label htmlFor="recovery-password">New password</label>
      <input id="recovery-password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} />
      <label htmlFor="recovery-confirm">Confirm new password</label>
      <input id="recovery-confirm" type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
      <button className="primary-button" disabled={busy} type="submit">{busy ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Save password</button>
    </form>
    {error && <p role="alert" className="account-error">{error}</p>}
  </section></main>;
  if (!user) return (
    <main className="workspace-gate">
      <section className="account-panel">
        <div className="account-mark"><Building2 size={21} /> DARA Studio</div>
        <h1>Sign in to your workspace</h1>
        <p>{authMode === 'sign-in' ? 'Sign in with your email and password.' : authMode === 'sign-up' ? 'Create your account to join or start a workspace.' : authMode === 'reset' ? 'We will email you a link to set a new password.' : 'We will email you a secure sign-in link.'}</p>
        {linkSent ? <div className="account-notice"><Mail size={18} /> Check your inbox for the next step.</div> : (
          <form onSubmit={submitAuth}>
            <label htmlFor="account-email">Email address</label>
            <input id="account-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" />
            {(authMode === 'sign-in' || authMode === 'sign-up') && <>
              <label htmlFor="account-password">Password</label>
              <input id="account-password" type="password" required minLength={authMode === 'sign-up' ? 12 : undefined} autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} />
            </>}
            {authMode === 'sign-up' && <>
              <label htmlFor="account-confirm">Confirm password</label>
              <input id="account-confirm" type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
            </>}
            <button className="primary-button" disabled={busy} type="submit">{busy ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}{authMode === 'sign-in' ? 'Sign in' : authMode === 'sign-up' ? 'Create account' : authMode === 'reset' ? 'Send reset link' : 'Send sign-in link'}</button>
          </form>
        )}
        <div className="account-options">
          {authMode !== 'sign-in' && <button onClick={() => switchAuthMode('sign-in')}>Sign in</button>}
          {authMode !== 'sign-up' && <button onClick={() => switchAuthMode('sign-up')}>Create account</button>}
          {authMode !== 'reset' && <button onClick={() => switchAuthMode('reset')}>Forgot password?</button>}
          {authMode !== 'email-link' && <button onClick={() => switchAuthMode('email-link')}>Email link</button>}
        </div>
        {error && <p role="alert" className="account-error">{error}</p>}
      </section>
    </main>
  );

  const active = organisations.find(org => org.id === organisationId);
  if (!active) return (
    <main className="workspace-gate">
      <section className="account-panel">
        <div className="account-mark"><Building2 size={21} /> DARA Studio</div>
        <h1>Create an organisation</h1>
        <p>Your organisation is where you and your team share carousels and templates.</p>
        <form onSubmit={createOrganisation}>
          <label htmlFor="organisation-name">Organisation name</label>
          <input id="organisation-name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Your team or company" />
          <button className="primary-button" disabled={busy} type="submit">{busy ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />} Create organisation</button>
        </form>
        {error && <p role="alert" className="account-error">{error}</p>}
        <button className="account-link" onClick={() => getCloudClient().auth.signOut()}><LogOut size={14} /> Sign out</button>
      </section>
    </main>
  );

  if (readyOrganisationId !== organisationId) return <div className="workspace-gate"><Loader2 className="animate-spin" aria-label="Loading workspace" /></div>;

  return (
    <WorkspaceContext.Provider value={{
      organisation: active, organisations, user,
      switchOrganisation: setOrganisationId, refreshOrganisations,
      signOut: async () => { setCloudWorkspace(null); resetWorkspace(); await getCloudClient().auth.signOut(); }
    }}>
      {children}
      {remoteChange && <div className="workspace-update">A teammate updated this workspace. <button onClick={() => {
        resetWorkspace();
        Promise.all([loadDocuments(), loadTemplates()]).then(() => setRemoteChange(false)).catch(err => setError(err.message));
      }}><RefreshCw size={14} /> Reload shared work</button></div>}
      {error && <div className="workspace-error" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={15} /></button></div>}
    </WorkspaceContext.Provider>
  );
}

export function WorkspaceMenu() {
  const workspace = useWorkspace();
  const loadDocuments = useCarouselStore(state => state.loadDocumentsFromStorage);
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!workspace) return null;

  const loadMembers = async () => {
    const { data, error } = await getCloudClient().from('organisation_members')
      .select('user_id, email, role').eq('organisation_id', workspace.organisation.id).order('joined_at');
    if (error) setMessage(error.message);
    else setMembers(data || []);
  };
  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await authorisedFetch(`/api/organisations/${workspace.organisation.id}/invites`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send invite.');
      setMessage(`Invitation sent to ${inviteEmail}.`); setInviteEmail('');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not send invite.'); }
    finally { setBusy(false); }
  };
  const createAnother = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await authorisedFetch('/api/organisations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create organisation.');
      await workspace.refreshOrganisations(); workspace.switchOrganisation(data.organisation.id);
      setNewName(''); setOpen(false);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not create organisation.'); }
    finally { setBusy(false); }
  };
  const importLocal = async () => {
    setBusy(true); setMessage('');
    try {
      const local = await getLocalDocuments();
      if (!local.length) { setMessage('No local carousels found in this browser.'); return; }
      for (const doc of local) {
        const now = new Date().toISOString();
        await saveDocumentToIDB({ ...doc, id: crypto.randomUUID(), title: `${doc.title} (imported)`, createdAt: now, updatedAt: now });
      }
      await loadDocuments();
      setMessage(`Imported ${local.length} local carousel${local.length === 1 ? '' : 's'}.`);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Import failed.'); }
    finally { setBusy(false); }
  };
  const removeMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.email} from ${workspace.organisation.name}?`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await authorisedFetch(`/api/organisations/${workspace.organisation.id}/members/${member.user_id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not remove member.');
      await loadMembers();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not remove member.'); }
    finally { setBusy(false); }
  };

  return <div className="workspace-menu-wrap">
    <button className="workspace-trigger" onClick={() => { setOpen(!open); if (!open) void loadMembers(); }} aria-expanded={open} title="Organisation and members">
      <Building2 size={15} /><span>{workspace.organisation.name}</span><ChevronDown size={13} />
    </button>
    {open && <div className="workspace-menu">
      <div className="workspace-menu-heading">Organisations</div>
      {workspace.organisations.map(org => <button key={org.id} className="workspace-menu-option" onClick={() => { workspace.switchOrganisation(org.id); setOpen(false); }}>
        <span>{org.name}</span>{org.id === workspace.organisation.id && <Check size={15} />}
      </button>)}
      <form onSubmit={createAnother} className="workspace-inline-form">
        <input aria-label="New organisation name" required minLength={2} maxLength={80} placeholder="New organisation" value={newName} onChange={event => setNewName(event.target.value)} />
        <button disabled={busy} title="Create organisation" aria-label="Create organisation"><Plus size={16} /></button>
      </form>
      <div className="workspace-menu-heading"><Users size={14} /> Members</div>
      <div className="workspace-members">{members.map(member => <div key={member.user_id}><span>{member.email}</span><small>{member.role}</small>{workspace.organisation.role === 'owner' && member.role !== 'owner' && <button disabled={busy} title={`Remove ${member.email}`} aria-label={`Remove ${member.email}`} onClick={() => void removeMember(member)}><X size={13} /></button>}</div>)}</div>
      {workspace.organisation.role === 'owner' && <form onSubmit={sendInvite} className="workspace-inline-form">
        <input aria-label="Invite by email" required type="email" placeholder="Invite by email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} />
        <button disabled={busy} title="Send invitation" aria-label="Send invitation"><ArrowRight size={16} /></button>
      </form>}
      <button className="workspace-menu-action" disabled={busy} onClick={importLocal}><Plus size={14} /> Import local carousels</button>
      <button className="workspace-menu-action" onClick={() => { void workspace.signOut(); setOpen(false); }}><LogOut size={14} /> Sign out</button>
      {message && <p role="status" className="workspace-menu-message">{message}</p>}
    </div>}
  </div>;
}
