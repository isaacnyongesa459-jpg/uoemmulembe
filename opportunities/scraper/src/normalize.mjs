import { createHash } from 'node:crypto';

export const OPPORTUNITY_CATEGORIES = Object.freeze([
  'jobs',
  'scholarships',
  'fellowships',
  'grants_funding',
  'volunteering',
  'technology',
  'courses_training',
  'entrepreneurship_startups',
  'conferences_programs',
  'other',
]);

export function cleanText(value) {
  return String(value ?? '')
    .replace(/[\u00a0\u2007\u202f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function canonicalizeUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';

    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/iu.test(key) || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function stableId(sourceId, sourceUrl) {
  return createHash('sha256').update(`${sourceId}\n${sourceUrl}`).digest('hex');
}

export function classifyCategory(text, sourceCategorySlugs = []) {
  const categoryValue = cleanText(sourceCategorySlugs.join(' ')).toLowerCase().replace(/[_-]+/gu, ' ');
  const categoryRules = [
    ['jobs', /\b(job|jobs|internship|internships|employment|career)\b/u],
    ['scholarships', /\b(scholarship|scholarships|bursary|bursaries)\b/u],
    ['fellowships', /\b(fellowship|fellowships)\b/u],
    ['grants_funding', /\b(grant|grants|funding)\b/u],
    ['volunteering', /\b(volunteer|volunteering)\b/u],
    ['technology', /\b(technology|hackathon|coding|developer)\b/u],
    ['courses_training', /\b(courses?|training|workshops?|summer schools?)\b/u],
    ['entrepreneurship_startups', /\b(entrepreneurship|startup|start up)\b/u],
    ['conferences_programs', /\b(conferences?|international programs?|international programmes?)\b/u],
  ];
  const explicitCategory = categoryRules.find(([, pattern]) => pattern.test(categoryValue))?.[0];
  if (explicitCategory) return explicitCategory;

  const value = cleanText(text).toLowerCase().replace(/[_-]+/gu, ' ');
  const rules = [
    ['technology', /\b(hackathon|coding challenge|developer program|technology challenge|tech program)\b/u],
    ['entrepreneurship_startups', /\b(entrepreneur|entrepreneurship|startup|start up|business accelerator)\b/u],
    ['volunteering', /\b(volunteer|volunteering)\b/u],
    ['scholarships', /\b(scholarship|scholarships|bursary|bursaries)\b/u],
    ['fellowships', /\b(fellowship|fellowships)\b/u],
    ['grants_funding', /\b(grant|grants|funding|seed fund)\b/u],
    ['courses_training', /\b(online courses?|short courses?|training|workshops?|summer schools?)\b/u],
    ['jobs', /\b(job|jobs|employment|career|internship|internships|graduate trainee|recruitment)\b/u],
    ['conferences_programs', /\b(conferences?|international programs?|international programmes?|exchange programs?|exchange programmes?)\b/u],
  ];

  return rules.find(([, pattern]) => pattern.test(value))?.[0] ?? 'other';
}

export function inferWorkMode(text) {
  const value = cleanText(text).toLowerCase();
  if (/\bhybrid\b/u.test(value)) return 'hybrid';
  if (/\b(remote|fully online|online program|online programme|work from anywhere|virtual)\b/u.test(value)) return 'remote';
  if (/\b(on.site|in.person|onsite|in-person)\b/u.test(value)) return 'onsite';
  return 'unknown';
}

export function regionFromCategorySlugs(slugs = []) {
  const names = new Map([
    ['africa', 'Africa'],
    ['america', 'Americas'],
    ['north-america', 'North America'],
    ['south-america', 'South America'],
    ['asia', 'Asia'],
    ['australia-and-oceania', 'Australia and Oceania'],
    ['europe', 'Europe'],
    ['latin-america-and-the-caribbean', 'Latin America and the Caribbean'],
    ['middle-east', 'Middle East'],
    ['middle-east-and-north-africa', 'Middle East and North Africa'],
  ]);
  const regions = [...new Set(slugs.map((slug) => names.get(slug)).filter(Boolean))];
  if (regions.length === 0) return null;
  if (regions.length > 4) return 'Multiple regions';
  return regions.join(', ');
}
