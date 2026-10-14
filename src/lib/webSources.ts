export interface WebSource {
  title: string;
  url: string;
}

export function uniqueWebSources(sources: WebSource[]): WebSource[] {
  const unique = new Map<string, WebSource>();
  for (const source of sources) {
    if (typeof source?.url !== 'string' || typeof source.title !== 'string') continue;
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:') continue;
      unique.set(url.href, { title: source.title.trim().slice(0, 200) || url.hostname, url: url.href });
    } catch { /* Ignore malformed source URLs returned by a model provider. */ }
  }
  return [...unique.values()].slice(0, 20);
}

export function geminiGroundingSources(metadata: any): WebSource[] {
  const chunks = Array.isArray(metadata?.groundingChunks) ? metadata.groundingChunks : [];
  return uniqueWebSources(chunks.flatMap((chunk: any) => chunk?.web?.uri ? [{
    url: chunk.web.uri,
    title: typeof chunk.web.title === 'string' ? chunk.web.title : chunk.web.uri,
  }] : []));
}
