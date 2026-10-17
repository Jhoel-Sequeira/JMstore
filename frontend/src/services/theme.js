const STORAGE_KEY = 'jmstore.theme.v1';

export const BRAND_PALETTE = {
  primary: '#3C507D',
  secondary: '#112250',
  accent: '#E0C58F',
  surface: '#F5F0E9',
  border: '#D9CBC2',
};

export const DEFAULT_THEME = {
  ...BRAND_PALETTE,
  font: 'Arial',
  logo: 'https://lh3.googleusercontent.com/d/1BjZBopvdyYJLvUbcvLZo_3tLYbtBsPX-=w1000?authuser=0',
  brandName: 'JMscents',
  quoteStyle: 'minimalista',
  quoteTagline: 'Perfumería · Cotización personalizada',
  quoteFooter: 'Fragancias para cada momento',
  invoiceStyle: 'minimalista',
  invoiceFooter: 'Gracias por tu compra.',
};

export function getTheme() {
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'), ...BRAND_PALETTE, quoteStyle: 'minimalista', invoiceStyle: 'minimalista' };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function saveTheme(theme) {
  const fixedTheme = { ...theme, ...BRAND_PALETTE, quoteStyle: 'minimalista', invoiceStyle: 'minimalista' };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixedTheme));
  applyTheme(fixedTheme);
  window.dispatchEvent(new CustomEvent('jmstore-theme-change', { detail: fixedTheme }));
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = BRAND_PALETTE.primary;
  const secondary = BRAND_PALETTE.secondary;
  const accent = BRAND_PALETTE.accent;
  const surface = BRAND_PALETTE.surface;
  const font = theme.font || DEFAULT_THEME.font;
  root.style.setProperty('--jm-font', `'${font}', sans-serif`);
  document.body.style.fontFamily = `'${font}', sans-serif`;
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-container', primary);
  root.style.setProperty('--color-primary-fixed', `color-mix(in srgb, ${primary} 16%, white)`);
  root.style.setProperty('--color-primary-fixed-dim', `color-mix(in srgb, ${primary} 30%, white)`);
  root.style.setProperty('--color-on-primary-fixed-variant', primary);
  root.style.setProperty('--color-on-primary-fixed', primary);
  root.style.setProperty('--color-secondary', secondary);
  root.style.setProperty('--color-secondary-container', `color-mix(in srgb, ${secondary} 18%, white)`);
  root.style.setProperty('--color-on-secondary-container', secondary);
  root.style.setProperty('--color-tertiary', accent);
  root.style.setProperty('--color-tertiary-container', accent);
  root.style.setProperty('--color-surface', surface);
  root.style.setProperty('--color-background', surface);
  ['headline-xl', 'headline-lg', 'headline-md', 'headline-sm', 'body-lg', 'body-md', 'body-sm', 'label-lg', 'label-md', 'label-sm']
    .forEach((name) => root.style.setProperty(`--font-${name}`, `'${font}', sans-serif`));
  root.style.setProperty('--jm-primary', primary);
  root.style.setProperty('--jm-secondary', secondary);
  root.style.setProperty('--jm-accent', accent);
}
