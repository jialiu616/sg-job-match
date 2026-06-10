#!/usr/bin/env node
/**
 * Scrape job listings from ShichengBBS forum.
 *
 * Sections:
 *  - Employer listings: https://www.shichengbbs.com/c47   (公司直招•非中介)
 *  - Job seeker listings: https://www.shichengbbs.com/c441 (狮城求职)
 *
 * Outputs:
 *  - public/data/employers.json
 *  - public/data/seekers.json
 *
 * Run: `node scripts/scrape-listings.mjs`
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');

const SOURCE_BASE = 'https://www.shichengbbs.com';
const SOURCE_PLATFORM = 'ShichengBBS';

const SECTIONS = [
  { type: 'employer', slug: 'c47', label: '公司直招•非中介' },
  { type: 'seeker', slug: 'c441', label: '狮城求职' },
];

const PAGES_PER_SECTION = 3;
const FRESHNESS_DAYS = 30;
const FRESHNESS_MS = FRESHNESS_DAYS * 86400000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Category -> Industry enum mapping
// ---------------------------------------------------------------------------
const categoryMap = {
  '餐饮': 'fnb', '服务员': 'fnb', '餐饮/服务员': 'fnb',
  '清洁': 'cleaning', '客房': 'cleaning', '清洁/客房': 'cleaning',
  '司机': 'driver', '配送': 'driver', '司机/配送': 'driver',
  '装修': 'construction', '水电': 'construction', '装修水电': 'construction',
  '美容': 'beauty', '美甲': 'beauty', '美容/美甲': 'beauty',
  '按摩': 'beauty', '推拿': 'beauty', '按摩/推拿/SPA': 'beauty',
  '仓库': 'logistics', '普工': 'logistics', '操作员': 'logistics', '仓库/普工/操作员': 'logistics',
  '销售': 'retail', '店员': 'retail', '客服': 'retail', '前台': 'retail', '销售/店员/客服': 'retail', '销售/前台': 'retail',
  '家政': 'childcare', '保姆': 'childcare', '月嫂': 'childcare',
  '保安': 'security',
  '教育': 'other', '营销': 'other', '会计': 'other', '计算机': 'other',
  '文秘': 'other', '运营': 'other', '夜店': 'other', '其他': 'other',
  '中醫': 'other', '機械': 'other', '設計': 'other', '网咖/网吧': 'other',
};

function mapIndustry(tags) {
  for (const tag of tags) {
    if (categoryMap[tag]) return categoryMap[tag];
  }
  // Try partial substring match
  for (const tag of tags) {
    for (const key of Object.keys(categoryMap)) {
      if (tag.includes(key)) return categoryMap[key];
    }
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// Title parsers — extract structured info from raw post titles
// ---------------------------------------------------------------------------

// Extract salary/budget from title.
// Patterns supported: $3000, 3000+, 2900-3600, 高达3600, 薪资可达$2300-2600
function extractSalary(title) {
  const patterns = [
    /\$?(\d{4,})\s*[-–~]\s*\$?(\d{4,})/, // range: 2900-3600
    /高达\$?(\d{4,})/,                     // 高达3600
    /薪资可达\$?(\d{4,})/,                 // 薪资可达$3000
    /\$(\d{4,})\+?/,                      // $3000+
    /(\d{4,})\+/,                          // 3600+
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      if (match[2]) {
        return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) };
      }
      const val = parseInt(match[1], 10);
      return { min: Math.round(val * 0.8), max: val };
    }
  }
  return { min: 0, max: 0 };
}

// Extract company/shop name from title using common Chinese hiring patterns.
function extractCompanyName(title) {
  const patterns = [
    /^(.{2,15}?)(?:聘请|招聘|诚招|诚聘|直招|需要|招)/,
    /^【(.+?)】/,
    /^(.{2,10}?(?:公司|店|餐厅|餐馆|酒店|集团|门店|摊位|工厂))/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1] && match[1].length >= 2 && match[1].length <= 20) {
      const generic = ['新加坡', '本地', '急', '高薪', '正规', '公司因业务发展'];
      if (!generic.some((g) => match[1] === g)) {
        return match[1].trim();
      }
    }
  }
  return '';
}

// Infer location from Singapore place-name keywords mentioned in the title.
function inferLocation(title) {
  const locationMap = {
    '兀兰': 'north', '义顺': 'north', '三巴旺': 'north', '杨厝港': 'north',
    '市中心': 'central', '牛车水': 'central', '乌节': 'central',
    '多美歌': 'central', '克拉码头': 'central', '莱佛士': 'central',
    '淡滨尼': 'east', '巴西立': 'east', '勿洛': 'east', '东海岸': 'east',
    '裕廊': 'west', '文礼': 'west', '武吉巴督': 'west', '金文泰': 'west',
    '黄埔': 'central', '欧南园': 'central', '淡冰尼': 'east',
  };

  for (const [keyword, location] of Object.entries(locationMap)) {
    if (title.includes(keyword)) {
      return location;
    }
  }
  return 'any';
}

// ---------------------------------------------------------------------------
// Relative timestamp parser
// ---------------------------------------------------------------------------
function parseRelativeTime(text) {
  const now = new Date();
  if (!text) return now.toISOString();
  const t = String(text).trim();

  if (t.includes('分钟前')) {
    const mins = parseInt(t, 10) || 0;
    return new Date(now.getTime() - mins * 60000).toISOString();
  }
  if (t.includes('小时前')) {
    const hours = parseInt(t, 10) || 0;
    return new Date(now.getTime() - hours * 3600000).toISOString();
  }
  if (t.includes('天前')) {
    const days = parseInt(t, 10) || 0;
    return new Date(now.getTime() - days * 86400000).toISOString();
  }
  if (t.includes('周前') || t.includes('星期前')) {
    const weeks = parseInt(t, 10) || 0;
    return new Date(now.getTime() - weeks * 7 * 86400000).toISOString();
  }
  if (t.includes('月前')) {
    const months = parseInt(t, 10) || 0;
    return new Date(now.getTime() - months * 30 * 86400000).toISOString();
  }
  // "置顶" (pinned) or anything unrecognised — assume "now"
  return now.toISOString();
}

// ---------------------------------------------------------------------------
// HTTP fetch with retries
// ---------------------------------------------------------------------------
async function fetchPage(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } catch (err) {
    if (attempt < 3) {
      console.error(`[retry ${attempt}] ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return fetchPage(url, attempt + 1);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Listing extraction
// ---------------------------------------------------------------------------
const POST_PATH_RE = /^\/(\d{6,})$/;
const TAG_PATH_RE = /^\/c\d+\?/;
const TIME_RE = /^(置顶|\d+\s*(分钟|小时|天|周|星期|月)前)$/;

function extractContact($, $scope) {
  // WhatsApp
  const waLink = $scope.find('a[href*="wa.me/"]').first();
  if (waLink.length) {
    const href = waLink.attr('href') || '';
    const m = href.match(/wa\.me\/(\+?\d+)/);
    if (m) return { contact: m[1], contact_type: 'whatsapp' };
  }
  // SMS
  const smsLink = $scope.find('a[href^="sms:"]').first();
  if (smsLink.length) {
    const href = smsLink.attr('href') || '';
    const m = href.match(/sms:(\+?\d+)/);
    if (m) return { contact: m[1], contact_type: 'sms' };
  }
  // tel:
  const telLink = $scope.find('a[href^="tel:"]').first();
  if (telLink.length) {
    const href = telLink.attr('href') || '';
    const m = href.match(/tel:(\+?\d+)/);
    if (m) return { contact: m[1], contact_type: 'phone' };
  }
  // Bare number in text
  const text = $scope.text();
  const numMatch = text.match(/\+?65?\s*\d{4}\s*\d{4}/);
  if (numMatch) {
    return {
      contact: numMatch[0].replace(/\s+/g, ''),
      contact_type: 'phone',
    };
  }
  return { contact: '', contact_type: 'phone' };
}

/**
 * Parse a section page. We treat the page as a flat list of nodes where each
 * post is represented by a link to /<id>, optionally followed by tag links
 * and a relative timestamp.
 */
function parseSection(html, type) {
  const $ = cheerio.load(html);
  const posts = [];
  const seen = new Set();

  // Find every link that points to /<digits>
  $('a').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const m = href.match(POST_PATH_RE);
    if (!m) return;

    const id = m[1];
    if (seen.has(id)) return;

    const title = $a.text().trim();
    if (!title) return;

    // Walk forward through siblings within the same parent looking for
    // tags, time, and contact info. Collect until we hit the next post link.
    const parent = $a.parent();
    const tags = [];
    let timeText = '';
    let contactInfo = { contact: '', contact_type: 'phone' };

    // Scope: from the link to either the next post link or end of parent.
    const $following = $a.nextAll();
    const collected = [];
    $following.each((__, n) => {
      const $n = $(n);
      const nHref = ($n.is('a') ? $n.attr('href') : '') || '';
      // Stop when we encounter another post link
      if (nHref && POST_PATH_RE.test(nHref)) return false;
      collected.push($n);
      return true;
    });

    // Also look at parent-level following siblings for short distance
    if (collected.length < 2) {
      let $p = parent.next();
      let steps = 0;
      while ($p.length && steps < 6) {
        const innerLink = $p.find('a[href]').filter((__, n) =>
          POST_PATH_RE.test($(n).attr('href') || '')
        );
        if (innerLink.length) break;
        collected.push($p);
        $p = $p.next();
        steps += 1;
      }
    }

    const $scope = $('<div></div>');
    collected.forEach(($n) => $scope.append($n.clone()));

    // Extract tags
    $scope.find('a').each((__, t) => {
      const $t = $(t);
      const tHref = $t.attr('href') || '';
      if (TAG_PATH_RE.test(tHref)) {
        const txt = $t.text().trim();
        if (txt && !tags.includes(txt)) tags.push(txt);
      }
    });

    // Extract time text
    const scopeText = $scope.text();
    const timeMatch = scopeText.match(/(置顶|\d+\s*(分钟|小时|天|周|星期|月)前)/);
    if (timeMatch) timeText = timeMatch[1];

    // Extract contact (within scope first, then on the link itself)
    contactInfo = extractContact($, $scope);
    if (!contactInfo.contact) {
      contactInfo = extractContact($, $a.parent());
    }

    seen.add(id);
    posts.push({
      id,
      title,
      tags,
      timeText,
      contact: contactInfo.contact,
      contact_type: contactInfo.contact_type,
      type,
    });
    return undefined;
  });

  return posts;
}

// ---------------------------------------------------------------------------
// Listing -> ScrapedListing transformation
// ---------------------------------------------------------------------------
function buildListing(raw, scrapedAt) {
  const posted_at = parseRelativeTime(raw.timeText);
  const industry = mapIndustry(raw.tags);
  const sourceUrl = `${SOURCE_BASE}/${raw.id}`;

  const base = {
    id: raw.id,
    title: raw.title,
    industry,
    tags: raw.tags,
    contact: raw.contact,
    contact_type: raw.contact_type,
    source_url: sourceUrl,
    source_platform: SOURCE_PLATFORM,
    posted_at,
    scraped_at: scrapedAt,
    type: raw.type,
  };

  const salary = extractSalary(raw.title);
  const companyName = extractCompanyName(raw.title);
  const location = inferLocation(raw.title);

  if (raw.type === 'employer') {
    return {
      ...base,
      company_name: companyName,
      job_title: raw.title,
      job_description: raw.title,
      required_skills: raw.tags,
      location,
      budget_min: salary.min,
      budget_max: salary.max,
      urgency: 'flexible',
    };
  }

  return {
    ...base,
    name: '',
    skills: raw.tags,
    experience_years: 0,
    location_preference: location,
    expected_salary_min: salary.min,
    expected_salary_max: salary.max,
    availability: 'immediate',
    bio: raw.title,
  };
}

// ---------------------------------------------------------------------------
// Main scrape loop
// ---------------------------------------------------------------------------
async function scrapeSection(section, scrapedAt) {
  const all = [];
  const seen = new Set();

  for (let page = 1; page <= PAGES_PER_SECTION; page += 1) {
    const url =
      page === 1
        ? `${SOURCE_BASE}/${section.slug}`
        : `${SOURCE_BASE}/${section.slug}?page=${page}`;
    try {
      console.log(`[fetch] ${url}`);
      const html = await fetchPage(url);
      const raw = parseSection(html, section.type);
      console.log(`  -> ${raw.length} posts`);
      for (const r of raw) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        all.push(r);
      }
    } catch (err) {
      console.error(`[error] failed to load ${url}: ${err.message}`);
      // Continue with the remaining pages
    }
  }

  const now = Date.now();
  const listings = all
    .map((r) => buildListing(r, scrapedAt))
    .filter((l) => {
      const ts = new Date(l.posted_at).getTime();
      return Number.isFinite(ts) && now - ts <= FRESHNESS_MS;
    });

  return listings;
}

async function writeOutput(filename, scrapedAt, listings) {
  const payload = {
    scraped_at: scrapedAt,
    source: SOURCE_BASE,
    total_count: listings.length,
    listings,
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, filename);
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[write] ${outPath} (${listings.length} listings)`);
}

async function main() {
  const scrapedAt = new Date().toISOString();
  console.log(`[start] scrape at ${scrapedAt}`);

  for (const section of SECTIONS) {
    try {
      const listings = await scrapeSection(section, scrapedAt);
      const file = section.type === 'employer' ? 'employers.json' : 'seekers.json';
      await writeOutput(file, scrapedAt, listings);
    } catch (err) {
      console.error(`[error] section ${section.slug} failed: ${err.message}`);
    }
  }

  console.log('[done]');
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
