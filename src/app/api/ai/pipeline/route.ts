import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_AI_ROUTING, isCopyModel } from '../../../../lib/aiModels';

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

async function callGemini(prompt: string, systemPrompt: string, model: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, topP: 0.9, maxOutputTokens: 2500, responseMimeType: 'application/json' },
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    }
  );
  if (!response.ok) throw new Error(`Selected model ${model} returned ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text;
  if (!text) throw new Error('Selected model returned no copy');
  return text;
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
    const body: AIPipelineRequest = await req.json();
    if (typeof body.topic !== 'string' || !body.topic.trim() || typeof body.idempotencyKey !== 'string') {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    if (body.model !== undefined && !isCopyModel(body.model)) {
      return NextResponse.json({ error: 'Unsupported copy model' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI copy needs a server-side GEMINI_API_KEY. You can still create a template draft without AI.' }, { status: 503 });
    }

    const slideCount = Math.min(20, Math.max(Number(body.slideCount) || 5, 3));
    let title = body.topic.substring(0, 60);
    let slides: GeneratedSlide[];

      try {
        const prompt = buildCopyPrompt(body.topic, slideCount);
        const instructions = typeof body.instructions === 'string' ? body.instructions.slice(0, 20000) : '';
        const raw = await callGemini(prompt, `${SYSTEM_PROMPT}\n\nUSER MASTER INSTRUCTIONS:\n${instructions}`, body.model || DEFAULT_AI_ROUTING.copy);
        
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
        console.error('[AI Pipeline] Gemini cascade error:', aiErr.message);
        return NextResponse.json({ error: 'AI copy generation failed. Your topic is preserved; retry or create a template draft.' }, { status: 502 });
      }

    const response: AIPipelineResponse = { success: true, title, slides };
    return NextResponse.json(response);

  } catch (err: any) {
    console.error('[AI Pipeline] Fatal route error:', err);
    return NextResponse.json({ error: err.message || 'Pipeline failed' }, { status: 500 });
  }
}
