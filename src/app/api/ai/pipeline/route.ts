import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_AI_ROUTING, isCopyModel } from '../../../../lib/aiModels';
import { requestLunaText } from '../../../../lib/openaiServer';
import { workspaceServiceStatus } from '../../../../lib/serverAuth';

export interface AIPipelineRequest {
  idempotencyKey: string;
  topic: string;
  slideCount?: number;
  templateId?: string;
  model?: string;
  instructions?: string;
}

export interface GeneratedSlide {
  index: number;
  segmentRole: 'cover_hook' | 'value' | 'cta';
  slide_title: string;
  slide_body?: string;
}

export interface AIPipelineResponse {
  success: boolean;
  title: string;
  slides: GeneratedSlide[];
  error?: string;
}

class CopyProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function callGemini(prompt: string, systemPrompt: string, model: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, topP: 0.9, maxOutputTokens: 2500, responseMimeType: 'application/json' },
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
    } catch {
      throw new CopyProviderError('Could not reach Gemini. Please try again in a moment or choose Create draft.', 503);
    }
    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text;
      if (!text) throw new CopyProviderError('Gemini returned no slide text. Please retry or choose Create draft.', 502);
      return text;
    }
    if ([429, 500, 502, 503, 504].includes(response.status) && attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
    if (response.status === 429) throw new CopyProviderError('Gemini is rate-limited right now. Please try again later or choose Create draft.', 429);
    if (response.status >= 500) throw new CopyProviderError('Gemini is busy right now. Please try again shortly or choose Create draft.', 503);
    if (response.status === 401 || response.status === 403) throw new CopyProviderError('The Gemini API key was rejected. Check the server configuration.', 503);
    throw new CopyProviderError('Gemini could not generate this carousel. Please try again or choose Create draft.', 502);
  }
  throw new CopyProviderError('Gemini is busy right now. Please try again shortly or choose Create draft.', 503);
}
// ─── Research & Copywriting Prompt Engine ─────────────────────────────────────

function buildCopyPrompt(topic: string, slideCount: number): string {
  const contentSlides = slideCount - 2;

  return `TOPIC TO RESEARCH & WRITE: "${topic}"
TARGET SLIDE COUNT: ${slideCount}

INSTRUCTIONS:
1. Conduct deep domain research on the topic: "${topic}".
2. Identify the most fascinating, concrete, and high-impact facts, case studies, historical examples, or actionable mechanisms.
3. Formulate a 10/10 viral carousel narrative:
   - Slide 0 (Cover Hook): High-curiosity hook headline (max 8 words) that makes people immediately swipe.
   - Slides 1 to ${contentSlides} (Content Slides): Each slide MUST detail ONE specific entity, country, person, law, study, or concrete insight. No vague generalities.
     * slide_title: Short, bold (e.g. "1. OTTOMAN EMPIRE (1922)" or "1. THE 2-MINUTE RULE").
     * slide_body: High-density, crystal-clear explanation in 130–190 characters explaining what happened, why, or how to apply it.
   - Slide ${slideCount - 1} (CTA / Conclusion): Strong engagement closing asking a specific reflective question or prompting a save.

RETURN STRICT VALID JSON in exactly this structure:
{
  "title": "Short Hook Title (max 6 words)",
  "slides": [
    {
      "index": 0,
      "segmentRole": "cover_hook",
      "slide_title": "Bold Viral Hook Headline"
    },
    ${Array.from({ length: contentSlides }, (_, i) => `{
      "index": ${i + 1},
      "segmentRole": "value",
      "slide_title": "${i + 1}. Concrete Subtopic or Example",
      "slide_body": "Detailed, specific factual insight explaining the core reason or takeaway in 130-190 characters."
    }`).join(',\n    ')},
    {
      "index": ${slideCount - 1},
      "segmentRole": "cta",
      "slide_title": "Which of these surprised you most? Save for later!"
    }
  ]
}`;
}

const SYSTEM_PROMPT = `You are a world-class investigative researcher and viral social media carousel copywriter for Instagram, LinkedIn, and Twitter.
You write with authority, precision, and high retention.
Every single slide MUST contain concrete facts, names, dates, numbers, or specific real-world mechanisms — NEVER placeholder text, generic filler, or fluff.
Slide titles must be punchy and under 8 words. Body copy must be 130–195 characters long.
Always output pure valid JSON only.`;

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const access = await workspaceServiceStatus(req, 'copy');
    if (access !== 200) return NextResponse.json({ error: access === 429 ? 'AI copy limit reached. Try again in an hour.' : 'Sign in to an organisation to use AI.' }, { status: access });
    const body: AIPipelineRequest = await req.json();
    if (typeof body.topic !== 'string' || !body.topic.trim() || typeof body.idempotencyKey !== 'string') {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    if (body.model !== undefined && !isCopyModel(body.model)) {
      return NextResponse.json({ error: 'Unsupported copy model' }, { status: 400 });
    }

    const model = body.model || DEFAULT_AI_ROUTING.copy;
    const requiredKey = model === 'openai:gpt-6-luna' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
    if (!process.env[requiredKey]) return NextResponse.json({ error: `AI copy needs a server-side ${requiredKey}. You can still outline the carousel yourself.` }, { status: 503 });

    const slideCount = Math.min(20, Math.max(Number(body.slideCount) || 5, 3));
    let title = body.topic.substring(0, 60);
    let slides: GeneratedSlide[];

      try {
        const prompt = buildCopyPrompt(body.topic, slideCount);
        const instructions = typeof body.instructions === 'string' ? body.instructions.slice(0, 20000) : '';
        const systemPrompt = `${SYSTEM_PROMPT}\n\nUSER MASTER INSTRUCTIONS:\n${instructions}`;
        const raw = model === 'openai:gpt-6-luna'
          ? await requestLunaText(prompt, systemPrompt, { maxOutputTokens: 6000, jsonSchema: {
            name: 'carousel_copy', schema: {
              type: 'object', additionalProperties: false, required: ['title', 'slides'], properties: {
                title: { type: 'string' }, slides: { type: 'array', items: { type: 'object', additionalProperties: false,
                  required: ['index', 'segmentRole', 'slide_title', 'slide_body'], properties: {
                    index: { type: 'integer' }, segmentRole: { type: 'string', enum: ['cover_hook', 'value', 'cta'] },
                    slide_title: { type: 'string' }, slide_body: { type: 'string' },
                  } } },
              },
            },
          } })
          : await callGemini(prompt, systemPrompt, model);
        
        // Clean markdown codeblocks if present
        const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed.slides) || parsed.slides.length !== slideCount ||
            parsed.slides.some((s: any) => !s || typeof s.slide_title !== 'string' || !s.slide_title.trim())) {
          throw new Error('AI returned an incomplete carousel');
        }
        title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : title;
        slides = parsed.slides.map((s: any, i: number) => ({
          index: i,
          segmentRole: i === 0 ? 'cover_hook' : i === slideCount - 1 ? 'cta' : 'value',
          slide_title: s.slide_title.trim(),
          slide_body: typeof s.slide_body === 'string' ? s.slide_body.substring(0, 210) : undefined,
        }));
      } catch (aiErr: any) {
        console.error('[AI Pipeline] Copy generation error:', aiErr.message);
        if (aiErr instanceof CopyProviderError) {
          return NextResponse.json({ error: aiErr.message }, { status: aiErr.status });
        }
        return NextResponse.json({ error: 'AI copy generation failed. Your topic is preserved; retry or create a template draft.' }, { status: 502 });
      }

    const response: AIPipelineResponse = { success: true, title, slides };
    return NextResponse.json(response);

  } catch (err: any) {
    console.error('[AI Pipeline] Fatal route error:', err);
    return NextResponse.json({ error: err.message || 'Pipeline failed' }, { status: 500 });
  }
}
