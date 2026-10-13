import { uniqueWebSources, type WebSource } from './webSources';

type JsonSchema = { name: string; schema: Record<string, unknown> };

export async function requestLunaText(input: string, instructions: string, options: { maxOutputTokens?: number; jsonSchema?: JsonSchema } = {}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Configure OPENAI_API_KEY on the server to use GPT-6 Luna.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(50000),
    body: JSON.stringify({
      model: 'gpt-6-luna',
      instructions,
      input,
      reasoning: { effort: 'low' },
      max_output_tokens: options.maxOutputTokens || 4000,
      store: false,
      ...(options.jsonSchema ? { text: { format: { type: 'json_schema', strict: true, ...options.jsonSchema } } } : {}),
    }),
  });
  if (!response.ok) throw new Error(`GPT-6 Luna returned ${response.status}. Check the key and model access.`);
  const result = await response.json();
  const output = (result?.output || []).filter((item: { type?: string }) => item.type === 'message')
    .flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || [])
    .filter((part: { type?: string; text?: string }) => part.type === 'output_text' && typeof part.text === 'string')
    .map((part: { text: string }) => part.text).join('\n').trim();
  if (!output) throw new Error('GPT-6 Luna returned no text. Please retry.');
  return output;
}

/** Uses the Responses API web_search tool and preserves its source citations for the UI. */
export async function requestLunaResearch(input: string, instructions: string, options: { maxOutputTokens?: number; jsonSchema?: JsonSchema } = {}): Promise<{ text: string; sources: WebSource[]; searched: boolean }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Configure OPENAI_API_KEY on the server to use GPT-6 Luna.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(50000),
    body: JSON.stringify({
      model: 'gpt-6-luna', instructions, input,
      tools: [{ type: 'web_search', search_context_size: 'high' }],
      reasoning: { effort: 'low' }, max_output_tokens: options.maxOutputTokens || 5000,
      store: false,
      ...(options.jsonSchema ? { text: { format: { type: 'json_schema', strict: true, ...options.jsonSchema } } } : {}),
    }),
  });
  if (!response.ok) throw new Error(`GPT-6 Luna web research returned ${response.status}. Check the key, model access, and search availability.`);
  const result = await response.json();
  const output = Array.isArray(result?.output) ? result.output : [];
  const textParts: string[] = [];
  const rawSources: WebSource[] = [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part.text === 'string') textParts.push(part.text);
      for (const annotation of Array.isArray(part?.annotations) ? part.annotations : []) {
        const citation = annotation?.url_citation;
        if (annotation?.type === 'url_citation' && typeof citation?.url === 'string') {
          rawSources.push({ url: citation.url, title: typeof citation.title === 'string' ? citation.title : citation.url });
        }
      }
    }
  }
  const text = textParts.join('\n').trim();
  if (!text) throw new Error('GPT-6 Luna returned no research-backed text. Please retry.');
  return { text, sources: uniqueWebSources(rawSources), searched: output.some((item: any) => item?.type === 'web_search_call') };
}
