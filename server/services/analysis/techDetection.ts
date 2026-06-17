import type { TechnologyResult } from '../../types';

const TECH_PATTERNS: Array<{ name: string; category: string; patterns: RegExp[] }> = [
  { name: 'React', category: 'Framework', patterns: [/react/i, /__REACT_DEVTOOLS/i, /data-reactroot/i] },
  { name: 'Next.js', category: 'Framework', patterns: [/_next\/static/i, /__NEXT_DATA__/i] },
  { name: 'Angular', category: 'Framework', patterns: [/ng-version/i, /angular/i] },
  { name: 'Vue.js', category: 'Framework', patterns: [/vue/i, /__VUE__/i] },
  { name: 'Nuxt', category: 'Framework', patterns: [/__NUXT__/i, /_nuxt\//i] },
  { name: 'Svelte', category: 'Framework', patterns: [/svelte/i] },
  { name: 'Tailwind CSS', category: 'CSS', patterns: [/tailwindcss/i, /--tw-/i] },
  { name: 'Bootstrap', category: 'CSS', patterns: [/bootstrap/i] },
  { name: 'jQuery', category: 'JavaScript', patterns: [/jquery/i] },
  { name: 'WordPress', category: 'CMS', patterns: [/wp-content/i, /wp-includes/i] },
  { name: 'Shopify', category: 'E-commerce', patterns: [/cdn\.shopify\.com/i, /Shopify/i] },
  { name: 'Google Analytics', category: 'Analytics', patterns: [/google-analytics\.com/i, /gtag\(/i] },
  { name: 'Vite', category: 'Build Tool', patterns: [/@vite/i, /vite\/client/i] },
];

export function detectTechnologies(html: string, headers: Record<string, string> = {}): TechnologyResult[] {
  const combined = html + JSON.stringify(headers);
  const detected: TechnologyResult[] = [];

  for (const tech of TECH_PATTERNS) {
    const matches = tech.patterns.filter((p) => p.test(combined)).length;
    if (matches > 0) {
      detected.push({
        name: tech.name,
        category: tech.category,
        confidence: Math.min(95, 60 + matches * 15),
      });
    }
  }

  const poweredBy = headers['x-powered-by'] || headers['X-Powered-By'];
  if (poweredBy) {
    detected.push({ name: poweredBy, category: 'Server', confidence: 90 });
  }

  return detected.sort((a, b) => b.confidence - a.confidence);
}
