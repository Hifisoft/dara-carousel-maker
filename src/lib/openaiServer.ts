type JsonSchema = { name: string; schema: Record<string, unknown> };

export async function requestLunaText(input: string, instructions: string, options: { maxOutputTokens?: number; jsonSchema?: JsonSchema } = {}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Configure OPENAI_API_KEY on the server to use GPT-6 Luna.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60000),
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
