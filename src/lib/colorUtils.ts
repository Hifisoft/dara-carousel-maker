export function hexOrColorToRgba(colorStr: string, opacity: number = 1): string {
  if (!colorStr) return `rgba(0, 0, 0, ${opacity})`;
  if (colorStr.startsWith('rgba')) {
    const parts = colorStr.substring(5, colorStr.length - 1).split(',');
    if (parts.length >= 3) {
      return `rgba(${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}, ${opacity})`;
    }
  }
  if (colorStr.startsWith('rgb')) {
    const parts = colorStr.substring(4, colorStr.length - 1).split(',');
    if (parts.length >= 3) {
      return `rgba(${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}, ${opacity})`;
    }
  }
  let hex = colorStr.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return colorStr;
}
