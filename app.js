(() => {
  'use strict';

  let budget = {};
  let currentBudgetView = 'income';
  const budgetChart = document.querySelector('#budget-chart');
  const budgetCaption = document.querySelector('#budget-caption');
  const formatKsh = value => `KSh ${new Intl.NumberFormat('en-KE').format(value)}`;

  function renderBudget(which) {
    const data = budget[which];
    if (!data || !budgetChart) return;
    currentBudgetView = which;
    budgetCaption.textContent = data.caption;
    budgetChart.replaceChildren();
    const max = Math.max(...data.rows.map(([, amount]) => amount));
    data.rows.forEach(([label, amount]) => {
      const row = document.createElement('div');
      row.className = 'budget-row';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', `${label}: ${formatKsh(amount)}, proposed`);
      const name = document.createElement('span');
      name.className = 'budget-label';
      name.textContent = label;
      const track = document.createElement('span');
      track.className = 'budget-track';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.className = 'budget-fill';
      fill.style.width = `${Math.max(3, amount / max * 100)}%`;
      track.append(fill);
      const value = document.createElement('span');
      value.className = 'budget-amount';
      value.textContent = formatKsh(amount);
      row.append(name, track, value);
      budgetChart.append(row);
    });
  }

  async function loadBudget() {
    if (!budgetChart) return;
    try {
      const response = await fetch('data/proposed-budget-2026-27.json');
      if (!response.ok) throw new Error(`Budget data unavailable (${response.status})`);
      const source = await response.json();
      const incomeTotal = source.income.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const allocationTotal = source.allocations.reduce((sum, entry) => sum + Number(entry.amount), 0);
      if (source.dataStatus !== 'PROPOSED_ONLY' || incomeTotal !== source.proposedIncomeTotal || allocationTotal !== source.proposedAllocationTotal) {
        throw new Error('Budget data did not pass its proposal and total checks');
      }
      budget = {
        income: {
          caption: `Where proposed income is expected to come from · ${formatKsh(incomeTotal)} total`,
          rows: source.income.map(entry => [entry.category, Number(entry.amount)])
        },
        allocation: {
          caption: `Proposed activity allocations · ${formatKsh(allocationTotal)} total · not actual expenditure`,
          rows: source.allocations.map(entry => [entry.category, Number(entry.amount)])
        }
      };
      renderBudget(currentBudgetView);
    } catch (error) {
      budgetChart.replaceChildren();
      const message = document.createElement('p');
      message.className = 'search-empty';
      message.textContent = 'The proposed budget breakdown is temporarily unavailable. No actual financial balance or transactions are published here.';
      budgetChart.append(message);
      if (budgetCaption) budgetCaption.textContent = 'Proposed figures · source data unavailable';
      console.error(error);
    }
  }

  document.querySelectorAll('[data-budget-view]').forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.budgetView;
      document.querySelectorAll('[data-budget-view]').forEach(tab => {
        const selected = tab === button;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-pressed', String(selected));
      });
      if (budget[view]) renderBudget(view);
    });
  });
  loadBudget();

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  function closeMenu() {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });

  const overlay = document.querySelector('#search-overlay');
  const launch = document.querySelector('#search-launch');
  const closeButton = document.querySelector('.search-close');
  const searchInput = document.querySelector('#site-search');
  const searchResults = document.querySelector('#search-results');
  const searchable = [
    { title: 'Our union, mission & vision', href: '#about', tags: 'about union purpose mission vision identity culture community luhya mulembe' },
    { title: 'Leadership & representatives', href: '#leadership', tags: 'leadership chairperson chairman secretary treasurer judiciary county year officials' },
    { title: 'Culture, sport & academic activities', href: '#activities', tags: 'events activities culture culfest sports tournaments academic mentorship bash agm' },
    { title: 'Official announcements', href: '#announcements', tags: 'announcement notices updates official' },
    { title: '2026/27 proposed income & allocation', href: '#finance', tags: 'finance budget income allocation ksh 69500 59000 shillings transparency proposal' },
    { title: 'Union accounts & actual ledger status', href: '#finance', tags: 'accounts events welfare politics communications vikings actual expenditure ledger' },
    { title: 'Budget document status & union documents', href: '#documents', tags: 'documents pdf budget constitution reports minutes election rules policies' },
    { title: 'Elections & secure voting readiness', href: '#elections', tags: 'election vote voting candidates manifesto democracy otp secure' },
    { title: 'Academic, welfare & member participation', href: '#community', tags: 'academic welfare support community peer mentorship' },
    { title: 'Member portal readiness', href: '#member-portal', tags: 'member membership portal login sign in account registration secure' },
    { title: 'Official contact information', href: '#contact', tags: 'contact email phone location social media' }
  ];

  function renderSearch(query) {
    if (!searchResults) return;
    searchResults.replaceChildren();
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      const hint = document.createElement('p');
      hint.className = 'search-hint';
      hint.textContent = 'Try “budget”, “elections”, “leadership” or “welfare”.';
      searchResults.append(hint);
      return;
    }
    const terms = normalized.split(/\s+/).filter(Boolean);
    const matches = searchable.filter(item => terms.every(term => `${item.title} ${item.tags}`.toLowerCase().includes(term)));
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = 'No matching public section. Try a shorter search term.';
      searchResults.append(empty);
      return;
    }
    matches.forEach(item => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.href;
      const label = document.createElement('span');
      label.textContent = '↗';
      link.append(document.createTextNode(item.title), label);
      link.addEventListener('click', closeSearch);
      searchResults.append(link);
    });
  }
  function openSearch() {
    closeMenu();
    overlay?.classList.add('is-open');
    overlay?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('search-open');
    window.setTimeout(() => searchInput?.focus(), 50);
  }
  function closeSearch() {
    overlay?.classList.remove('is-open');
    overlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-open');
    launch?.focus();
  }
  launch?.addEventListener('click', openSearch);
  closeButton?.addEventListener('click', closeSearch);
  overlay?.addEventListener('click', event => { if (event.target === overlay) closeSearch(); });
  searchInput?.addEventListener('input', event => renderSearch(event.target.value));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (overlay?.classList.contains('is-open')) closeSearch();
      else closeMenu();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (overlay?.classList.contains('is-open')) closeSearch();
      else openSearch();
    }
  });
  renderSearch('');

  const currentYear = document.querySelector('#current-year');
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
})();
