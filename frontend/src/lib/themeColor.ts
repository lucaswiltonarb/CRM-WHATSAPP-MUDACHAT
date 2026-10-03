/**
 * Resolve um token CSS para cor real.
 * ApexCharts e SVG nao aceitam `var(--x)`; precisam do valor computado.
 */
export function cssVar(name: string, fallback = '#5058CE'): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Paleta de series resolvida no tema atual. */
export function chartPalette() {
  return {
    primary: cssVar('--lf-primary'),
    success: cssVar('--lf-success', '#247D3D'),
    warning: cssVar('--lf-warning', '#8A5B00'),
    danger: cssVar('--lf-danger', '#BE3158'),
    info: cssVar('--lf-info', '#176DAD'),
    violet: cssVar('--lf-category-violet', '#8A22C3'),
    pink: cssVar('--lf-category-pink', '#B72476'),
    muted: cssVar('--lf-text-muted', '#64717A'),
    surface: cssVar('--lf-surface-card', '#FFFFFF'),
  };
}
