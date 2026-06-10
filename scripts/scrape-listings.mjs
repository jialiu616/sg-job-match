#!/usr/bin/env node
/**
 * Scrape job listings from Singapore Chinese-language forums.
 *
 * Sources:
 *   1. ShichengBBS  (shichengbbs.com)   — flat post-id link format
 *   2. ShichengLuntan (shichengluntan.com) — same structure as ShichengBBS
 *   3. ShichengBao  (shichengbao.com)   — Discuz forum format
 *
 * Outputs:
 *   - public/data/employers.json
 *   - public/data/seekers.json
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

const FRESHNESS_DAYS = 30;
const FRESHNESS_MS = FRESHNESS_DAYS * 86400000;
const REQUEST_DELAY_MS = 1500;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Source configuration — each source can expose employer and/or seeker pages
// and chooses the parser that matches its HTML structure.
// ---------------------------------------------------------------------------
const SOURCES = [
  {
    name: 'ShichengBBS',
    platform: 'ShichengBBS',
    baseUrl: 'https://www.shichengbbs.com',
    employerPaths: ['/c47', '/c47?page=2', '/c47?page=3'],
    seekerPaths: ['/c441', '/c441?page=2', '/c441?page=3'],
    parser: 'shicheng',
  },
  {
    name: 'ShichengLuntan',
    platform: 'ShichengLuntan',
    baseUrl: 'https://www.shichengluntan.com',
    employerPaths: ['/c47', '/c47?page=2', '/c47?page=3'],
    seekerPaths: ['/c210', '/c210?page=2', '/c210?page=3'],
    parser: 'shicheng',
  },
  {
    name: 'ShichengBao',
    platform: 'ShichengBao',
    baseUrl: 'https://www.shichengbao.com',
    employerPaths: [
      '/forum.php?mod=forumdisplay&fid=69',
      '/forum.php?mod=forumdisplay&fid=69&page=2',
      '/forum.php?mod=forumdisplay&fid=69&page=3',
    ],
    seekerPaths: [],
    parser: 'discuz',
  },
];

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
  for (const tag of tags) {
    for (const key of Object.keys(categoryMap)) {
      if (tag.includes(key)) return categoryMap[key];
    }
  }
  return 'other';
}

// Infer industry from raw title text (used when no tags are available).
function inferIndustryFromTitle(title) {
  for (const key of Object.keys(categoryMap)) {
    if (title.includes(key)) return categoryMap[key];
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// Title parsers — extract structured info from raw post titles
// ---------------------------------------------------------------------------
function extractSalary(title) {
  const patterns = [
    /\$?(\d{4,})\s*[-–~]\s*\$?(\d{4,})/,
    /高达\$?(\d{4,})/,
    /薪资可达\$?(\d{4,})/,
    /\$(\d{4,})\+?/,
    /(\d{4,})\+/,
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
// Timestamp parsers
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
  return now.toISOString();
}

// Parse Discuz-style timestamps:
//   2026-6-10        (absolute date)
//   2026-6-10 14:30  (absolute datetime)
//   昨天 14:30      (yesterday)
//   前天 09:15      (day before yesterday)
//   半小时前        (relative)
//   3 天前          (relative)
function parseDiscuzTime(text) {
  const now = new Date();
  if (!text) return now.toISOString();
  const t = String(text).trim();

  // Absolute date e.g. 2026-6-10 or 2026-06-10 14:30
  const absMatch = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (absMatch) {
    const [, y, mo, d, hh, mm] = absMatch;
    const dt = new Date(
      Date.UTC(
        parseInt(y, 10),
        parseInt(mo, 10) - 1,
        parseInt(d, 10),
        hh ? parseInt(hh, 10) : 0,
        mm ? parseInt(mm, 10) : 0
      )
    );
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  if (t.includes('昨天')) {
    return new Date(now.getTime() - 86400000).toISOString();
  }
  if (t.includes('前天')) {
    return new Date(now.getTime() - 2 * 86400000).toISOString();
  }
  if (t.includes('半小时前')) {
    return new Date(now.getTime() - 30 * 60000).toISOString();
  }

  // Fallback to relative parser
  return parseRelativeTime(t);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Contact extraction (shared)
// ---------------------------------------------------------------------------
function extractContact($, $scope) {
  const waLink = $scope.find('a[href*="wa.me/"]').first();
  if (waLink.length) {
    const href = waLink.attr('href') || '';
    const m = href.match(/wa\.me\/(\+?\d+)/);
    if (m) return { contact: m[1], contact_type: 'whatsapp' };
  }
  const smsLink = $scope.find('a[href^="sms:"]').first();
  if (smsLink.length) {
    const href = smsLink.attr('href') || '';
    const m = href.match(/sms:(\+?\d+)/);
    if (m) return { contact: m[1], contact_type: 'sms' };
  }
  const telLink = $scope.find('a[href^="tel:"]').first();
  if (telLink.length) {
    const href = telLink.attr('href') || '';
    const m = href.match(/tel:(\+?\d+)/);
    if (m) return { contact: m[1], contact_type: 'phone' };
  }
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

// ---------------------------------------------------------------------------
// Parser: ShichengBBS / ShichengLuntan flat-link format
// ---------------------------------------------------------------------------
const POST_PATH_RE = /^\/(\d{6,})$/;
const TAG_PATH_RE = /^\/c\d+\?/;

function parseShichengSection(html, type) {
  const $ = cheerio.load(html);
  const posts = [];
  const seen = new Set();

  $('a').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const m = href.match(POST_PATH_RE);
    if (!m) return;

    const id = m[1];
    if (seen.has(id)) return;

    const title = $a.text().trim();
    if (!title) return;

    const parent = $a.parent();
    const tags = [];
    let timeText = '';
    let contactInfo = { contact: '', contact_type: 'phone' };

    const $following = $a.nextAll();
    const collected = [];
    $following.each((__, n) => {
      const $n = $(n);
      const nHref = ($n.is('a') ? $n.attr('href') : '') || '';
      if (nHref && POST_PATH_RE.test(nHref)) return false;
      collected.push($n);
      return true;
    });

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

    $scope.find('a').each((__, t) => {
      const $t = $(t);
      const tHref = $t.attr('href') || '';
      if (TAG_PATH_RE.test(tHref)) {
        const txt = $t.text().trim();
        if (txt && !tags.includes(txt)) tags.push(txt);
      }
    });

    const scopeText = $scope.text();
    const timeMatch = scopeText.match(/(置顶|\d+\s*(分钟|小时|天|周|星期|月)前)/);
    if (timeMatch) timeText = timeMatch[1];

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
      timeFormat: 'relative',
      contact: contactInfo.contact,
      contact_type: contactInfo.contact_type,
      type,
      pathTemplate: `/${id}`,
    });
    return undefined;
  });

  return posts;
}

// ---------------------------------------------------------------------------
// Parser: Discuz forum (ShichengBao)
// ---------------------------------------------------------------------------
const DISCUZ_THREAD_RE = /thread-(\d+)-\d+-\d+\.html/;

function parseDiscuzSection(html, type) {
  const $ = cheerio.load(html);
  const posts = [];
  const seen = new Set();

  $('a').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const m = href.match(DISCUZ_THREAD_RE);
    if (!m) return;

    const id = m[1];
    if (seen.has(id)) return;

    const title = $a.text().trim();
    // Discuz listings use multiple thread links per row (subject + comment shortcut).
    // Skip non-title entries (digits-only, very short, generic labels).
    if (!title || title.length < 4) return;
    if (/^\d+$/.test(title)) return;
    if (/^(回复|查看|新窗|New)$/i.test(title)) return;

    // Walk up to find the row container holding the post metadata
    let $row = $a.closest('tbody');
    if (!$row.length) $row = $a.closest('tr');
    if (!$row.length) $row = $a.parent().parent();

    const tags = [];
    // Discuz prefixes a category in [brackets] inside the title cell, e.g. [餐饮]
    const titleCell = $a.closest('th, td');
    if (titleCell.length) {
      const cellText = titleCell.text();
      const tagMatches = cellText.match(/\[([^\[\]]{1,12})\]/g);
      if (tagMatches) {
        for (const tm of tagMatches) {
          const inner = tm.slice(1, -1).trim();
          if (inner && !tags.includes(inner)) tags.push(inner);
        }
      }
      // Look for explicit `<a class="xi1">tag</a>` style anchors
      titleCell.find('a').each((__, t) => {
        const $t = $(t);
        const tHref = $t.attr('href') || '';
        if (/typeid=/.test(tHref) || /forum-\d+-\d+\.html/.test(tHref)) {
          const txt = $t.text().trim().replace(/^\[|\]$/g, '');
          if (txt && txt.length <= 12 && !tags.includes(txt)) tags.push(txt);
        }
      });
    }

    // Extract date — Discuz typically renders date in `<em>` or `.by` columns.
    let timeText = '';
    const rowText = $row.text();
    const dateMatch = rowText.match(
      /(?:昨天|前天)\s*\d{1,2}:\d{1,2}|半小时前|\d+\s*(?:分钟|小时|天)前|\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{1,2})?/
    );
    if (dateMatch) timeText = dateMatch[0];

    seen.add(id);
    posts.push({
      id,
      title,
      tags,
      timeText,
      timeFormat: 'discuz',
      contact: '',
      contact_type: 'phone',
      type,
      pathTemplate: `/thread-${id}-1-1.html`,
    });
    return undefined;
  });

  return posts;
}

// ---------------------------------------------------------------------------
// Listing -> ScrapedListing transformation
// ---------------------------------------------------------------------------
function buildListing(raw, source, scrapedAt) {
  const posted_at =
    raw.timeFormat === 'discuz'
      ? parseDiscuzTime(raw.timeText)
      : parseRelativeTime(raw.timeText);
  const industry = raw.tags.length
    ? mapIndustry(raw.tags)
    : inferIndustryFromTitle(raw.title);
  const sourceUrl = `${source.baseUrl}${raw.pathTemplate}`;

  const base = {
    id: `${source.platform}-${raw.id}`,
    title: raw.title,
    industry,
    tags: raw.tags,
    contact: raw.contact,
    contact_type: raw.contact_type,
    source_url: sourceUrl,
    source_platform: source.platform,
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
// Per-source scraping
// ---------------------------------------------------------------------------
function selectParser(name) {
  if (name === 'discuz') return parseDiscuzSection;
  return parseShichengSection;
}

async function scrapeSourcePaths(source, paths, type, scrapedAt) {
  const parser = selectParser(source.parser);
  const all = [];
  const seen = new Set();
  let pageCount = 0;

  for (const p of paths) {
    const url = `${source.baseUrl}${p}`;
    try {
      console.log(`[fetch] ${url}`);
      const html = await fetchPage(url);
      const raw = parser(html, type);
      console.log(`  -> ${raw.length} posts`);
      pageCount += 1;
      for (const r of raw) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        all.push(r);
      }
    } catch (err) {
      console.warn(`[warn] ${source.name} failed to load ${url}: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (pageCount === 0) {
    console.warn(`[warn] ${source.name}: no pages fetched for ${type}`);
  }

  const now = Date.now();
  const listings = all
    .map((r) => buildListing(r, source, scrapedAt))
    .filter((l) => {
      const ts = new Date(l.posted_at).getTime();
      return Number.isFinite(ts) && now - ts <= FRESHNESS_MS;
    });

  return listings;
}

async function scrapeSource(source, scrapedAt) {
  console.log(`\n[source] ${source.name} (${source.baseUrl})`);
  const employerListings = source.employerPaths.length
    ? await scrapeSourcePaths(source, source.employerPaths, 'employer', scrapedAt)
    : [];
  const seekerListings = source.seekerPaths.length
    ? await scrapeSourcePaths(source, source.seekerPaths, 'seeker', scrapedAt)
    : [];

  console.log(
    `[source] ${source.name}: ${employerListings.length} employer / ${seekerListings.length} seeker (post-freshness)`
  );

  return { employer: employerListings, seeker: seekerListings };
}

// ---------------------------------------------------------------------------
// Cross-source deduplication
// ---------------------------------------------------------------------------
function normalizeForHash(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function dedupeListings(listings) {
  const seen = new Set();
  const out = [];
  let dropped = 0;
  for (const l of listings) {
    const key = `${normalizeForHash(l.title)}|${normalizeForHash(l.contact)}`;
    if (seen.has(key)) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    out.push(l);
  }
  if (dropped > 0) {
    console.log(`[dedupe] dropped ${dropped} duplicate listings`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
async function writeOutput(filename, scrapedAt, listings, sources) {
  const payload = {
    scraped_at: scrapedAt,
    sources: sources.map((s) => ({ name: s.platform, base_url: s.baseUrl })),
    total_count: listings.length,
    listings,
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, filename);
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[write] ${outPath} (${listings.length} listings)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const scrapedAt = new Date().toISOString();
  console.log(`[start] scrape at ${scrapedAt}`);

  const employersAll = [];
  const seekersAll = [];
  const perSourceCount = [];

  for (const source of SOURCES) {
    try {
      const { employer, seeker } = await scrapeSource(source, scrapedAt);
      employersAll.push(...employer);
      seekersAll.push(...seeker);
      perSourceCount.push({
        name: source.name,
        employer: employer.length,
        seeker: seeker.length,
      });
    } catch (err) {
      console.warn(`[warn] source ${source.name} failed: ${err.message}`);
      perSourceCount.push({
        name: source.name,
        employer: 0,
        seeker: 0,
        error: err.message,
      });
    }
  }

  const employersDeduped = dedupeListings(employersAll);
  const seekersDeduped = dedupeListings(seekersAll);

  await writeOutput('employers.json', scrapedAt, employersDeduped, SOURCES);
  await writeOutput('seekers.json', scrapedAt, seekersDeduped, SOURCES);

  console.log('\n[summary] per-source counts:');
  for (const c of perSourceCount) {
    const errPart = c.error ? ` ERROR: ${c.error}` : '';
    console.log(
      `  - ${c.name}: ${c.employer} employer / ${c.seeker} seeker${errPart}`
    );
  }
  console.log(
    `[summary] combined (after dedupe): ${employersDeduped.length} employer / ${seekersDeduped.length} seeker`
  );
  console.log('[done]');
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
