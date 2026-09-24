import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_AI_ROUTING, isDirectionModel, isImageModel } from '../../../../lib/aiModels';

export interface AIImageRequest {
  slideId?: string;
  topic?: string;
  slideTitle?: string;
  slideBody?: string;
  customPrompt?: string;
  style?: string;
  model?: string;
  promptModel?: string;
  instructions?: string;
}

function requireKey(name: 'GEMINI_API_KEY' | 'OPENAI_API_KEY' | 'DEEPSEEK_API_KEY' | 'XAI_API_KEY'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Configure ${name} on the server to use this model.`);
  return value;
}

async function visualDirection(body: AIImageRequest, model: string, instructions: string): Promise<string> {
  const system = `You are an art director for a social carousel. Write one vivid image-generation prompt. Describe the focal subject, composition, lighting and palette. Do not include lettering, logos or UI. Return only the prompt.\nMaster instructions: ${instructions}`;
  const user = `Topic: ${body.topic || 'General'}\nSlide title: ${body.slideTitle || ''}\nSlide body: ${body.slideBody || ''}\nStyle: ${body.style || 'Cinematic Photography'}\nUser visual direction: ${body.customPrompt || 'Develop a visual concept for this slide.'}`;
  const [provider, modelId] = model.split(':');
  const key = provider === 'openai' ? requireKey('OPENAI_API_KEY') : requireKey('DEEPSEEK_API_KEY');
  const endpoint = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...(provider === 'openai' ? { max_completion_tokens: 500 } : { max_tokens: 500 })
    })
  });
  if (!response.ok) throw new Error(`Visual direction model returned ${response.status}. Check its key and quota.`);
  const result = await response.json();
  const prompt = result?.choices?.[0]?.message?.content?.trim();
  if (!prompt) throw new Error('Visual direction model returned no prompt.');
  return prompt;
}

function imageDataUrl(base64: string): string {
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error('Generated image was empty or too large.');
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? 'image/jpeg'
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp'
    : null;
  if (!mime) throw new Error('Image provider returned an unsupported image format.');
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

async function generateImage(prompt: string, model: string): Promise<string> {
  if (model === 'gemini:gemini-3.1-flash-image') {
    const key = requireKey('GEMINI_API_KEY');
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], responseFormat: { image: { aspectRatio: '4:5', imageSize: '1K' } } }
      })
    });
    if (!response.ok) throw new Error(`Gemini image model returned ${response.status}. Check its key and quota.`);
    const result = await response.json();
    const image = result?.candidates?.[0]?.content?.parts?.find((part: { inlineData?: { data?: string } }) => part.inlineData?.data)?.inlineData?.data;
    if (!image) throw new Error('Gemini returned no image.');
    return imageDataUrl(image);
  }

  const isOpenAI = model === 'openai:gpt-image-2.5-flare';
  const key = isOpenAI ? requireKey('OPENAI_API_KEY') : requireKey('XAI_API_KEY');
  const response = await fetch(isOpenAI ? 'https://api.openai.com/v1/images/generations' : 'https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify(isOpenAI
      ? { model: 'gpt-image-2.5-flare', prompt, size: '1024x1280', output_format: 'png', n: 1 }
      : { model: 'grok-imagine-image-2.0', prompt, aspect_ratio: '3:4', response_format: 'b64_json', n: 1 })
  });
  if (!response.ok) throw new Error(`${isOpenAI ? 'ChatGPT Image' : 'Grok Image'} returned ${response.status}. Check its key and quota.`);
  const result = await response.json();
  const image = result?.data?.[0]?.b64_json;
  if (!image) throw new Error('Image provider returned no image.');
  return imageDataUrl(image);
}

export async function POST(request: NextRequest) {
  try {
    const body: AIImageRequest = await request.json();
    if (body.model !== undefined && !isImageModel(body.model)) return NextResponse.json({ error: 'Unsupported image model' }, { status: 400 });
    if (body.promptModel !== undefined && !isDirectionModel(body.promptModel)) return NextResponse.json({ error: 'Unsupported visual direction model' }, { status: 400 });
    const model = body.model || DEFAULT_AI_ROUTING.image;
    const promptModel = body.promptModel || DEFAULT_AI_ROUTING.prompt;
    const instructions = typeof body.instructions === 'string' ? body.instructions.slice(0, 20000) : '';
    const optimizedPrompt = await visualDirection(body, promptModel, instructions);
    const imageUrl = await generateImage(optimizedPrompt, model);
    return NextResponse.json({ success: true, imageUrl, optimizedPrompt, style: body.style || 'Cinematic Photography', model });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed.';
    console.error('[AI Image Route]', message);
    return NextResponse.json({ error: message }, { status: message.startsWith('Configure ') ? 503 : 502 });
  }
}
