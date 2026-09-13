import { NextRequest, NextResponse } from 'next/server';

export interface AIPipelineRequest {
  idempotencyKey: string;
  topic: string;
  slideCount: number;
  templateId: string;
}

export interface GeneratedSlide {
  index: number;
  segmentRole: 'cover_hook' | 'value' | 'cta';
  slide_title: string;   // Short punchy headline, max 8 words (ALL CAPS style)
  slide_body?: string;   // Max 200 chars — content slides only
}

export interface AIPipelineResponse {
  success: boolean;
  title: string;
  slides: GeneratedSlide[];
  error?: string;
}

// ─── Gemini REST call ─────────────────────────────────────────────────────────

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json',
        },
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// ─── Build prompt ─────────────────────────────────────────────────────────────

function buildCopyPrompt(topic: string, slideCount: number): string {
  const contentSlides = slideCount - 2; // minus cover + CTA

  return `Topic: "${topic}"

Create a ${slideCount}-slide social media carousel. Return ONLY valid JSON in exactly this format:

{
  "title": "Short hook title for this carousel (max 6 words)",
  "slides": [
    {
      "index": 0,
      "segmentRole": "cover_hook",
      "slide_title": "Compelling hook headline that makes people stop scrolling (max 10 words, can be a bold statement or question)"
    },
    ${Array.from({ length: contentSlides }, (_, i) => `{
      "index": ${i + 1},
      "segmentRole": "value",
      "slide_title": "Point ${i + 1} headline (max 8 words, bold and direct)",
      "slide_body": "Explanation of the point in 150-200 characters. One concrete insight. No fluff. Make it feel real and specific."
    }`).join(',\n    ')},
    {
      "index": ${slideCount - 1},
      "segmentRole": "cta",
      "slide_title": "Call to action (e.g. 'Follow for more like this' or 'Save this before it disappears')"
    }
  ]
}

Rules:
- slide_title for cover_hook: make it bold and provocative, like a magazine cover
- slide_title for content: a short clear statement that previews the insight
- slide_body: exactly 150-200 characters, reads like a confident expert sharing a real insight
- slide_title for cta: creates FOMO, drives engagement
- Write for ${topic} specifically — no generic filler
- Do NOT include hashtags`;
}

const SYSTEM_PROMPT = `You are an expert viral social media carousel copywriter. 
You write for Instagram and LinkedIn. Your style is direct, confident, and punchy.
Headlines are short (max 8 words). Body text is specific and insightful (150-200 chars).
You always return valid JSON, nothing else.`;

// ─── Fallback ─────────────────────────────────────────────────────────────────

function buildFallback(topic: string, slideCount: number): GeneratedSlide[] {
  return Array.from({ length: slideCount }, (_, i) => {
    const role = i === 0 ? 'cover_hook' : (i === slideCount - 1 ? 'cta' : 'value');
    if (role === 'cover_hook') {
      return { index: i, segmentRole: 'cover_hook', slide_title: topic };
    }
    if (role === 'cta') {
      return { index: i, segmentRole: 'cta', slide_title: 'Follow for more like this' };
    }
    return {
      index: i,
      segmentRole: 'value',
      slide_title: `Key Insight #${i}`,
      slide_body: `Add your key insight about "${topic}" here. Keep it under 200 characters and make it specific.`
    };
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: AIPipelineRequest = await req.json();
    if (!body.topic || !body.idempotencyKey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const slideCount = Math.max(body.slideCount || 5, 3);
    let title = body.topic.substring(0, 60);
    let slides: GeneratedSlide[];

    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = buildCopyPrompt(body.topic, slideCount);
        const raw = await callGemini(prompt, SYSTEM_PROMPT);
        const parsed = JSON.parse(raw);

        title = parsed.title || title;

        // Normalise — ensure every slide has the required fields
        slides = (parsed.slides as GeneratedSlide[]).map((s, i) => ({
          index: i,
          segmentRole: s.segmentRole || (i === 0 ? 'cover_hook' : i === slideCount - 1 ? 'cta' : 'value'),
          slide_title: s.slide_title || `Slide ${i + 1}`,
          slide_body: s.slide_body?.substring(0, 220), // hard cap at 220 chars
        }));
      } catch (aiErr: any) {
        console.error('[AI Pipeline] Gemini error:', aiErr.message);
        slides = buildFallback(body.topic, slideCount);
      }
    } else {
      console.warn('[AI Pipeline] No GEMINI_API_KEY — using fallback copy');
      slides = buildFallback(body.topic, slideCount);
    }

    const response: AIPipelineResponse = { success: true, title, slides };
    return NextResponse.json(response);

  } catch (err: any) {
    console.error('[AI Pipeline] Fatal error:', err);
    return NextResponse.json({ error: err.message || 'Pipeline failed' }, { status: 500 });
  }
}
