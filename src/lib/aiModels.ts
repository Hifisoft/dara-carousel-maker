export const COPY_MODELS = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
] as const;

export const DIRECTION_MODELS = [
  { id: 'openai:gpt-5.4-mini', label: 'ChatGPT (GPT-5.4 Mini)' },
  { id: 'deepseek:deepseek-flash', label: 'DeepSeek (Flash)' },
] as const;

export const IMAGE_MODELS = [
  { id: 'gemini:gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image' },
  { id: 'openai:gpt-image-2.5-flare', label: 'ChatGPT Image' },
  { id: 'xai:grok-imagine-image-2.0', label: 'Grok Image' },
] as const;

export const DEFAULT_AI_ROUTING = {
  copy: COPY_MODELS[0].id,
  prompt: DIRECTION_MODELS[0].id,
  image: IMAGE_MODELS[0].id,
};

export const isCopyModel = (value: unknown): value is string =>
  typeof value === 'string' && COPY_MODELS.some(model => model.id === value);

export const isDirectionModel = (value: unknown): value is string =>
  typeof value === 'string' && DIRECTION_MODELS.some(model => model.id === value);

export const isImageModel = (value: unknown): value is string =>
  typeof value === 'string' && IMAGE_MODELS.some(model => model.id === value);
