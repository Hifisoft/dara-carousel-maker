'use client';

import { useRef, useState } from 'react';
import { Building2, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCarouselStore } from '../store/useCarouselStore';
import { useWorkspace } from './WorkspaceGate';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this logo.'));
    reader.onerror = () => reject(new Error('Could not read this logo.'));
    reader.readAsDataURL(file);
  });
}

export function BrandProfilesPanel() {
  const profiles = useCarouselStore(state => state.brandProfiles);
  const createProfile = useCarouselStore(state => state.createBrandProfile);
  const updateProfile = useCarouselStore(state => state.updateBrandProfile);
  const deleteProfile = useCarouselStore(state => state.deleteBrandProfile);
  const workspace = useWorkspace();
  const [name, setName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusyId('new'); setMessage('');
    try {
      await createProfile(name, workspace?.user.id || 'local');
      setName(''); setMessage('Brand profile created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create brand profile.'); }
    finally { setBusyId(null); }
  };

  const updateName = async (id: string, nextName: string) => {
    if (!nextName.trim()) return;
    const profile = profiles.find(item => item.id === id);
    if (!profile || profile.name === nextName.trim()) return;
    try { await updateProfile(id, { name: nextName.trim() }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not rename brand profile.'); }
  };

  const uploadLogo = async (id: string, file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setMessage('Choose a PNG, JPEG, or WebP logo under 8 MB.');
      return;
    }
    setBusyId(id); setMessage('');
    try {
      const url = await readAsDataUrl(file);
      const profile = profiles.find(item => item.id === id);
      if (!profile) throw new Error('Brand profile not found.');
      await updateProfile(id, { assets: { ...profile.assets, logoPrimary: {
        id: crypto.randomUUID(), role: 'logoPrimary', url, fileName: file.name,
        mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/webp',
      } } });
      setMessage(`Primary logo saved for ${profile.name}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this logo.'); }
    finally { setBusyId(null); }
  };

  const remove = async (id: string) => {
    const profile = profiles.find(item => item.id === id);
    if (!profile || !window.confirm(`Delete the ${profile.name} brand profile? Carousel designs and logo layers will be kept.`)) return;
    setBusyId(id); setMessage('');
    try { await deleteProfile(id); setMessage(`${profile.name} deleted.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete brand profile.'); }
    finally { setBusyId(null); }
  };

  return <section className="brand-profiles-panel" aria-labelledby="brand-profiles-title">
    <div className="brand-profiles-heading"><div><Building2 size={17} /><h2 id="brand-profiles-title">Brand Profiles</h2></div><span>{profiles.length}</span></div>
    <form className="brand-profile-create" onSubmit={create}>
      <input aria-label="Brand name" value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder="New brand name" />
      <button className="primary-button" type="submit" disabled={!name.trim() || busyId === 'new'}>{busyId === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Create</button>
    </form>
    {profiles.length === 0 ? <p className="brand-profiles-empty">Add a brand name and primary logo to use it in previews and batch exports.</p> :
      <div className="brand-profile-list">{profiles.map(profile => <article className="brand-profile-row" key={profile.id}>
        <div className="brand-profile-preview">{profile.assets.logoPrimary?.url ? <img src={profile.assets.logoPrimary.url} alt="" /> : <ImagePlus size={17} />}</div>
        <div className="brand-profile-fields">
          <input aria-label={`${profile.name} brand name`} defaultValue={profile.name} maxLength={80}
            onBlur={event => { void updateName(profile.id, event.target.value); }}
            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
          <span>{profile.assets.logoPrimary ? profile.assets.logoPrimary.fileName : 'Missing primary logo'}</span>
        </div>
        <input ref={element => { fileRefs.current[profile.id] = element; }} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp"
          onChange={event => { void uploadLogo(profile.id, event.target.files?.[0]); event.target.value = ''; }} />
        <button type="button" className="brand-profile-icon" title={profile.assets.logoPrimary ? 'Replace primary logo' : 'Upload primary logo'} aria-label={`${profile.assets.logoPrimary ? 'Replace' : 'Upload'} ${profile.name} primary logo`}
          disabled={busyId === profile.id} onClick={() => fileRefs.current[profile.id]?.click()}>
          {busyId === profile.id ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        </button>
        <button type="button" className="brand-profile-icon is-danger" title="Delete brand profile" aria-label={`Delete ${profile.name} brand profile`} disabled={busyId === profile.id} onClick={() => void remove(profile.id)}><Trash2 size={15} /></button>
      </article>)}</div>}
    {message && <p role="status" className="brand-profile-message">{message}</p>}
  </section>;
}
