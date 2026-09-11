export interface FontVariant {
  weight: string;
  style: 'normal' | 'italic';
  label: string;
}

export interface FontMeta {
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';
  variants: FontVariant[];
  isRecent?: boolean;
}

export const POPULAR_FONTS: FontMeta[] = [
  {
    family: 'Inter',
    category: 'sans-serif',
    variants: [
      { weight: '100', style: 'normal', label: 'Thin' },
      { weight: '200', style: 'normal', label: 'Extra Light' },
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' }
    ]
  },
  {
    family: 'Space Grotesk',
    category: 'sans-serif',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' }
    ]
  },
  {
    family: 'Impact',
    category: 'display',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' }
    ]
  },
  {
    family: 'Plus Jakarta Sans',
    category: 'sans-serif',
    variants: [
      { weight: '200', style: 'normal', label: 'Extra Light' },
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' }
    ]
  },
  {
    family: 'Playfair Display',
    category: 'serif',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '400', style: 'italic', label: 'Italic' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' }
    ]
  },
  {
    family: 'Syne',
    category: 'display',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' }
    ]
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' }
    ]
  },
  {
    family: 'Roboto Mono',
    category: 'monospace',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' }
    ]
  }
];

const loadedFontsCache = new Set<string>();

export async function loadFont(family: string, weight = '400', style = 'normal'): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  const fontKey = `${family}:${weight}:${style}`;
  if (loadedFontsCache.has(fontKey)) return true;

  try {
    // Inject Google Font link if not system font
    if (family !== 'Impact' && family !== 'Arial' && family !== 'sans-serif') {
      const linkId = `gfont-${family.toLowerCase().replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap`;
        document.head.appendChild(link);
      }
    }

    if (document.fonts) {
      await document.fonts.load(`${style} ${weight} 16px "${family}"`);
    }
    loadedFontsCache.add(fontKey);
    return true;
  } catch (err) {
    console.warn(`Font load warning for ${family}:`, err);
    return false;
  }
}

export function getFontVariants(family: string): FontVariant[] {
  const font = POPULAR_FONTS.find((f) => f.family.toLowerCase() === family.toLowerCase());
  if (font) return font.variants;
  return [
    { weight: '400', style: 'normal', label: 'Regular' },
    { weight: '700', style: 'normal', label: 'Bold' }
  ];
}
