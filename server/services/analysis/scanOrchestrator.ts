import axios from 'axios';
import puppeteer from 'puppeteer';
import { Report } from '../../models/Report';
import { Website } from '../../models/Website';
import { Metric } from '../../models/Metric';
import { emitScanProgress, cleanupScan } from '../../utils/scanProgress';
import { extractDomain } from '../../utils/url';
import { runLighthouse } from './lighthouseService';
import { analyzeSeo } from './seoAnalysis';
import { analyzeSecurity } from './securityAnalysis';
import { analyzeAccessibility } from './accessibilityAnalysis';
import { detectTechnologies } from './techDetection';

const SCAN_STAGES = [
  { stage: 'initializing', progress: 5, message: 'Initializing scan systems...' },
  { stage: 'crawling', progress: 15, message: 'Crawling website structure...' },
  { stage: 'technologies', progress: 30, message: 'Detecting technologies...' },
  { stage: 'lighthouse', progress: 50, message: 'Running Lighthouse audit...' },
  { stage: 'seo', progress: 70, message: 'Analyzing SEO signals...' },
  { stage: 'accessibility', progress: 85, message: 'Checking accessibility...' },
  { stage: 'security', progress: 92, message: 'Evaluating security posture...' },
  { stage: 'generating', progress: 98, message: 'Generating intelligence report...' },
];

export async function runWebsiteScan(reportId: string, url: string, userId: string): Promise<void> {
  const startTime = Date.now();

  try {
    await Report.findByIdAndUpdate(reportId, { status: 'scanning' });

    for (const stage of SCAN_STAGES.slice(0, 2)) {
      emitScanProgress(reportId, stage);
      await delay(400);
    }

    let html = '';
    let responseHeaders: Record<string, string> = {};

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'PulseIQ/1.0 Website Intelligence Bot' },
        maxRedirects: 5,
      });
      html = response.data;
      responseHeaders = Object.fromEntries(
        Object.entries(response.headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
      );
    } catch {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        html = await page.content();
        responseHeaders = {};
      } finally {
        await browser.close();
      }
    }

    emitScanProgress(reportId, SCAN_STAGES[2]!);
    const technologies = detectTechnologies(html, responseHeaders);
    await delay(300);

    emitScanProgress(reportId, SCAN_STAGES[3]!);
    let lighthouseResult;
    try {
      lighthouseResult = await runLighthouse(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Lighthouse error';
      console.warn('Lighthouse failed, using fallback scores:', message);
      lighthouseResult = {
        scores: { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 },
        metrics: {},
        recommendations: [
          `Lighthouse audit could not complete: ${message}`,
          'Try scanning again — only one scan runs at a time.',
        ],
      };
    }

    emitScanProgress(reportId, SCAN_STAGES[4]!);
    const seoResult = await analyzeSeo(url, html);

    emitScanProgress(reportId, SCAN_STAGES[5]!);
    const a11yResult = analyzeAccessibility(html);

    emitScanProgress(reportId, SCAN_STAGES[6]!);
    const securityResult = await analyzeSecurity(url);

    emitScanProgress(reportId, SCAN_STAGES[7]!);

    const domain = extractDomain(url);
    let website = await Website.findOne({ domain });
    if (!website) {
      website = await Website.create({ url, domain, scanCount: 1, lastScannedAt: new Date() });
    } else {
      website.scanCount += 1;
      website.lastScannedAt = new Date();
      website.url = url;
      await website.save();
    }

    const scores = {
      performance: lighthouseResult.scores.performance,
      seo: Math.round((lighthouseResult.scores.seo + seoResult.score) / 2),
      accessibility: Math.round((lighthouseResult.scores.accessibility + a11yResult.score) / 2),
      security: securityResult.score,
      bestPractices: lighthouseResult.scores.bestPractices,
    };

    const scanDuration = Date.now() - startTime;

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status: 'completed',
        websiteId: website._id,
        scores,
        performance: {
          metrics: lighthouseResult.metrics ?? {},
          recommendations: lighthouseResult.recommendations ?? [],
        },
        seo: {
          findings: seoResult.findings ?? {},
          recommendations: seoResult.recommendations ?? [],
        },
        accessibility: {
          issues: a11yResult.issues ?? [],
          recommendations: a11yResult.recommendations ?? [],
        },
        security: {
          headers: securityResult.headers ?? {},
          ssl: securityResult.ssl ?? {},
          recommendations: securityResult.recommendations ?? [],
        },
        technologies: technologies ?? [],
        scanDuration,
      },
      { new: true },
    );

    if (report) {
      await Metric.create({
        websiteId: website._id,
        reportId: report._id,
        date: new Date(),
        scores,
      });
    }

    emitScanProgress(reportId, {
      stage: 'completed',
      progress: 100,
      message: 'Intelligence report ready',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    await Report.findByIdAndUpdate(reportId, { status: 'failed', errorMessage: message });
    emitScanProgress(reportId, { stage: 'failed', progress: 0, message });
  } finally {
    setTimeout(() => cleanupScan(reportId), 60000);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
