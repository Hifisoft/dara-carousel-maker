export interface MasterLayoutNode {
  id: string;
  templateId: string;
  role: 'cover' | 'content' | 'image_led' | 'quote' | 'statistic' | 'comparison' | 'cta' | 'blank';
  name: string;
  backgroundColor: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle: number;
  };
  canvas: {
    width: 1080;
    height: 1440;
  };
  layers: LayerNode[];
  rootLayerIds?: string[];
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  layouts: MasterLayoutNode[];
  createdAt: string;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    headlineFont: string;
    bodyFont: string;
  };
  spacing: {
    padding: number;
  };
}

export interface CarouselTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  thumbnailAssetId?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isDefault: boolean;
  isSystemTemplate?: boolean;
  isArchived: boolean;
  tokens?: DesignTokens;
  layouts: MasterLayoutNode[];
}

export interface CarouselDocument {
  schemaVersion: '2.0';
  id: string;
  workspaceId: string;
  title: string;
  topic: string;
  templateRef: {
    templateId: string;
    version: number;
    overrides: Record<string, unknown>;
  };
  dimensions: {
    width: 1080;
    height: 1440;
    aspectRatio: '4:5';
  };
  slides: SlideSceneNode[];
  globalCreativeDirection: CreativeDirectionConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SlideSceneNode {
  id: string;
  segmentRole: 'cover_hook' | 'setup' | 'value' | 'contrarian' | 'conclusion' | 'cta';
  layoutId?: string;
  masterLayoutId?: string;
  backgroundColor: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle: number;
  };
  layers: LayerNode[];
  rootLayerIds?: string[];
}

export type LayerNode = TextLayerNode | ImageLayerNode | ImageSlotLayerNode | ShapeLayerNode | LogoLayerNode | GroupLayerNode;

export interface BaseLayerNode {
  id: string;
  name: string;
  semanticRole?: string;
  parentId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  isLocked: boolean;
  isVisible: boolean;
  isStatic?: boolean;
  isEditable?: boolean;
  zIndex: number;
  dropShadow?: {
    x: number;
    y: number;
    blur: number;
    color: string;
    opacity: number;
  };
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
}

export interface GroupLayerNode extends BaseLayerNode {
  type: 'group';
  childIds: string[];
}

export interface StyleRun {
  start: number;
  end: number;
  fill?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
}

export interface TextSlotConstraints {
  maxLines?: number;
  minFontSize?: number;
  maxFontSize?: number;
  overflow?: 'shrink' | 'truncate' | 'wrap' | 'fixed';
  maxCharacters?: number;
  preferredLines?: number;
}

export interface TextLayerNode extends BaseLayerNode {
  type: 'text';
  role: 'headline' | 'subtitle' | 'body' | 'cta';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  lineHeight: number;
  lineHeightConfig?: {
    value: number;
    unit: 'Auto' | 'px' | '%';
  };
  letterSpacing: number;
  letterSpacingConfig?: {
    value: number;
    unit: 'px' | '%' | 'em';
  };
  align: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  textResizeMode?: 'AUTO_WIDTH' | 'AUTO_HEIGHT' | 'FIXED';
  textCase?: 'original' | 'uppercase' | 'lowercase' | 'title';
  textDecoration?: 'none' | 'underline' | 'strikethrough';
  paragraphSpacing?: number;
  textStroke?: {
    color: string;
    width: number;
    opacity: number;
  };
  textShadow?: {
    x: number;
    y: number;
    blur: number;
    color: string;
    opacity: number;
    enabled: boolean;
  };
  fill: string;
  styleRuns: StyleRun[];
  constraints?: TextSlotConstraints;
  textConstraints?: TextSlotConstraints;
}

export interface ImageLayerNode extends BaseLayerNode {
  type: 'image';
  assetId?: string;
  url: string;
  localPreviewUrl?: string;
  prompt?: string;
  status: 'empty' | 'prompt_ready' | 'queued' | 'generating' | 'ready' | 'failed';
  errorMessage?: string;
  crop?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  borderRadius: number;
}

export interface ImageSlotLayerNode extends BaseLayerNode {
  type: 'image-slot';
  semanticRole: 'hero_image' | 'supporting_image' | 'avatar' | 'logo' | string;
  fit: 'cover' | 'contain' | 'crop' | 'fill';
  focalPoint: { x: number; y: number }; // 0.0 to 1.0
  zoom: number; // 100 to 300
  pan: { x: number; y: number };
  borderRadius: number;
  fallbackUrl?: string;
  url?: string;
  assignedMediaUrl?: string;
  slotId?: string;
  slotLabel?: string;
}

// RENDERER-INDEPENDENT GRADIENT SCHEMA (FIGMA MODEL)
export interface Point2D {
  x: number; // 0.0 to 1.0 (normalized)
  y: number; // 0.0 to 1.0 (normalized)
}

export interface GradientStop {
  id: string;
  offset: number; // 0.0 to 1.0
  color: string;  // Hex color code, e.g., '#FF0000'
  opacity: number; // 0.0 to 1.0
}

export interface SolidFill {
  type: 'solid';
  color: string;
}

export interface LinearGradientFill {
  type: 'linear-gradient';
  angle: number; // 0 to 360 degrees (derived or fallback)
  start?: Point2D; // normalized start point (0-1)
  end?: Point2D;   // normalized end point (0-1)
  stops: GradientStop[];
}

export interface RadialGradientFill {
  type: 'radial-gradient';
  center?: Point2D; // normalized center (0-1)
  radius?: Point2D; // normalized radius (0-1)
  stops: GradientStop[];
}

export type ShapeFill = SolidFill | LinearGradientFill | RadialGradientFill;

export interface StrokeConfig {
  enabled: boolean;
  color: string;
  width: number;
}

export interface ShapeLayerNode extends BaseLayerNode {
  type: 'shape';
  shapeType: 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'line';
  fill: string | ShapeFill;
  stroke?: StrokeConfig;
  borderRadius?: number;
}

export interface LogoLayerNode extends BaseLayerNode {
  type: 'logo';
  url: string;
  scale: number;
}

export interface CreativeDirectionConfig {
  globalRules: string;
  coverRules: string;
  contentRules: string;
  ctaRules: string;
  enabled: boolean;
}

export type PerformancePreset = 'high_quality' | 'balanced' | 'high_speed' | 'fast' | 'premium' | 'low-cost';

export interface AISettings {
  preset: PerformancePreset;
  apiKeys: {
    openai?: string;
    claude?: string;
    gemini?: string;
    deepseek?: string;
    replicate?: string;
    stability?: string;
  };
  routing: {
    copy: string;
    prompt: string;
    image: string;
    upscale: string;
  };
}

export interface AssetRecord {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  localUrl: string;
  cloudUrl?: string;
  width: number;
  height: number;
  createdAt: string;
}
