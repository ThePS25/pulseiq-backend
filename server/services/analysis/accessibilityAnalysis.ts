import * as cheerio from 'cheerio';

export interface AccessibilityAnalysisResult {
  issues: Array<{ type: string; description: string; count?: number }>;
  recommendations: string[];
  score: number;
}

export function analyzeAccessibility(html: string): AccessibilityAnalysisResult {
  const $ = cheerio.load(html);
  const issues: AccessibilityAnalysisResult['issues'] = [];
  const recommendations: string[] = [];
  let score = 100;

  const imagesWithoutAlt = $('img').filter((_, el) => !$(el).attr('alt')?.trim()).length;
  if (imagesWithoutAlt > 0) {
    issues.push({ type: 'missing-alt', description: 'Images missing alt text', count: imagesWithoutAlt });
    recommendations.push(`Add alt attributes to ${imagesWithoutAlt} images`);
    score -= Math.min(20, imagesWithoutAlt * 3);
  }

  const inputsWithoutLabel = $('input, select, textarea')
    .filter((_, el) => {
      const id = $(el).attr('id');
      const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
      const hasAria = !!$(el).attr('aria-label') || !!$(el).attr('aria-labelledby');
      return !hasLabel && !hasAria;
    })
    .length;

  if (inputsWithoutLabel > 0) {
    issues.push({ type: 'form-labels', description: 'Form fields without labels', count: inputsWithoutLabel });
    recommendations.push('Associate form fields with visible labels or aria-label');
    score -= Math.min(15, inputsWithoutLabel * 5);
  }

  const elementsWithoutAria = $('[role]').filter((_, el) => !$(el).attr('aria-label')).length;
  if (elementsWithoutAria > 3) {
    issues.push({ type: 'aria', description: 'Interactive elements may lack ARIA labels', count: elementsWithoutAria });
    recommendations.push('Add ARIA labels to interactive custom components');
    score -= 8;
  }

  const lowContrastCandidates = $('*').filter((_, el) => {
    const style = $(el).attr('style') || '';
    return /color:\s*#(ccc|ddd|eee|fff)/i.test(style) && /background/i.test(style);
  }).length;

  if (lowContrastCandidates > 0) {
    issues.push({ type: 'contrast', description: 'Potential contrast issues detected', count: lowContrastCandidates });
    recommendations.push('Ensure text meets WCAG AA contrast ratios (4.5:1)');
    score -= 10;
  }

  if (!$('html').attr('lang')) {
    issues.push({ type: 'lang', description: 'Missing lang attribute on html element' });
    recommendations.push('Add lang attribute to the html element');
    score -= 5;
  }

  const skipLink = $('a[href="#main"], a[href="#content"]').length;
  if (skipLink === 0) {
    recommendations.push('Add a skip navigation link for keyboard users');
    score -= 3;
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring accessibility with automated and manual testing');
  }

  return {
    issues,
    recommendations,
    score: Math.max(0, Math.min(100, score)),
  };
}
