'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { authorisedFetch, cloudEnabled, getCloudClient } from '../../lib/cloud';
import { Activity, ArrowLeft, Building2, Coins, Cpu, Flag, Gauge, LayoutDashboard, ScrollText, Search, Shield, Users, Wrench } from 'lucide-react';

const sections = [
  ['overview','Overview',LayoutDashboard], ['users','Users',Users], ['organisations','Organisations',Building2],
  ['plans','Plans',Gauge], ['subscriptions','Subscriptions',ScrollText], ['credits','Credits',Coins],
  ['usage','AI Usage',Cpu], ['routes','AI Control',Wrench], ['costs','AI Cost Config',Coins], ['flags','Feature Flags',Flag],
  ['skills','Global Skills',ScrollText], ['logs','Generation Logs',Activity], ['audit','Audit Log',Shield], ['admins','Admin Users',Users],
] as const;
type Section = typeof sections[number][0];

export default function AdminPage() {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<any>({});
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [tokenReady, setTokenReady] = useState(!cloudEnabled);

  useEffect(() => {
    if (!cloudEnabled) return;
    getCloudClient().auth.getSession().then(({ data: result }) => setTokenReady(Boolean(result.session)));
  }, []);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const response = await authorisedFetch(`/api/admin?section=${section}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load admin data.');
      setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load admin data.'); }
    finally { setBusy(false); }
  }, [section, q]);
  useEffect(() => { if (tokenReady) void load(); }, [load, tokenReady]);

  const mutate = async (payload: Record<string, unknown>) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await authorisedFetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Change failed.');
      setNotice('Saved and recorded in the audit log.'); setReason(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Change failed.'); }
    finally { setBusy(false); }
  };

  return <main className="admin-shell">
    <aside className="admin-sidebar"><Link href="/" className="admin-brand"><span className="admin-brand-mark">D</span><span><b>DARA</b><small>ADMIN</small></span></Link><div className="admin-nav-label">CONTROL PLANE</div>
      {sections.map(([key,label,Icon]) => <button key={key} className={`admin-nav-item ${section === key ? 'active' : ''}`} onClick={() => { setSection(key); setQ(''); }}><Icon size={16}/>{label}</button>)}
      <Link href="/" className="admin-back"><ArrowLeft size={15}/> Back to Studio</Link>
    </aside>
    <section className="admin-content"><header className="admin-topbar"><div><div className="admin-eyebrow">DARA STUDIO / ADMIN</div><h1>{sections.find(item => item[0] === section)?.[1]}</h1></div><div className="admin-secure"><Shield size={15}/> Restricted access</div></header>
      <div className="admin-toolbar">{['users','organisations','logs','usage','credits','audit'].includes(section) && <label className="admin-search"><Search size={16}/><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && void load()} placeholder="Search records"/><button onClick={() => void load()}>Search</button></label>}<button className="admin-refresh" onClick={() => void load()} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button></div>
      {error && <div className="admin-alert" role="alert">{error}</div>}{notice && <div className="admin-notice" role="status">{notice}</div>}
      {section === 'overview' && <Overview data={data}/>}
      {section === 'users' && <UsersTable users={data.users || []} mutate={mutate}/>}
      {section === 'organisations' && <OrganisationsTable rows={data.organisations || []}/>}
      {section === 'plans' && <Plans rows={data.plans || []} mutate={mutate}/>}
      {section === 'subscriptions' && <DataTable rows={data.subscriptions || []} columns={['organisation_id','plan_id','status','provider','current_period_end','created_at']} empty="No subscription records. Billing is not connected."/>}
      {section === 'credits' && <Credits rows={data.credit_ledger || []} mutate={mutate} reason={reason} setReason={setReason}/>}
      {section === 'usage' && <DataTable rows={data.usage || []} columns={['created_at','task_type','provider','model','status','latency_ms','credits_charged','estimated_provider_cost','error_summary']} empty="No AI usage telemetry recorded yet."/>}
      {section === 'routes' && <Routes rows={data.routes || []} mutate={mutate}/>}
      {section === 'costs' && <Costs rows={data.costs || []} mutate={mutate}/>}
      {section === 'flags' && <Flags rows={data.flags || []} mutate={mutate}/>}
      {section === 'skills' && <Skills rows={data.skills || []} mutate={mutate}/>}
      {section === 'logs' && <DataTable rows={data.logs || []} columns={['created_at','category','task_type','status','user_id','organisation_id','error_summary']} empty="No operational events recorded."/>}
      {section === 'audit' && <DataTable rows={data.audit || []} columns={['created_at','action','admin_user_id','target_type','target_id','reason','metadata']} empty="No admin changes recorded."/>}
      {section === 'admins' && <DataTable rows={data.admins || []} columns={['user_id','role','granted_by','granted_at']} empty="No admin roles configured. Bootstrap the first super admin in Supabase as described below."/>}
      {section === 'admins' && <p className="admin-footnote">First super admin setup is deliberately database-controlled. After applying the migration, insert the authenticated user ID into <code>admin_roles</code> with role <code>super_admin</code>. No browser action can grant admin access.</p>}
    </section>
  </main>;
}

function Overview({data}: {data:any}) {
  const events = data.aiUsage30d || []; const succeeded = events.filter((e:any)=>e.status==='succeeded');
  const cost = succeeded.reduce((sum:number,e:any)=>sum+Number(e.estimated_provider_cost || 0),0);
  const metrics = [['Users',data.users ?? '—'],['Organisations',data.organisations ?? 0],['AI operations · 30d',events.length],['Estimated AI spend · 30d',`$${cost.toFixed(4)}`],['Plans',data.plans ?? 0],['Subscriptions',data.subscriptions ?? 0]];
  return <><div className="admin-metrics">{metrics.map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div><div className="admin-callout"><b>Revenue and active-user figures unavailable</b><span>Billing is not integrated. No revenue or subscription metrics are estimated or fabricated.</span></div><div className="admin-two-col"><DataTable rows={data.recentAudit || []} columns={['created_at','action','target_type','target_id']} title="Recent admin changes" empty="No changes yet."/><DataTable rows={data.recentFailures || []} columns={['created_at','category','task_type','status','error_summary']} title="Recent operational events" empty="No events recorded."/></div></>;
}
function DataTable({rows,columns,title,empty}: {rows:any[];columns:string[];title?:string;empty:string}) {
  return <div className="admin-panel">{title && <h2>{title}</h2>}{!rows.length ? <p className="admin-empty">{empty}</p> : <div className="admin-table-scroll"><table><thead><tr>{columns.map(c=><th key={c}>{c.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id ?? row.user_id ?? row.flag_key ?? `${i}`}>{columns.map(c=><td key={c}>{format(row[c])}</td>)}</tr>)}</tbody></table></div>}</div>;
}
const format=(value:any)=>value==null?'—':typeof value==='object'?JSON.stringify(value):String(value);
function UsersTable({users,mutate}:{users:any[];mutate:(v:any)=>Promise<void>}) {
  // Keep unexpected/null rows from breaking the whole client-rendered admin page.
  const rows = Array.isArray(users) ? users.filter(user => user && typeof user === 'object') : [];
  return <div className="admin-panel"><div className="admin-table-scroll"><table>
    <thead><tr>{['email','id','created_at','last_sign_in_at','organisations','usage','ai_failures','banned_until'].map(c=><th key={c}>{c.replaceAll('_',' ')}</th>)}<th>Actions</th></tr></thead>
    <tbody>{rows.map((user:any,index:number)=>{
      const id = typeof user.id === 'string' ? user.id : '';
      const memberships = Array.isArray(user.organisations) ? user.organisations.filter((membership:any)=>membership && typeof membership==='object') : [];
      const email = typeof user.email === 'string' ? user.email : '—';
      const createdAt = typeof user.created_at === 'string' ? user.created_at : '—';
      const lastSignIn = typeof user.last_sign_in_at === 'string' ? user.last_sign_in_at : '—';
      const bannedUntil = typeof user.banned_until === 'string' && user.banned_until ? user.banned_until : null;
      return <tr key={id || `user-${index}`}>
        <td>{email}</td><td className="admin-mono">{id || '—'}</td><td>{createdAt}</td><td>{lastSignIn}</td>
        <td>{memberships.map((membership:any,memberIndex:number)=>{
          const organisation = membership.organisation && typeof membership.organisation === 'object' ? membership.organisation : null;
          const organisationName = typeof organisation?.name === 'string' ? organisation.name : (typeof membership.organisation_id === 'string' ? membership.organisation_id : 'Organisation');
          const role = typeof membership.role === 'string' ? membership.role : 'member';
          return <div key={typeof membership.organisation_id === 'string' ? membership.organisation_id : `membership-${memberIndex}`}>{organisationName} · {role}</div>;
        })}</td>
        <td>{Number.isFinite(Number(user.usage)) ? Number(user.usage) : '—'}</td><td>{Number.isFinite(Number(user.ai_failures)) ? Number(user.ai_failures) : '—'}</td><td>{bannedUntil || 'Active'}</td>
        <td><div className="admin-row-actions"><button disabled={!id} onClick={()=>void mutate({action:'set_account_status',userId:id,mode:bannedUntil?'restore':'suspend'})}>{bannedUntil?'Restore':'Suspend'}</button></div></td>
      </tr>;
    })}</tbody>
  </table>{!rows.length&&<p className="admin-empty">No users match this search.</p>}</div></div>;
}
function OrganisationsTable({rows}:{rows:any[]}) {return <DataTable rows={rows} columns={['name','id','owner_id','created_at','organisation_members']} empty="No organisations found."/>;}
function Plans({rows,mutate}:{rows:any[];mutate:(v:any)=>Promise<void>}) {const [selected,setSelected]=useState<any>(null);const [raw,setRaw]=useState('');return <div className="admin-two-col"><DataTable rows={rows} columns={['id','name','status','monthly_price','annual_price','entitlements']} empty="No plans."/><div className="admin-panel"><h2>Edit plan entitlements</h2><select value={selected?.id||''} onChange={e=>{const plan=rows.find((p:any)=>p.id===e.target.value);setSelected(plan);setRaw(JSON.stringify(plan?.entitlements||{},null,2));}}><option value="">Select plan</option>{rows.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{selected&&<><label>Name<input value={selected.name} onChange={e=>setSelected({...selected,name:e.target.value})}/></label><label>Monthly price<input type="number" min="0" value={selected.monthly_price??''} onChange={e=>setSelected({...selected,monthly_price:e.target.value})}/></label><label>Entitlements JSON<textarea rows={10} value={raw} onChange={e=>setRaw(e.target.value)}/></label><button onClick={()=>{try{void mutate({action:'save_plan',id:selected.id,name:selected.name,status:selected.status,monthlyPrice:selected.monthly_price?Number(selected.monthly_price):null,annualPrice:selected.annual_price?Number(selected.annual_price):null,entitlements:JSON.parse(raw)});}catch{alert('Entitlements must be valid JSON.');}}}>Save plan</button></>}</div></div>;}
function Credits({rows,mutate,reason,setReason}:{rows:any[];mutate:(v:any)=>Promise<void>;reason:string;setReason:(v:string)=>void}) {const [org,setOrg]=useState('');const [user,setUser]=useState('');const [amount,setAmount]=useState(100);return <div className="admin-two-col"><div className="admin-panel"><h2>Grant credits</h2><p>Credit grants are recorded together with an audit event.</p><label>Organisation ID<input value={org} onChange={e=>setOrg(e.target.value)} /></label><label>Optional user ID<input value={user} onChange={e=>setUser(e.target.value)} /></label><label>Amount<input type="number" min="1" max="100000" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label><label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Support compensation"/></label><button onClick={()=>void mutate({action:'grant_credits',organisationId:org,userId:user||null,amount})}>Grant credits</button></div><DataTable rows={rows} columns={['created_at','organisation_id','user_id','amount','entry_type','operation','reason']} empty="No credit ledger entries."/></div>;}
function Flags({rows,mutate}:{rows:any[];mutate:(v:any)=>Promise<void>}) {return <div className="admin-panel"><div className="admin-table-scroll"><table><thead><tr><th>Flag</th><th>Description</th><th>State</th></tr></thead><tbody>{rows.map((f:any)=><tr key={f.flag_key}><td><b>{f.name}</b><small className="admin-subtext">{f.flag_key}</small></td><td>{f.description}</td><td><button className={`admin-toggle ${f.enabled?'on':''}`} onClick={()=>void mutate({action:'set_flag',key:f.flag_key,enabled:!f.enabled})}>{f.enabled?'Enabled':'Disabled'}</button></td></tr>)}</tbody></table></div></div>;}
function Routes({rows,mutate}:{rows:any[];mutate:(v:any)=>Promise<void>}) {return <div className="admin-panel"><div className="admin-table-scroll"><table><thead><tr><th>Task</th><th>Primary model</th><th>Fallback</th><th>Enabled</th><th/></tr></thead><tbody>{rows.map((r:any)=><RouteRow key={r.task_key} route={r} save={mutate}/>)}</tbody></table></div></div>;}
function Costs({rows,mutate}:{rows:any[];mutate:(v:any)=>Promise<void>}) {const [taskKey,setTask]=useState('copy');const [provider,setProvider]=useState('google');const [model,setModel]=useState('gemini-3.6-flash');const [cost,setCost]=useState('');const [version,setVersion]=useState('');return <div className="admin-two-col"><div className="admin-panel"><h2>Add cost estimate</h2><p>Effective-dated estimates support historical cost reporting; they are not customer prices.</p><label>Task<input value={taskKey} onChange={e=>setTask(e.target.value)}/></label><label>Provider<input value={provider} onChange={e=>setProvider(e.target.value)}/></label><label>Model<input value={model} onChange={e=>setModel(e.target.value)}/></label><label>USD per operation<input type="number" min="0" step="0.000001" value={cost} onChange={e=>setCost(e.target.value)}/></label><label>Pricing version<input value={version} onChange={e=>setVersion(e.target.value)} placeholder="e.g. 2026-10"/></label><button onClick={()=>void mutate({action:'save_cost',taskKey,provider,model,costPerOperation:Number(cost),pricingVersion:version})}>Save cost version</button></div><DataTable rows={rows} columns={['effective_from','task_key','provider','model','cost_per_operation','currency','pricing_version']} empty="No provider cost estimates configured."/></div>;}
function RouteRow({route,save}:{route:any;save:(v:any)=>Promise<void>}) {const [row,setRow]=useState(route);return <tr><td>{row.task_key}</td><td><input value={row.primary_model} onChange={e=>setRow({...row,primary_model:e.target.value})}/></td><td><input value={row.fallback_model||''} onChange={e=>setRow({...row,fallback_model:e.target.value})}/></td><td><input type="checkbox" checked={row.enabled} onChange={e=>setRow({...row,enabled:e.target.checked})}/></td><td><button onClick={()=>void save({action:'set_route',key:row.task_key,primaryModel:row.primary_model,fallbackModel:row.fallback_model,enabled:row.enabled})}>Save</button></td></tr>;}
function Skills({rows,mutate}:{rows:any[];mutate:(v:any)=>Promise<void>}) {const [selected,setSelected]=useState<any>(null);const [content,setContent]=useState('');return <div className="admin-two-col"><div className="admin-panel"><h2>Platform skills</h2>{rows.map((s:any)=><button className={`admin-skill-item ${selected?.id===s.id?'active':''}`} key={s.id} onClick={()=>{setSelected(s);const draft=(s.global_skill_versions||[]).find((v:any)=>v.status==='draft');const published=(s.global_skill_versions||[]).find((v:any)=>v.version===s.current_published_version);setContent(draft?.content||published?.content||'');}}>{s.name}<small>{s.current_published_version?`Published v${s.current_published_version}`:'No published version'}</small></button>)}</div><div className="admin-panel"><h2>{selected?.name||'Select a skill'}</h2>{selected&&<><p>Drafts do not enter production until published.</p><textarea className="admin-skill-editor" maxLength={20000} value={content} onChange={e=>setContent(e.target.value)}/><button onClick={()=>void mutate({action:'save_skill_draft',skillId:selected.id,content})}>Save draft</button><div className="admin-version-list">{(selected.global_skill_versions||[]).map((v:any)=><div key={v.id}>v{v.version} · {v.status} · {new Date(v.created_at).toLocaleDateString()} {v.status!=='published'&&<button onClick={()=>void mutate({action:'publish_skill',skillId:selected.id,version:v.version})}>Publish / roll back to this version</button>}</div>)}</div></>}</div></div>;}
