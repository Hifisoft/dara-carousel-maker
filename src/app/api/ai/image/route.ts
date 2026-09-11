import { NextRequest, NextResponse } from 'next/server';

export interface AIImageRequest {
  layerId: string;
  slideId: string;
  userInstruction: string;
  currentPrompt?: string;
  templateStyle?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AIImageRequest = await req.json();

    if (!body.layerId || !body.userInstruction) {
      return NextResponse.json(
        { error: 'Missing required layerId or userInstruction' },
        { status: 400 }
      );
    }

    // Simulated Server AI Image Prompt Optimization & Model Gateway Call
    const optimizedPrompt = `Cinematic, highly detailed ${body.userInstruction}, 4:5 vertical compositional framing, modern 3D render style, 8k resolution`;

    // High quality curated unsplash visual asset URLs
    const sampleVisuals = [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1080&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1557683316-973673baf926?w=1080&auto=format&fit=crop'
    ];

    const selectedUrl = sampleVisuals[Math.floor(Math.random() * sampleVisuals.length)];

    return NextResponse.json({
      success: true,
      layerId: body.layerId,
      slideId: body.slideId,
      optimizedPrompt,
      assetUrl: selectedUrl,
      status: 'ready',
      modelUsed: 'Nanobanana Pro (Image)',
      generationTimeMs: 420
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Image generation failed' },
      { status: 500 }
    );
  }
}
