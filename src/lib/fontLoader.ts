export interface FontVariant {
  weight: string;
  style: 'normal' | 'italic';
  label: string;
}

export interface FontMeta {
  family: string;
  cssFamily?: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';
  source: 'google' | 'fontshare' | 'system';
  popularHeadline?: boolean;
  popularBody?: boolean;
  variants: FontVariant[];
}

export const POPULAR_FONTS: FontMeta[] = [
  // ── SANS-SERIF (Modern, Clean, High-Readability) ───────────────────────
  {
    family: 'Inter',
    category: 'sans-serif',
    source: 'google',
    popularHeadline: true,
    popularBody: true,
    variants: [
      { weight: '100', style: 'normal', label: 'Thin' },
      { weight: '200', style: 'normal', label: 'Extra Light' },
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    source: 'google',
    popularHeadline: true,
    popularBody: true,
    variants: [
      { weight: '100', style: 'normal', label: 'Thin' },
      { weight: '200', style: 'normal', label: 'Extra Light' },
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
      { weight: '700', style: 'italic', label: 'Bold Italic' },
    ]
  },
  {
    family: 'Helvetica',
    cssFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    category: 'sans-serif',
    source: 'system',
    popularHeadline: true,
    popularBody: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '900', style: 'normal', label: 'Heavy / Black' },
      { weight: '400', style: 'italic', label: 'Italic' },
      { weight: '700', style: 'italic', label: 'Bold Italic' },
    ]
  },
  {
    family: 'Plus Jakarta Sans',
    category: 'sans-serif',
    source: 'google',
    popularHeadline: true,
    popularBody: true,
    variants: [
      { weight: '200', style: 'normal', label: 'Extra Light' },
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
    ]
  },
  {
    family: 'Space Grotesk',
    category: 'sans-serif',
    source: 'google',
    popularHeadline: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Outfit',
    category: 'sans-serif',
    source: 'google',
    popularHeadline: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    source: 'google',
    popularHeadline: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'DM Sans',
    category: 'sans-serif',
    source: 'google',
    popularBody: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Manrope',
    category: 'sans-serif',
    source: 'google',
    popularHeadline: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
    ]
  },
  {
    family: 'Raleway',
    category: 'sans-serif',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Work Sans',
    category: 'sans-serif',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Satoshi',
    cssFamily: '"Satoshi", sans-serif',
    category: 'sans-serif',
    source: 'fontshare',
    popularHeadline: true,
    popularBody: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'General Sans',
    cssFamily: '"General Sans", sans-serif',
    category: 'sans-serif',
    source: 'fontshare',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },

  // ── DISPLAY / BOLD HOOKS (Impactful Viral Covers) ─────────────────────
  {
    family: 'Syne',
    category: 'display',
    source: 'google',
    popularHeadline: true,
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
    ]
  },
  {
    family: 'Bebas Neue',
    category: 'display',
    source: 'google',
    popularHeadline: true,
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' }
    ]
  },
  {
    family: 'Impact',
    cssFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    category: 'display',
    source: 'system',
    popularHeadline: true,
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' }
    ]
  },
  {
    family: 'Clash Display',
    cssFamily: '"Clash Display", sans-serif',
    category: 'display',
    source: 'fontshare',
    popularHeadline: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Cabinet Grotesk',
    cssFamily: '"Cabinet Grotesk", sans-serif',
    category: 'display',
    source: 'fontshare',
    popularHeadline: true,
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Oswald',
    category: 'display',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Anton',
    category: 'display',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' }
    ]
  },
  {
    family: 'Righteous',
    category: 'display',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' }
    ]
  },
  {
    family: 'Russo One',
    category: 'display',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' }
    ]
  },

  // ── SERIF / EDITORIAL / LUXURY ─────────────────────────────────────────
  {
    family: 'Playfair Display',
    category: 'serif',
    source: 'google',
    popularHeadline: true,
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '400', style: 'italic', label: 'Italic' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Lora',
    category: 'serif',
    source: 'google',
    popularBody: true,
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '400', style: 'italic', label: 'Italic' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Cormorant Garamond',
    category: 'serif',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '400', style: 'italic', label: 'Italic' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Cinzel',
    category: 'serif',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'DM Serif Display',
    category: 'serif',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '400', style: 'italic', label: 'Italic' },
    ]
  },
  {
    family: 'Bodoni Moda',
    category: 'serif',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },
  {
    family: 'Merriweather',
    category: 'serif',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '900', style: 'normal', label: 'Black' },
    ]
  },

  // ── MONOSPACE / CODE / TECH ───────────────────────────────────────────
  {
    family: 'Roboto Mono',
    category: 'monospace',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'JetBrains Mono',
    category: 'monospace',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
      { weight: '800', style: 'normal', label: 'Extra Bold' },
    ]
  },
  {
    family: 'Fira Code',
    category: 'monospace',
    source: 'google',
    variants: [
      { weight: '300', style: 'normal', label: 'Light' },
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '500', style: 'normal', label: 'Medium' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Space Mono',
    category: 'monospace',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },

  // ── HANDWRITING / ACCENT ──────────────────────────────────────────────
  {
    family: 'Caveat',
    category: 'handwriting',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Dancing Script',
    category: 'handwriting',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' },
      { weight: '600', style: 'normal', label: 'Semi Bold' },
      { weight: '700', style: 'normal', label: 'Bold' },
    ]
  },
  {
    family: 'Permanent Marker',
    category: 'handwriting',
    source: 'google',
    variants: [
      { weight: '400', style: 'normal', label: 'Regular' }
    ]
  }
];

const loadedFontsCache = new Set<string>();

export async function loadFont(family: string, weight = '400', style = 'normal'): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  const fontKey = `${family}:${weight}:${style}`;
  if (loadedFontsCache.has(fontKey)) return true;

  const fontMeta = POPULAR_FONTS.find((f) => f.family.toLowerCase() === family.toLowerCase());
  const source = fontMeta?.source || (family === 'Helvetica' || family === 'Impact' || family === 'Arial' ? 'system' : 'google');

  try {
    if (source === 'google') {
      const linkId = `gfont-${family.toLowerCase().replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap`;
        document.head.appendChild(link);
      }
    } else if (source === 'fontshare') {
      const linkId = `fontshare-${family.toLowerCase().replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        const slug = family.toLowerCase().replace(/\s+/g, '-');
        link.href = `https://api.fontshare.com/v2/css?f[]=${slug}@100,200,300,400,500,600,700,800,900&display=swap`;
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
    { weight: '300', style: 'normal', label: 'Light' },
    { weight: '400', style: 'normal', label: 'Regular' },
    { weight: '600', style: 'normal', label: 'Semi Bold' },
    { weight: '700', style: 'normal', label: 'Bold' },
    { weight: '900', style: 'normal', label: 'Black' }
  ];
}

export function resolveCssFontFamily(family: string): string {
  const meta = POPULAR_FONTS.find((f) => f.family.toLowerCase() === family.toLowerCase());
  if (meta?.cssFamily) return meta.cssFamily;
  return `"${family}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
}
