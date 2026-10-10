'use client';

import { useEffect, useState } from 'react';
import { Check, FileText, Upload, UserRound, Sparkles } from 'lucide-react';
import { useCarouselStore } from '../store/useCarouselStore';
import { COPY_MODELS, DIRECTION_MODELS, IMAGE_MODELS } from '../lib/aiModels';
import { DEFAULT_CREATIVE_DIRECTOR, DEFAULT_MASTER_INSTRUCTIONS } from '../lib/aiDefaults';
import { ProfileSettingsPanel } from './ProfileSettingsPanel';

const visualTasks = [
  { key: 'imageCover', label: 'Cover', placeholder: 'Focal subject, composition, and style for the opening slide...' },
  { key: 'imageContent', label: 'Content', placeholder: 'Visual direction for the main teaching slides...' },
  { key: 'imageCta', label: 'CTA', placeholder: 'Visual direction for the closing action slide...' },
] as const;
type VisualTask = typeof visualTasks[number]['key'];

export function AISettingsPanel() {
  const settings = useCarouselStore(state => state.settings);
  const updateAISettings = useCarouselStore(state => state.updateAISettings);
  const updateCreativeDirectorSettings = useCarouselStore(state => state.updateCreativeDirectorSettings);
  const [routing, setRouting] = useState(settings.routing);
  const [instructions, setInstructions] = useState(settings.instructions);
  const [creativeDirector, setCreativeDirector] = useState(settings.creativeDirector);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'profile'>('ai');
  const [visualTask, setVisualTask] = useState<VisualTask>('imageCover');

  useEffect(() => {
    setRouting(settings.routing);
    setInstructions(settings.instructions);
    setCreativeDirector(settings.creativeDirector);
  }, [settings.routing, settings.instructions, settings.creativeDirector]);

  const importInstructions = async (file: File, task: 'copy' | 'review' | VisualTask) => {
    if (!/\.(md|txt)$/i.test(file.name) || file.size > 20000) {
      setMessage('Choose a .md or .txt file under 20 KB.');
      return;
    }
    const content = (await file.text()).slice(0, 20000);
    setInstructions(current => ({ ...current, [task]: content }));
    setMessage(`${file.name} loaded. Save settings to apply it.`);
  };

  return (
    <main className="ai-settings-page flex-1 overflow-y-auto w-full">
      <div className="ai-settings-inner">
        <header className="ai-settings-heading">
          <h1>Settings</h1>
        </header>

        <div className="settings-tabs" role="tablist" aria-label="Settings views">
          <button type="button" role="tab" aria-selected={activeTab === 'ai'} onClick={() => setActiveTab('ai')}><Sparkles size={16} /> AI</button>
          <button type="button" role="tab" aria-selected={activeTab === 'profile'} onClick={() => setActiveTab('profile')}><UserRound size={16} /> Profile</button>
        </div>

        {activeTab === 'profile' ? <ProfileSettingsPanel /> : <>

        <section className="ai-settings-section" aria-labelledby="model-routing-title">
          <h2 id="model-routing-title">Task routing</h2>
          <div className="ai-routing-list">
            {([
              { key: 'copy', label: 'Carousel copy', detail: 'Research, outline, and slide text', options: COPY_MODELS },
              { key: 'review', label: 'Content review', detail: 'Critique facts, clarity, and engagement', options: COPY_MODELS },
              { key: 'prompt', label: 'Visual direction', detail: 'Turn slide text into an image prompt', options: DIRECTION_MODELS },
              { key: 'image', label: 'Image generation', detail: 'Create the final image asset', options: IMAGE_MODELS },
            ] as const).map(task => (
              <label className="ai-routing-row" key={task.key}>
                <span><strong>{task.label}</strong><small>{task.detail}</small></span>
                <select value={routing[task.key]} onChange={event => setRouting(current => ({ ...current, [task.key]: event.target.value }))}>
                  {task.options.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <p className="ai-settings-note">Server keys: <code>GEMINI_API_KEY</code> for Gemini, <code>OPENAI_API_KEY</code> for GPT-6 Luna and GPT Image, <code>DEEPSEEK_API_KEY</code> for DeepSeek, and <code>XAI_API_KEY</code> for Grok.</p>
          <p className="ai-settings-note">Gemini 3.5 Flash is text-only; Gemini image generation uses 3.1 Flash Image.</p>
          <p className="ai-settings-note">GPT-Image-1 and 1.5 are older models with announced API shutdown dates. Choose a newer image model later to keep generation working.</p>
        </section>

        <section className="ai-settings-section" aria-labelledby="instructions-title">
          <h2 id="instructions-title">Master instructions</h2>
          <p className="ai-settings-note">Paste a prompt or load a SKILL.md file for each task. These instructions are added to the model request, not executed as code.</p>
          {(['copy', 'review'] as const).map(task => (
            <div className="ai-instruction-group" key={task}>
              <div className="ai-instruction-heading">
                <label htmlFor={`${task}-instructions`}>{task === 'copy' ? 'Copy and research' : 'Content review'}</label>
                <label className="ai-file-button">
                  <Upload size={14} /> Import .md
                  <input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) void importInstructions(file, task);
                    event.target.value = '';
                  }} />
                </label>
              </div>
              <textarea id={`${task}-instructions`} rows={task === 'review' ? 12 : 6} maxLength={20000} value={instructions[task]} onChange={event => setInstructions(current => ({ ...current, [task]: event.target.value }))} placeholder={task === 'copy' ? 'Voice, research standards, formatting, facts to prioritize...' : 'How should the AI review each slide?'} />
              <span className="ai-instruction-count"><FileText size={12} /> {instructions[task].length.toLocaleString()} / 20,000</span>
              <button className="ai-reset-instructions" type="button" onClick={() => setInstructions(current => ({ ...current, [task]: DEFAULT_MASTER_INSTRUCTIONS[task] }))}>Restore platform default</button>
            </div>
          ))}
          <div className="ai-instruction-group">
            <div className="ai-instruction-heading"><span className="ai-visual-heading">Visuals and image generation</span></div>
            <div className="ai-visual-tabs" role="tablist" aria-label="Visual slide type">
              {visualTasks.map(task => <button key={task.key} type="button" role="tab" aria-selected={visualTask === task.key} onClick={() => setVisualTask(task.key)}>{task.label}</button>)}
            </div>
            <div className="ai-instruction-heading">
              <label htmlFor={`${visualTask}-instructions`}>{visualTasks.find(task => task.key === visualTask)?.label} slide master prompt</label>
              <label className="ai-file-button"><Upload size={14} /> Import .md
                <input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void importInstructions(file, visualTask);
                  event.target.value = '';
                }} />
              </label>
            </div>
            <textarea id={`${visualTask}-instructions`} rows={7} maxLength={20000} value={instructions[visualTask]} onChange={event => setInstructions(current => ({ ...current, [visualTask]: event.target.value }))} placeholder={visualTasks.find(task => task.key === visualTask)?.placeholder} />
            <span className="ai-instruction-count"><FileText size={12} /> {instructions[visualTask].length.toLocaleString()} / 20,000</span>
            <button className="ai-reset-instructions" type="button" onClick={() => setInstructions(current => ({ ...current, [visualTask]: DEFAULT_MASTER_INSTRUCTIONS[visualTask] }))}>Restore platform default</button>
          </div>
        </section>

        <section className="ai-settings-section" aria-labelledby="creative-director-title">
          <h2 id="creative-director-title">AI Creative Director guidelines</h2>
          <p className="ai-settings-note">These rules are added to image-generation instructions for the matching slide type.</p>
          <label className="ai-routing-row">
            <span><strong>Use Creative Director guidelines</strong><small>Apply global and slide-specific rules during image generation</small></span>
            <input type="checkbox" checked={creativeDirector.enabled} onChange={event => setCreativeDirector(current => ({ ...current, enabled: event.target.checked }))} />
          </label>
          {(['global', 'cover', 'content', 'cta'] as const).map(rule => (
            <div className="ai-instruction-group" key={rule}>
              <div className="ai-instruction-heading"><label htmlFor={`creative-${rule}`}>{rule === 'global' ? 'Global guidelines' : `${rule === 'cta' ? 'CTA' : rule} slide guidelines`}</label></div>
              <textarea id={`creative-${rule}`} rows={3} maxLength={20000} value={creativeDirector.rules[rule]} onChange={event => setCreativeDirector(current => ({ ...current, rules: { ...current.rules, [rule]: event.target.value } }))} />
              <button className="ai-reset-instructions" type="button" onClick={() => setCreativeDirector(current => ({ ...current, rules: { ...current.rules, [rule]: DEFAULT_CREATIVE_DIRECTOR.rules[rule] } }))}>Restore platform default</button>
            </div>
          ))}
        </section>

        <div className="ai-settings-footer">
          <span role="status">{message}</span>
          <button className="primary-button" onClick={() => {
            try {
              updateAISettings(routing, instructions);
              updateCreativeDirectorSettings(creativeDirector);
              setMessage('Settings saved on this device.');
            } catch {
              setMessage('Could not save settings. Check available browser storage.');
            }
          }}><Check size={15} /> Save settings</button>
        </div>
        </>}
      </div>
    </main>
  );
}
