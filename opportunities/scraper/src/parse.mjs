import { load } from 'cheerio';
import {
  canonicalizeUrl,
  classifyCategory,
  cleanText,
  inferWorkMode,
  regionFromCategorySlugs,
  stableId,
} from './normalize.mjs';

const DISCOVERY_FLAGS = Object.freeze([
  'pending_provider_verification',
  'source_is_secondary_listing',
]);

function normalizeDate(value) {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? text.slice(0, 120) : new Date(parsed).toISOString();
}

function normalizeDeadline(value) {
  const text = cleanText(value);
  if (!text || /\b(not stated|not specified|not provided|no deadline|to be announced|tba|unknown)\b/iu.test(text)) return null;
  if (/\b(rolling|ongoing|open until filled)\b/iu.test(text)) return text.slice(0, 120);
  return normalizeDate(text);
}

function titleFromCard($, card, articleUrl) {
  const heading = card.find('h1, h2, h3, h4, h5, h6, .entry-title, .et_pb_slide_title').first();
  const headingText = cleanText(heading.text());
  if (headingText && !/^(read more|learn more|more info)$/iu.test(headingText)) return headingText;

  const linkText = cleanText(card.find(`a[href="${articleUrl}"]`).first().text());
  if (linkText && !/^(read more|learn more|more info)$/iu.test(linkText)) return linkText;

  const slug = new URL(articleUrl).pathname.split('/').filter(Boolean).at(-1) ?? '';
  return cleanText(decodeURIComponent(slug.replace(/[-_]+/gu, ' ')));
}

function categorySlugsFromCard($, card) {
  const slugs = new Set();
  for (const className of String(card.attr('class') ?? '').split(/\s+/u)) {
    if (className.startsWith('category-')) slugs.add(className.slice('category-'.length));
  }
  card.find('a[href*="/category/"]').each((_, anchor) => {
    const url = canonicalizeUrl($(anchor).attr('href'), 'https://opportunitiesforyouth.org/');
    if (!url) return;
    const match = new URL(url).pathname.match(/\/category\/([^/]+)/u);
    if (match) slugs.add(match[1]);
  });
  return [...slugs];
}

function summaryFromCard($, card, maxLength) {
  const selectors = ['.entry-summary', '.post-content', '.et_pb_slide_content', '.entry-content', '.post-excerpt'];
  for (const selector of selectors) {
    const candidate = cleanText(card.find(selector).first().text());
    if (candidate.length >= 30) return candidate.slice(0, maxLength);
  }
  return null;
}

export function parseListingPage(html, { source, discoveredAt = new Date().toISOString(), maxCards = 20 } = {}) {
  const $ = load(html);
  const cards = $('article').length ? $('article') : $('.post.hentry');
  const records = [];
  const seen = new Set();

  cards.each((_, element) => {
    if (records.length >= maxCards) return;
    const card = $(element);
    const candidateLinks = card.find('a[href]').toArray();
    const articleAnchor = candidateLinks.find((anchor) => {
      const url = canonicalizeUrl($(anchor).attr('href'), source.homepageUrl);
      if (!url || new URL(url).origin !== source.origin) return false;
      const path = new URL(url).pathname;
      return /^\/20\d{2}\/\d{1,2}\/\d{1,2}\//u.test(path)
        || (!/\/(category|tag|author|page|wp-content)\//u.test(path) && path !== '/');
    });
    if (!articleAnchor) return;

    const sourceLink = canonicalizeUrl($(articleAnchor).attr('href'), source.homepageUrl);
    if (!sourceLink || seen.has(sourceLink)) return;
    const title = titleFromCard($, card, sourceLink);
    if (!title || title.length < 5) return;
    seen.add(sourceLink);

    const categorySlugs = categorySlugsFromCard($, card);
    const cardText = cleanText(card.text());
    const description = summaryFromCard($, card, source.summaryMaxLength);
    const publishedAt = normalizeDate(card.find('time[datetime]').first().attr('datetime'));
    const region = regionFromCategorySlugs(categorySlugs);
    const category = classifyCategory(`${title} ${description ?? ''}`, categorySlugs);

    records.push({
      id: stableId(source.id, sourceLink),
      title,
      organization: null,
      category,
      description,
      eligibility: null,
      location: region ?? (/\b(worldwide|global|all countries)\b/iu.test(cardText) ? 'Worldwide' : null),
      applicationLink: null,
      applicationLinkCandidates: [],
      sourceName: source.name,
      sourceLink,
      deadline: null,
      publicationDate: publishedAt,
      discoveredAt,
      lastUpdatedAt: discoveredAt,
      status: 'pending_verification',
      workMode: inferWorkMode(`${title} ${description ?? ''}`),
      fundingDetails: null,
      verificationFlags: [...DISCOVERY_FLAGS, 'detail_page_not_checked'],
      sourceCategorySlugs: categorySlugs,
    });
  });

  return records;
}

function valueForLabel($, content, pattern) {
  let result = null;
  content.find('tr').each((_, row) => {
    const cells = $(row).children('th, td');
    if (cells.length < 2) return;
    const label = cleanText(cells.eq(0).text()).replace(/[:：]$/u, '');
    if (pattern.test(label)) result = cleanText(cells.eq(1).text());
  });
  if (result) return result;

  content.find('p, li').each((_, element) => {
    if (result) return;
    const text = cleanText($(element).text());
    const match = text.match(/^([^:：]{2,60})[:：]\s*(.+)$/u);
    if (match && pattern.test(match[1])) result = cleanText(match[2]);
  });
  return result;
}

function sectionForHeading($, content, pattern, maxLength) {
  let result = null;
  content.find('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    if (result) return;
    if (!pattern.test(cleanText($(heading).text()))) return;
    const parts = [];
    let sibling = $(heading).next();
    while (sibling.length && !sibling.is('h1, h2, h3, h4, h5, h6')) {
      const text = cleanText(sibling.text());
      if (text) parts.push(text);
      sibling = sibling.next();
    }
    const text = cleanText(parts.join(' '));
    if (text) result = text.slice(0, maxLength);
  });
  return result;
}

function applicationLinks($, content, sourceOrigin) {
  const candidates = [];
  const seen = new Set();
  content.find('a[href]').each((_, anchor) => {
    const href = canonicalizeUrl($(anchor).attr('href'), sourceOrigin);
    if (!href) return;
    const url = new URL(href);
    if (url.origin === sourceOrigin) return;
    if (/(^|\.)(facebook|instagram|youtube|youtu\.be|twitter|x\.com|linkedin|tiktok|whatsapp|reddit|pinterest|telegram)\./iu.test(url.hostname)) return;
    if (/(?:^|\/)(share|submit|intent|sharer|tweet|pin)(?:\/|$)/iu.test(url.pathname)) return;
    const label = cleanText($(anchor).text()).slice(0, 160);
    const labelStrong = /\b(apply|application|submit|official website|application portal|register now|nomination form)\b/iu.test(label);
    const pathStrong = /\/(apply|application|admissions|nomination|registration|register|forms?)(?:[-_/?.]|$)/iu.test(url.pathname);
    const strongMatch = labelStrong || pathStrong;
    const weakMatch = /\b(click here|learn more|more information|visit website)\b/iu.test(label);
    if (!strongMatch && !weakMatch) return;
    if (seen.has(href)) return;
    seen.add(href);
    candidates.push({ url: href, label, matchStrength: strongMatch ? 'strong' : 'weak', verified: false });
  });
  candidates.sort((a, b) => Number(b.matchStrength === 'strong') - Number(a.matchStrength === 'strong'));
  return candidates.slice(0, 8);
}

function firstParagraph($, content, maxLength) {
  let result = null;
  content.find('p').each((_, paragraph) => {
    if (result) return;
    const text = cleanText($(paragraph).text());
    if (text.length > 50) result = text.slice(0, maxLength);
  });
  return result;
}

export function parseDetailPage(html, listing, { source, updatedAt = new Date().toISOString() } = {}) {
  const $ = load(html);
  const article = $('article').first().length ? $('article').first() : $('main').first();
  const content = article.find('.entry-content').first().length
    ? article.find('.entry-content').first()
    : article;
  const allText = cleanText(content.text());
  const detailTitle = cleanText(article.find('h1.entry-title, h1').first().text()) || listing.title;

  const organization = valueForLabel($, content, /\b(organization|organiser|organizer|host institution|institution|employer|provider|company)\b/iu);
  const location = valueForLabel($, content, /\b(country|location|host country|venue)\b/iu) ?? listing.location;
  const rawDeadline = valueForLabel($, content, /\b(application deadline|deadline|closing date|apply by|applications close)\b/iu);
  const deadline = normalizeDeadline(rawDeadline);
  const fundingDetails = valueForLabel($, content, /\b(funding|financial support|stipend|award|benefits|scholarship value)\b/iu);
  const eligibility = sectionForHeading($, content, /\b(eligibility|who can apply|requirements|qualifications)\b/iu, source.eligibilityMaxLength)
    ?? valueForLabel($, content, /\b(eligibility|eligible applicants|who can apply)\b/iu);
  const candidates = applicationLinks($, content, source.origin);
  const applicationLink = candidates.find((candidate) => candidate.matchStrength === 'strong')?.url ?? null;
  const description = firstParagraph($, content, source.summaryMaxLength) ?? listing.description;
  const publishedValue = $('meta[property="article:published_time"]').attr('content')
    ?? article.find('time[datetime]').first().attr('datetime')
    ?? listing.publicationDate;
  const publicationDate = normalizeDate(publishedValue);
  const category = classifyCategory(detailTitle, listing.sourceCategorySlugs ?? []);
  const workMode = inferWorkMode(`${detailTitle} ${allText}`);
  const verificationFlags = new Set(listing.verificationFlags ?? DISCOVERY_FLAGS);
  verificationFlags.delete('detail_page_not_checked');
  verificationFlags.add('pending_provider_verification');
  verificationFlags.add('source_is_secondary_listing');
  verificationFlags.add('official_application_link_not_verified');
  if (!organization) verificationFlags.add('organization_not_extracted');
  if (!location) verificationFlags.add('location_not_extracted');
  if (!deadline) verificationFlags.add('deadline_not_extracted');
  if (!eligibility) verificationFlags.add('eligibility_not_extracted');
  if (!applicationLink) verificationFlags.add('application_link_not_identified');

  return {
    ...listing,
    title: detailTitle,
    organization: organization?.slice(0, 200) ?? null,
    category,
    description,
    eligibility: eligibility?.slice(0, source.eligibilityMaxLength) ?? null,
    location: location?.slice(0, 200) ?? null,
    applicationLink,
    applicationLinkCandidates: candidates,
    deadline,
    publicationDate,
    lastUpdatedAt: updatedAt,
    workMode,
    fundingDetails: fundingDetails?.slice(0, source.fundingMaxLength) ?? null,
    verificationFlags: [...verificationFlags],
    status: 'pending_verification',
  };
}
