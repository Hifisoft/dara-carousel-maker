export const TEXT_MODELS = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-flash-latest', label: 'Gemini Flash (latest)' },
] as const;

export const IMAGE_MODELS = [
  { id: 'flux', label: 'Flux' },
  { id: 'turbo', label: 'Turbo' },
] as const;

export const DEFAULT_AI_ROUTING = {
  copy: TEXT_MODELS[0].id,
  prompt: TEXT_MODELS[0].id,
  image: IMAGE_MODELS[0].id,
};

export const isTextModel = (value: unknown): value is string =>
  typeof value === 'string' && TEXT_MODELS.some(model => model.id === value);

export const isImageModel = (value: unknown): value is string =>
  typeof value === 'string' && IMAGE_MODELS.some(model => model.id === value);
