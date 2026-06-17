import * as cheerio from 'cheerio';
import axios from 'axios';

export interface SeoAnalysisResult {
  findings: Record<string, unknown>;
  recommendations: string[];
  score: number;
}

export async function analyzeSeo(url: string, html: string): Promise<SeoAnalysisResult> {
  const $ = cheerio.load(html);
  const domain = new URL(url).origin;
  const recommendations: string[] = [];
  let score = 100;

  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';

  const headings = {
    h1: $('h1').length,
    h2: $('h2').length,
    h3: $('h3').length,
    h1Texts: $('h1')
      .map((_, el) => $(el).text().trim())
      .get()
      .slice(0, 5),
  };

  if (!title) {
    recommendations.push('Add a descriptive title tag');
    score -= 15;
  } else if (title.length < 30 || title.length > 60) {
    recommendations.push('Optimize title tag length (30-60 characters)');
    score -= 5;
  }

  if (!metaDescription) {
    recommendations.push('Add a meta description');
    score -= 15;
  } else if (metaDescription.length < 120 || metaDescription.length > 160) {
    recommendations.push('Optimize meta description length (120-160 characters)');
    score -= 5;
  }

  if (!ogTitle || !ogDescription) {
    recommendations.push('Add Open Graph tags for social sharing');
    score -= 10;
  }

  if (!twitterCard) {
    recommendations.push('Add Twitter Card meta tags');
    score -= 5;
  }

  if (!canonical) {
    recommendations.push('Add a canonical URL to prevent duplicate content');
    score -= 8;
  }

  if (headings.h1 === 0) {
    recommendations.push('Add exactly one H1 heading');
    score -= 12;
  } else if (headings.h1 > 1) {
    recommendations.push('Use only one H1 heading per page');
    score -= 8;
  }

  let robotsTxt = false;
  let sitemapXml = false;

  try {
    const robotsRes = await axios.get(`${domain}/robots.txt`, { timeout: 5000, validateStatus: () => true });
    robotsTxt = robotsRes.status === 200;
  } catch {
    robotsTxt = false;
  }

  try {
    const sitemapRes = await axios.get(`${domain}/sitemap.xml`, { timeout: 5000, validateStatus: () => true });
    sitemapXml = sitemapRes.status === 200;
  } catch {
    sitemapXml = false;
  }

  if (!robotsTxt) {
    recommendations.push('Create a robots.txt file');
    score -= 5;
  }

  if (!sitemapXml) {
    recommendations.push('Add a sitemap.xml for better crawlability');
    score -= 5;
  }

  const imagesWithoutAlt = $('img:not([alt])').length;
  if (imagesWithoutAlt > 0) {
    recommendations.push(`Add alt text to ${imagesWithoutAlt} images for SEO`);
    score -= Math.min(10, imagesWithoutAlt * 2);
  }

  return {
    findings: {
      title,
      metaDescription,
      canonical,
      openGraph: { title: ogTitle, description: ogDescription, image: ogImage },
      twitterCard,
      robotsTxt,
      sitemapXml,
      headings,
      imagesWithoutAlt,
    },
    recommendations,
    score: Math.max(0, Math.min(100, score)),
  };
}
