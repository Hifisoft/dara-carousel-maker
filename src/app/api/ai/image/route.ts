import { NextRequest, NextResponse } from 'next/server';

export interface AIImageRequest {
  slideId?: string;
  layerId?: string;
  topic?: string;
  slideTitle?: string;
  slideBody?: string;
  customPrompt?: string;
  style?: string;
  aspectRatio?: string;
}

export interface AIImageResponse {
  success: boolean;
  imageUrl: string;
  optimizedPrompt: string;
  style: string;
  error?: string;
}

// ─── Visual Prompt Synthesis using Gemini ─────────────────────────────────────

async function synthesizeVisualPrompt(
  topic?: string,
  slideTitle?: string,
  slideBody?: string,
  customPrompt?: string,
  style: string = 'Cinematic Photography'
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (customPrompt && customPrompt.trim().length > 10) {
    return customPrompt.trim();
  }

  if (!apiKey) {
    // Fallback if no API key
    const subject = slideTitle || topic || 'modern minimalist concept';
    return `High quality, cinematic 8k ${style} of ${subject}, dramatic atmospheric lighting, 4:5 composition, hyperdetailed`;
  }

  const systemInstruction = `You are a world-class AI art director and cinematic visual prompt engineer for social media carousels.
Translate the slide subject, narrative, and meaning into a single, highly vivid, descriptive image prompt (max 35 words).
Focus on: focal subject, artistic medium/mood, dynamic lighting, color palette, camera lens, depth of field.
CRITICAL RULES:
- NEVER include text, words, lettering, logos, or UI elements in the prompt description.
- Make it visual, metaphorical, or concrete (e.g. historical scenes, symbolic objects, portraits, architectural views).
- Output ONLY the raw prompt text. No markdown, no quotes.`;

  const userQuery = `Topic: "${topic || 'General'}"
Slide Headline: "${slideTitle || ''}"
Slide Explanation: "${slideBody || ''}"
Aesthetic Style: "${style}"

Create a compelling visual concept prompt:`;

  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 120,
              thinkingConfig: { thinkingBudget: 0 }
            },
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        }
      );

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          // Clean quotes
          return text.replace(/^["']|["']$/g, '').trim();
        }
      }
    } catch (err: any) {
      console.warn(`[AI Image] Visual prompt synthesis error on ${model}:`, err.message);
    }
  }

  return `Cinematic, highly detailed ${style} representation of ${slideTitle || topic || 'insight'}, 4:5 vertical framing, 8k resolution`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: AIImageRequest = await req.json();

    const style = body.style || 'Cinematic Photography';
    const optimizedPrompt = await synthesizeVisualPrompt(
      body.topic,
      body.slideTitle,
      body.slideBody,
      body.customPrompt,
      style
    );

    // Generate unique seed for variety and freshness
    const seed = Math.floor(Math.random() * 1000000);
    const width = 1080;
    const height = 1350; // Standard 4:5 vertical carousel ratio

    const sourceUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(optimizedPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
    const generated = await fetch(sourceUrl, { signal: AbortSignal.timeout(45000) });
    if (!generated.ok) {
      return NextResponse.json({ error: 'Image service is unavailable. Your existing slide was not changed.' }, { status: 502 });
    }
    const contentType = generated.headers.get('content-type')?.split(';')[0] || '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) {
      return NextResponse.json({ error: 'Image service returned an invalid image. Your existing slide was not changed.' }, { status: 502 });
    }
    const bytes = Buffer.from(await generated.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Generated image was empty or too large. Your existing slide was not changed.' }, { status: 502 });
    }
    const imageUrl = `data:${contentType};base64,${bytes.toString('base64')}`;

    const response: AIImageResponse = {
      success: true,
      imageUrl,
      optimizedPrompt,
      style
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[AI Image Route] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Image generation failed' },
      { status: 500 }
    );
  }
}
