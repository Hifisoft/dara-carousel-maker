'use client';

import { useEffect, useState } from 'react';
import { Check, FileText, Upload } from 'lucide-react';
import { useCarouselStore } from '../store/useCarouselStore';
import { IMAGE_MODELS, TEXT_MODELS } from '../lib/aiModels';

export function AISettingsPanel() {
  const settings = useCarouselStore(state => state.settings);
  const updateAISettings = useCarouselStore(state => state.updateAISettings);
  const [routing, setRouting] = useState(settings.routing);
  const [instructions, setInstructions] = useState(settings.instructions);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setRouting(settings.routing);
    setInstructions(settings.instructions);
  }, [settings.routing, settings.instructions]);

  const importInstructions = async (file: File, task: 'copy' | 'image') => {
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
          <h1>AI settings</h1>
          <p>Choose the models that actually handle each task. Instructions stay on this device until sent with a generation request.</p>
        </header>

        <section className="ai-settings-section" aria-labelledby="model-routing-title">
          <h2 id="model-routing-title">Task routing</h2>
          <div className="ai-routing-list">
            {([
              { key: 'copy', label: 'Carousel copy', detail: 'Research, outline, and slide text', options: TEXT_MODELS },
              { key: 'prompt', label: 'Visual direction', detail: 'Turn slide text into an image prompt', options: TEXT_MODELS },
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
          <p className="ai-settings-note">Copy and visual direction require <code>GEMINI_API_KEY</code> on the server. Image generation uses Pollinations; availability depends on its service.</p>
        </section>

        <section className="ai-settings-section" aria-labelledby="instructions-title">
          <h2 id="instructions-title">Master instructions</h2>
          <p className="ai-settings-note">Paste a prompt or load a SKILL.md file for each task. These instructions are added to the model request, not executed as code.</p>
          {(['copy', 'image'] as const).map(task => (
            <div className="ai-instruction-group" key={task}>
              <div className="ai-instruction-heading">
                <label htmlFor={`${task}-instructions`}>{task === 'copy' ? 'Copy and research' : 'Visuals and image generation'}</label>
                <label className="ai-file-button">
                  <Upload size={14} /> Import .md
                  <input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) void importInstructions(file, task);
                    event.target.value = '';
                  }} />
                </label>
              </div>
              <textarea id={`${task}-instructions`} rows={6} maxLength={20000} value={instructions[task]} onChange={event => setInstructions(current => ({ ...current, [task]: event.target.value }))} placeholder={task === 'copy' ? 'Voice, research standards, formatting, facts to prioritize...' : 'Visual style, composition, lighting, exclusions...'} />
              <span className="ai-instruction-count"><FileText size={12} /> {instructions[task].length.toLocaleString()} / 20,000</span>
            </div>
          ))}
        </section>

        <div className="ai-settings-footer">
          <span role="status">{message}</span>
          <button className="primary-button" onClick={() => {
            try {
              updateAISettings(routing, instructions);
              setMessage('Settings saved on this device.');
            } catch {
              setMessage('Could not save settings. Check available browser storage.');
            }
          }}><Check size={15} /> Save settings</button>
        </div>
      </div>
    </main>
  );
}
