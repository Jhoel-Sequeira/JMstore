const STORAGE_KEY = 'jmstore.theme.v1';

export const DEFAULT_THEME = {
  primary: '#3525cd',
  secondary: '#087f5b',
  accent: '#e19a35',
  surface: '#f7f7fc',
  font: 'Arial',
  logo: 'https://lh3.googleusercontent.com/d/1BjZBopvdyYJLvUbcvLZo_3tLYbtBsPX-=w1000?authuser=0',
  brandName: 'JMscents',
  quoteStyle: 'vibrante',
  quoteTagline: 'Perfumería · Cotización personalizada',
  quoteFooter: 'Fragancias para cada momento',
  quoteShowImage: true,
  invoiceStyle: 'minimalista',
  invoiceFooter: 'Gracias por tu compra.',
};

export function getTheme() {
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('jmstore-theme-change', { detail: theme }));
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = theme.primary || DEFAULT_THEME.primary;
  const secondary = theme.secondary || DEFAULT_THEME.secondary;
  const accent = theme.accent || DEFAULT_THEME.accent;
  const surface = theme.surface || DEFAULT_THEME.surface;
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
