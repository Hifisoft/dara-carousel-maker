import type { BrandProfile, LayerNode, LogoLayerNode, SlideSceneNode } from '../types/schema';

export function hasBrandLogoLayers(slide: SlideSceneNode): boolean {
  return slide.layers.some(layer => layer.type === 'logo' && layer.sourceMode === 'brand');
}

export function resolveLayerForBrand<T extends LayerNode>(layer: T, brand?: BrandProfile | null): T {
  if (layer.type !== 'logo' || layer.sourceMode !== 'brand') return layer;
  const role = (layer as LogoLayerNode).brandAssetRole || 'logoPrimary';
  return { ...layer, url: brand?.assets[role]?.url || '' } as T;
}

export function resolveSceneForBrand(slide: SlideSceneNode, brand?: BrandProfile | null): SlideSceneNode {
  return { ...slide, layers: slide.layers.map(layer => resolveLayerForBrand(layer, brand)) };
}

export function safeBrandFolderName(name: string, fallback = 'brand'): string {
  const normalized = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  return normalized || fallback;
}
