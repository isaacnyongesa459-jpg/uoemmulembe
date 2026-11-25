(() => {
  'use strict';

  const root = document.querySelector('[data-opportunities-app]');
  if (!root) return;

  const form = root.querySelector('[data-opportunity-filters]');
  const results = root.querySelector('[data-opportunity-results]');
  const status = root.querySelector('[data-opportunity-status]');
  const count = root.querySelector('[data-opportunity-count]');
  const pagination = root.querySelector('[data-opportunity-pagination]');
  const pageLabel = root.querySelector('[data-opportunity-page]');
  const previousButton = root.querySelector('[data-opportunity-previous]');
  const nextButton = root.querySelector('[data-opportunity-next]');
  const submitButton = root.querySelector('[data-opportunity-submit]');
  const dialog = document.querySelector('[data-opportunity-dialog]');
  const dialogTitle = dialog?.querySelector('#opportunity-dialog-title');
  const dialogContent = dialog?.querySelector('[data-opportunity-detail-content]');
  const dialogClose = dialog?.querySelector('[data-opportunity-dialog-close]');
  const CATEGORY_LABELS = {
    jobs: 'Jobs',
    scholarships: 'Scholarships',
    fellowships: 'Fellowships',
    grants_funding: 'Grants & funding',
    volunteering: 'Volunteering',
    technology: 'Technology',
    courses_training: 'Courses & training',
    entrepreneurship_startups: 'Entrepreneurship & startups',
    conferences_programs: 'Conferences & programs',
    other: 'Other'
  };
  let apiBase = '';
  let pageSize = 10;
  let currentPage = 1;
  let pageCount = 0;
  let listController = null;
  let detailController = null;
  let lastDetailTrigger = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null && String(text).trim()) element.textContent = String(text);
    return element;
  }

  function setStatus(message, state = 'info') {
    status.dataset.state = state;
    status.textContent = message;
    status.hidden = !message;
  }

  function allowedExternalUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function externalLink(label, value, className = 'button button-soft') {
    const href = allowedExternalUrl(value);
    if (!href) return null;
    const link = node('a', className, label);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${label} (opens in a new tab)`);
    link.append(document.createTextNode(' ↗'));
    return link;
  }

  function formatDeadline(value) {
    if (typeof value !== 'string' || !value) return 'Not specified';
    const parsed = /^\d{4}-\d{2}-\d{2}$/u.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(parsed);
  }

  function renderOpportunity(record) {
    const article = node('article', 'opportunity-card');
    const meta = node('div', 'opportunity-card-meta');
    const category = node('span', 'opportunity-category', CATEGORY_LABELS[record.category] || record.category || 'Opportunity');
    meta.append(category);
    if (record.workMode) meta.append(node('span', 'opportunity-work-mode', record.workMode.replace(/_/gu, ' ')));
    article.append(meta);

    const title = node('h3', 'opportunity-card-title', record.title || 'Opportunity');
    article.append(title);
    const organization = record.organization ? node('p', 'opportunity-organization', record.organization) : null;
    if (organization) article.append(organization);
    const summary = node('p', 'opportunity-summary', record.description || 'Open the listing to review its full details and requirements.');
    article.append(summary);

    const facts = node('dl', 'opportunity-facts');
    [
      ['Location', record.location],
      ['Deadline', formatDeadline(record.deadline)],
      ['Funding', record.fundingDetails]
    ].forEach(([label, value]) => {
      if (!value || !String(value).trim()) return;
      facts.append(node('dt', '', label), node('dd', '', value));
    });
    if (facts.childElementCount) article.append(facts);

    const actions = node('div', 'opportunity-card-actions');
    const detailButton = node('button', 'button button-soft', 'View verified details');
    detailButton.type = 'button';
    detailButton.dataset.openOpportunity = '';
    detailButton.dataset.opportunityId = String(record.id || '');
    detailButton.disabled = !record.id;
    actions.append(detailButton);
    const application = externalLink('Apply on provider site', record.applicationLink);
    if (application) actions.append(application);
    const source = externalLink(record.sourceName ? `Source: ${record.sourceName}` : 'View source', record.sourceLink, 'opportunity-source-link');
    if (source) actions.append(source);
    article.append(actions);
    return article;
  }

  function buildFilterParams() {
    const values = new FormData(form);
    const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
    ['q', 'category', 'country', 'deadlineBefore', 'remote'].forEach(key => {
      const value = String(values.get(key) || '').trim();
      if (value) params.set(key, value);
    });
    return params;
  }

  async function requestJson(url, signal) {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('The opportunities service returned an unreadable response. Please try again later.');
    }
    if (!response.ok) {
      if (response.status === 404) throw new Error('This verified listing is no longer available. Refresh the list to see current opportunities.');
      throw new Error('The opportunities service is temporarily unavailable. Please try again later.');
    }
    return payload;
  }

  async function loadOpportunities(page = 1) {
    if (!apiBase || !results) return;
    currentPage = page;
    listController?.abort();
    const controller = new AbortController();
    listController = controller;
    results.replaceChildren();
    results.setAttribute('aria-busy', 'true');
    pagination.hidden = true;
    if (count) count.textContent = '';
    setStatus('Loading verified opportunities…', 'loading');
    if (submitButton) submitButton.disabled = true;

    try {
      const url = new URL('/api/v1/opportunities', apiBase);
      url.search = buildFilterParams().toString();
      const payload = await requestJson(url.href, controller.signal);
      if (!Array.isArray(payload.data) || !payload.pagination) throw new Error('The opportunities service returned data in an unsupported format.');
      const pageData = payload.pagination;
      pageCount = Number.isInteger(pageData.totalPages) ? pageData.totalPages : 0;
      if (payload.data.length) {
        const fragment = document.createDocumentFragment();
        payload.data.forEach(record => fragment.append(renderOpportunity(record)));
        results.append(fragment);
        setStatus('', 'success');
        if (count) count.textContent = `${Number(pageData.total) || payload.data.length} verified ${Number(pageData.total) === 1 ? 'opportunity' : 'opportunities'}`;
        pagination.hidden = pageCount <= 1;
        pageLabel.textContent = `Page ${pageData.page} of ${pageCount}`;
        previousButton.disabled = !pageData.hasPreviousPage;
        nextButton.disabled = !pageData.hasNextPage;
      } else {
        pageCount = 0;
        pagination.hidden = true;
        const hasFilters = [...new FormData(form).values()].some(value => String(value).trim());
        setStatus(hasFilters
          ? 'No verified opportunities match these filters. Try different criteria or clear the filters.'
          : 'No verified opportunities are available right now. Pending or unverified listings are not published. Please check back later.', 'empty');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      pageCount = 0;
      pagination.hidden = true;
      setStatus(error instanceof TypeError
        ? 'Could not connect to the opportunities service. Check your connection and try again.'
        : error.message || 'The opportunities service is temporarily unavailable. Please try again later.', 'error');
      const retry = node('button', 'button button-soft', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', () => loadOpportunities(currentPage));
      results.append(retry);
    } finally {
      if (listController === controller) {
        if (submitButton) submitButton.disabled = false;
        results.setAttribute('aria-busy', 'false');
      }
    }
  }

  function detailField(container, label, value) {
    if (typeof value !== 'string' || !value.trim()) return;
    const section = node('section', 'opportunity-detail-field');
    section.append(node('h3', '', label), node('p', '', value));
    container.append(section);
  }

  async function openDetails(id, trigger) {
    if (!id || !dialog?.showModal || !dialogContent || !apiBase) return;
    detailController?.abort();
    detailController = new AbortController();
    lastDetailTrigger = trigger;
    dialogTitle.textContent = 'Opportunity details';
    dialogContent.replaceChildren(node('p', 'opportunity-feed-status', 'Loading verified details…'));
    if (!dialog.open) dialog.showModal();
    dialogClose?.focus({ preventScroll: true });

    try {
      const url = new URL(`/api/v1/opportunities/${encodeURIComponent(id)}`, apiBase);
      const payload = await requestJson(url.href, detailController.signal);
      const record = payload.data;
      if (!record || record.id !== id) throw new Error('The opportunities service returned an unexpected detail record.');
      dialogTitle.textContent = record.title || 'Opportunity details';
      const content = document.createDocumentFragment();
      if (record.organization) content.append(node('p', 'opportunity-detail-organization', record.organization));
      detailField(content, 'Category', CATEGORY_LABELS[record.category] || record.category);
      detailField(content, 'Location', record.location);
      detailField(content, 'Work mode', record.workMode);
      detailField(content, 'Deadline', record.deadline ? formatDeadline(record.deadline) : 'Not specified');
      detailField(content, 'Funding', record.fundingDetails);
      detailField(content, 'Published', record.publicationDate ? formatDeadline(record.publicationDate) : '');
      detailField(content, 'First discovered', record.discoveredAt ? formatDeadline(record.discoveredAt) : '');
      detailField(content, 'Last updated', record.lastUpdatedAt ? formatDeadline(record.lastUpdatedAt) : '');
      detailField(content, 'Description', record.description);
      detailField(content, 'Eligibility', record.eligibility);
      const links = node('div', 'opportunity-card-actions opportunity-detail-links');
      const application = externalLink('Apply on provider site', record.applicationLink);
      const source = externalLink(record.sourceName ? `Open source: ${record.sourceName}` : 'Open source', record.sourceLink);
      if (application) links.append(application);
      if (source) links.append(source);
      if (links.childElementCount) content.append(links);
      dialogContent.replaceChildren(content);
    } catch (error) {
      if (error.name === 'AbortError') return;
      dialogContent.replaceChildren(node('p', 'opportunity-feed-status is-error', error.message || 'Unable to load listing details right now.'));
    }
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    loadOpportunities(1);
  });
  form?.addEventListener('reset', () => window.setTimeout(() => loadOpportunities(1), 0));
  previousButton?.addEventListener('click', () => { if (currentPage > 1) loadOpportunities(currentPage - 1); });
  nextButton?.addEventListener('click', () => { if (currentPage < pageCount) loadOpportunities(currentPage + 1); });
  results?.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-opportunity]');
    if (trigger) openDetails(trigger.dataset.opportunityId, trigger);
  });
  dialogClose?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog?.addEventListener('close', () => {
    detailController?.abort();
    lastDetailTrigger?.focus({ preventScroll: true });
  });

  async function start() {
    try {
      const response = await fetch('data/opportunities-client-config.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('The opportunities service configuration could not be loaded.');
      const config = await response.json();
      const base = new URL(config.apiBaseUrl);
      if (config.contractVersion !== 1 || !Number.isInteger(config.pageSize) || config.pageSize < 1 || config.pageSize > 50 || base.protocol !== 'https:' || base.hostname !== 'mulembeapi-g9qixcaj.manus.space') {
        throw new Error('The opportunities service is not configured safely.');
      }
      apiBase = base.origin;
      pageSize = config.pageSize;
      await loadOpportunities(1);
    } catch (error) {
      setStatus(error.message || 'The opportunities service is temporarily unavailable. Please try again later.', 'error');
      results.setAttribute('aria-busy', 'false');
    }
  }

  start();
})();
