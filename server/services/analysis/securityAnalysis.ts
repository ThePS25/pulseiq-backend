import axios from 'axios';

export interface SecurityAnalysisResult {
  headers: Record<string, string | boolean>;
  ssl: Record<string, unknown>;
  recommendations: string[];
  score: number;
}

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
] as const;

export async function analyzeSecurity(url: string): Promise<SecurityAnalysisResult> {
  const recommendations: string[] = [];
  let score = 100;
  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';

  let responseHeaders: Record<string, string> = {};

  try {
    const res = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    responseHeaders = Object.fromEntries(
      Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
    );
  } catch {
    try {
      const res = await axios.get(url, { timeout: 10000, maxRedirects: 5, validateStatus: () => true });
      responseHeaders = Object.fromEntries(
        Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
      );
    } catch {
      recommendations.push('Unable to fetch security headers — site may be unreachable');
      score -= 30;
    }
  }

  const headers: Record<string, string | boolean> = {};

  for (const header of SECURITY_HEADERS) {
    const present = !!responseHeaders[header];
    headers[header] = present ? responseHeaders[header] : false;

    if (!present) {
      score -= header === 'strict-transport-security' ? 15 : 10;
      recommendations.push(`Add ${header} security header`);
    }
  }

  if (!isHttps) {
    score -= 25;
    recommendations.push('Enable HTTPS — site is not served over SSL');
  }

  const ssl = {
    enabled: isHttps,
    protocol: parsed.protocol,
    hostname: parsed.hostname,
  };

  if (isHttps && !responseHeaders['strict-transport-security']) {
    recommendations.push('Enable HSTS to enforce HTTPS connections');
  }

  return {
    headers,
    ssl,
    recommendations: [...new Set(recommendations)],
    score: Math.max(0, Math.min(100, score)),
  };
}
