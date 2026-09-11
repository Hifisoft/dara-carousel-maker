import { CarouselDocument, SlideSceneNode, LayerNode, TextLayerNode } from '../types/schema';

export function migrateV1ToV2(v1Data: any): CarouselDocument {
  const now = new Date().toISOString();
  
  const slides: SlideSceneNode[] = (v1Data.slides || []).map((slide: any, sIdx: number) => {
    const layers: LayerNode[] = (slide.layers || []).map((layer: any, lIdx: number) => {
      const baseLayer = {
        id: layer.id || `layer-${sIdx}-${lIdx}`,
        name: layer.role ? capitalize(layer.role) : `${(layer.type || 'TEXT').toUpperCase()} Layer`,
        x: Number(layer.x) || 60,
        y: Number(layer.y) || 200,
        width: Number(layer.w || layer.width) || 960,
        height: Number(layer.h || layer.height) || 180,
        rotation: Number(layer.rotation) || 0,
        opacity: Number(layer.opacity) ?? 1,
        isLocked: Boolean(layer.isLocked),
        isVisible: layer.isVisible !== false,
        zIndex: lIdx
      };

      if (layer.type === 'image') {
        return {
          ...baseLayer,
          type: 'image',
          url: layer.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop',
          prompt: layer.prompt || '',
          status: 'ready',
          borderRadius: Number(layer.borderRadius) || 0
        };
      }

      if (layer.type === 'shape') {
        return {
          ...baseLayer,
          type: 'shape',
          shapeType: layer.shapeType || 'rectangle',
          fill: layer.fill || '#0A84FF',
          borderRadius: Number(layer.borderRadius) || 0
        };
      }

      // Default to TextLayerNode
      const textLayer: TextLayerNode = {
        ...baseLayer,
        type: 'text',
        role: (layer.role || 'body') as any,
        content: layer.content || '',
        fontFamily: layer.font || layer.fontFamily || 'Inter',
        fontSize: Number(layer.fontSize) || 24,
        fontWeight: String(layer.fontWeight || '400'),
        fontStyle: layer.fontStyle === 'italic' ? 'italic' : 'normal',
        lineHeight: Number(layer.lineHeight) || 1.2,
        letterSpacing: Number(layer.letterSpacing) || 0,
        align: (layer.align || 'left') as any,
        fill: layer.color || layer.fill || '#FFFFFF',
        styleRuns: Array.isArray(layer.styleRuns) ? layer.styleRuns : []
      };

      return textLayer;
    });

    return {
      id: slide.id || `slide-${sIdx}`,
      segmentRole: mapSegmentRole(slide.segment),
      backgroundColor: slide.bgColor || slide.backgroundColor || '#111111',
      layers
    };
  });

  return {
    schemaVersion: '2.0',
    id: v1Data.id || `post-${Date.now()}`,
    workspaceId: v1Data.workspaceId || 'default-workspace',
    title: v1Data.title || 'Untitled Carousel',
    topic: v1Data.topic || '',
    templateRef: {
      templateId: v1Data.templateId || 'bbc',
      version: 1,
      overrides: {}
    },
    dimensions: {
      width: 1080,
      height: 1440,
      aspectRatio: '4:5'
    },
    slides,
    globalCreativeDirection: {
      globalRules: 'Keep layouts clean, punchy, and modern.',
      coverRules: 'High dopamine hook visual.',
      contentRules: 'Actionable insight structure.',
      ctaRules: 'Clear follow prompt.',
      enabled: true
    },
    createdAt: v1Data.createdAt || now,
    updatedAt: now
  };
}

function mapSegmentRole(segmentStr: string): SlideSceneNode['segmentRole'] {
  if (!segmentStr) return 'value';
  const lower = segmentStr.toLowerCase();
  if (lower.includes('cover') || lower.includes('hook')) return 'cover_hook';
  if (lower.includes('setup') || lower.includes('context')) return 'setup';
  if (lower.includes('cta') || lower.includes('conclusion')) return 'cta';
  if (lower.includes('contrarian')) return 'contrarian';
  return 'value';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
