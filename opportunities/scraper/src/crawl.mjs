import robotsParser from 'robots-parser';

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 30_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readLimitedBody(response, limit = MAX_RESPONSE_BYTES) {
  if (!response.body) throw new Error('Response had no readable body.');
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > limit) {
      await response.body.cancel().catch(() => {});
      throw new Error(`Response exceeded the ${limit} byte safety limit.`);
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function retryAfterMs(response, attempt) {
  const header = response.headers.get('retry-after');
  if (header) {
    if (/^\d+$/u.test(header.trim())) return Number(header.trim()) * 1000;
    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  return 750 * (2 ** attempt);
}

export function makeRobotsPolicy(robotsUrl, contents, userAgent) {
  const rules = robotsParser(robotsUrl, contents);
  return Object.freeze({
    isAllowed(url) {
      return rules.isAllowed(url, userAgent) !== false;
    },
  });
}

function looksLikeBlockPage(html) {
  const head = html.slice(0, 100_000);
  return /<title[^>]*>\s*(?:just a moment|access denied|security check|verify you are human)|cf-chl-|challenge-platform|enable javascript and cookies to continue|captcha challenge/iu.test(head);
}

export async function createCrawler({
  robotsUrl,
  userAgent,
  minDelayMs = 1100,
  timeoutMs = 15_000,
  fetchImpl = fetch,
}) {
  const sourceOrigin = new URL(robotsUrl).origin;
  let lastRequestAt = 0;
  let requestCount = 0;

  async function requestText(url, { robots = false } = {}) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const waitMs = Math.max(0, minDelayMs - (Date.now() - lastRequestAt));
      if (waitMs) await sleep(waitMs);
      lastRequestAt = Date.now();
      requestCount += 1;

      let response;
      try {
        response = await fetchImpl(url, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent': userAgent,
            Accept: robots ? 'text/plain, text/html;q=0.8' : 'text/html,application/xhtml+xml;q=0.9',
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (attempt >= MAX_RETRIES) throw new Error(`Request failed for ${url}: ${error.message}`, { cause: error });
        await sleep(750 * (2 ** attempt));
        continue;
      }

      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel().catch(() => {});
        throw new Error(`Redirect refused for ${url}; no cross-page redirect was followed.`);
      }

      if (RETRYABLE_STATUS.has(response.status)) {
        const wait = retryAfterMs(response, attempt);
        await response.body?.cancel().catch(() => {});
        if (attempt >= MAX_RETRIES) throw new Error(`HTTP ${response.status} after ${MAX_RETRIES} retries for ${url}.`);
        if (wait > MAX_RETRY_AFTER_MS) throw new Error(`Server requested a retry delay over ${MAX_RETRY_AFTER_MS}ms; stopped for ${url}.`);
        await sleep(wait);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new Error(`HTTP ${response.status} for ${url}.`);
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (robots ? !/(text\/plain|text\/html)/iu.test(contentType) : !/(text\/html|application\/xhtml\+xml)/iu.test(contentType)) {
        await response.body?.cancel().catch(() => {});
        throw new Error(`Unexpected content type for ${url}: ${contentType || 'missing'}.`);
      }
      return await readLimitedBody(response);
    }
    throw new Error(`Request retry limit reached for ${url}.`);
  }

  const robotsText = await requestText(robotsUrl, { robots: true });
  const policy = makeRobotsPolicy(robotsUrl, robotsText, userAgent);

  return Object.freeze({
    async fetchHtml(url) {
      const parsed = new URL(url);
      if (parsed.origin !== sourceOrigin) throw new Error(`Refusing to crawl outside source origin: ${parsed.origin}`);
      if (!policy.isAllowed(url)) throw new Error(`Robots policy disallows ${url}; no request was sent.`);
      const html = await requestText(url);
      if (looksLikeBlockPage(html)) throw new Error(`Possible anti-bot or access-control page at ${url}; stopped without bypassing it.`);
      return html;
    },
    get requestCount() {
      return requestCount;
    },
  });
}
