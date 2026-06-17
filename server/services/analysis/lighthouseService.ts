import { mkdtemp, readFile, rm } from 'fs/promises';
import { spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ReportScores } from '../../types';
import { lighthouseQueue } from '../../utils/lighthouseQueue';

export interface LighthouseResult {
  scores: Pick<ReportScores, 'performance' | 'seo' | 'accessibility' | 'bestPractices'>;
  metrics: Record<string, number | string>;
  recommendations: string[];
}

type LighthouseCategories = {
  [key: string]: { score?: number | null };
};

type LighthouseReport = {
  categories: LighthouseCategories;
  audits: Record<string, { score?: number | null; title?: string; numericValue?: number; displayValue?: string }>;
};

function auditScore(categories: LighthouseCategories, key: string): number {
  const cat = categories[key];
  return cat ? Math.round((cat.score ?? 0) * 100) : 0;
}

function formatMetric(value: number | undefined, unit: string): string {
  if (value === undefined) return 'N/A';
  if (unit === 'ms') return `${Math.round(value)}ms`;
  if (unit === 's') return `${(value / 1000).toFixed(2)}s`;
  return String(value);
}

function parseLighthouseReport(lhr: LighthouseReport): LighthouseResult {
  const audits = lhr.audits;
  const recommendations: string[] = [];

  const failingAudits = Object.values(audits)
    .filter((a) => a.score !== null && a.score !== undefined && a.score < 0.9 && a.title)
    .slice(0, 8);

  for (const audit of failingAudits) {
    if (audit.title) recommendations.push(audit.title);
  }

  const metrics: Record<string, number | string> = {
    firstContentfulPaint: formatMetric(audits['first-contentful-paint']?.numericValue, 'ms'),
    largestContentfulPaint: formatMetric(audits['largest-contentful-paint']?.numericValue, 'ms'),
    speedIndex: formatMetric(audits['speed-index']?.numericValue, 'ms'),
    totalBlockingTime: formatMetric(audits['total-blocking-time']?.numericValue, 'ms'),
    cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue || 'N/A',
    timeToInteractive: formatMetric(audits['interactive']?.numericValue, 'ms'),
  };

  return {
    scores: {
      performance: auditScore(lhr.categories, 'performance'),
      seo: auditScore(lhr.categories, 'seo'),
      accessibility: auditScore(lhr.categories, 'accessibility'),
      bestPractices: auditScore(lhr.categories, 'best-practices'),
    },
    metrics,
    recommendations: recommendations.length
      ? recommendations
      : ['Performance looks good — continue monitoring Core Web Vitals'],
  };
}

function chromeFlags(): string {
  const flags = ['--headless', '--disable-gpu', '--disable-dev-shm-usage'];
  if (process.platform === 'linux') {
    flags.push('--no-sandbox', '--disable-setuid-sandbox');
  }
  return flags.join(' ');
}

function runLighthouseCli(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cli = join(process.cwd(), 'node_modules', 'lighthouse', 'cli', 'index.js');
    const args = [
      cli,
      url,
      '--output=json',
      `--output-path=${outputPath}`,
      '--quiet',
      '--only-categories=performance,seo,accessibility,best-practices',
      `--chrome-flags=${chromeFlags()}`,
    ];

    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Lighthouse timed out after 120 seconds'));
    }, 120_000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `Lighthouse CLI exited with code ${code}`));
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function runLighthouseProgrammatic(url: string): Promise<LighthouseResult> {
  const [{ default: lighthouse }, puppeteer] = await Promise.all([
    import('lighthouse'),
    import('puppeteer'),
  ]);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
    ],
  });

  try {
    const port = Number(new URL(browser.wsEndpoint()).port);

    const runnerResult = await lighthouse(url, {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
      port,
    });

    const lhr = runnerResult?.lhr;
    if (!lhr) {
      throw new Error('Lighthouse returned no results');
    }

    return parseLighthouseReport(lhr as LighthouseReport);
  } finally {
    await browser.close();
  }
}

async function runLighthouseCliIsolated(url: string): Promise<LighthouseResult> {
  const dir = await mkdtemp(join(tmpdir(), 'pulseiq-lh-'));
  const outputPath = join(dir, 'report.json');

  try {
    await runLighthouseCli(url, outputPath);

    let raw: string;
    try {
      raw = await readFile(outputPath, 'utf-8');
    } catch {
      raw = await readFile(`${outputPath}.report.json`, 'utf-8');
    }

    const lhr = JSON.parse(raw) as LighthouseReport;
    return parseLighthouseReport(lhr);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function runOnce(url: string): Promise<LighthouseResult> {
  try {
    return await runLighthouseCliIsolated(url);
  } catch (cliError) {
    console.warn('Lighthouse CLI failed, trying programmatic fallback:', cliError);
    return runLighthouseProgrammatic(url);
  }
}

/**
 * Runs Lighthouse in an isolated child process (preferred) with a global queue
 * so concurrent scans don't corrupt Node performance marks.
 */
export async function runLighthouse(url: string): Promise<LighthouseResult> {
  return lighthouseQueue.run(async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await runOnce(url);
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    throw lastError;
  });
}
