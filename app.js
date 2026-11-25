(() => {
  'use strict';

  document.body.classList.add('has-js');

  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = year; });

  const sidebar = document.querySelector('#app-sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  const menuButtons = [...document.querySelectorAll('[data-menu-toggle]')];
  let lastMenuTrigger = null;

  function closeMenu(restoreFocus = false) {
    document.body.classList.remove('sidebar-open', 'menu-open');
    menuButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      if (button.classList.contains('menu-toggle')) button.setAttribute('aria-label', 'Open all pages');
    });
    if (backdrop) backdrop.hidden = true;
    if (restoreFocus && lastMenuTrigger) lastMenuTrigger.focus();
  }

  function openMenu(trigger) {
    closeSearch();
    lastMenuTrigger = trigger;
    document.body.classList.add('sidebar-open', 'menu-open');
    menuButtons.forEach(button => button.setAttribute('aria-expanded', 'true'));
    if (backdrop) backdrop.hidden = false;
    sidebar?.querySelector('.side-link')?.focus({ preventScroll: true });
  }

  menuButtons.forEach(button => button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    if (expanded) closeMenu(true);
    else openMenu(button);
  }));
  backdrop?.addEventListener('click', () => closeMenu(true));
  sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  window.addEventListener('resize', () => { if (window.innerWidth > 790) closeMenu(); });

  const searchIndex = (() => {
    try {
      return JSON.parse(document.querySelector('#search-index')?.textContent || '[]');
    } catch (error) {
      console.error('Public page search index is invalid.', error);
      return [];
    }
  })();
  const overlay = document.querySelector('#search-overlay');
  const searchLaunch = document.querySelector('#search-launch');
  const searchClose = document.querySelector('[data-close-search]');
  const searchInput = document.querySelector('#site-search');
  const searchResults = document.querySelector('#search-results');
  const dialog = document.querySelector('.search-dialog');

  function renderSearch(query) {
    if (!searchResults) return;
    searchResults.replaceChildren();
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      const hint = document.createElement('p');
      hint.className = 'search-hint';
      hint.textContent = 'Search pages and public topics.';
      searchResults.append(hint);
      return;
    }
    const terms = normalized.split(/\s+/).filter(Boolean);
    const matches = searchIndex.filter(page => {
      const haystack = `${page.title} ${page.label} ${page.keywords} ${page.description}`.toLowerCase();
      return terms.every(term => haystack.includes(term));
    });
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = 'No matching public page. Try a shorter search term.';
      searchResults.append(empty);
      return;
    }
    matches.forEach(page => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = page.route;
      const copy = document.createElement('span');
      copy.textContent = page.title;
      const description = document.createElement('small');
      description.textContent = page.description;
      copy.append(description);
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(copy, arrow);
      link.addEventListener('click', () => closeSearch());
      searchResults.append(link);
    });
  }

  function openSearch() {
    closeMenu();
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('search-open');
    renderSearch('');
    window.requestAnimationFrame(() => overlay.classList.add('is-open'));
    window.setTimeout(() => searchInput?.focus(), 30);
  }

  function closeSearch(restoreFocus = true) {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-open');
    window.setTimeout(() => { if (!overlay.classList.contains('is-open')) overlay.hidden = true; }, 190);
    if (restoreFocus) searchLaunch?.focus();
  }

  searchLaunch?.addEventListener('click', openSearch);
  searchClose?.addEventListener('click', () => closeSearch());
  searchInput?.addEventListener('input', event => renderSearch(event.target.value));
  overlay?.addEventListener('click', event => { if (event.target === overlay) closeSearch(); });
  dialog?.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (overlay && !overlay.hidden) closeSearch();
      else if (document.body.classList.contains('sidebar-open')) closeMenu(true);
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (overlay && !overlay.hidden) closeSearch();
      else openSearch();
    }
  });

  const chart = document.querySelector('#budget-chart');
  const caption = document.querySelector('#budget-caption');
  const budgetButtons = [...document.querySelectorAll('[data-budget-view]')];
  const formatKsh = amount => `KSh ${new Intl.NumberFormat('en-KE').format(amount)}`;
  let budget = null;
  let currentView = 'income';

  function renderBudget(view) {
    if (!budget || !chart || !caption) return;
    const selection = budget[view];
    if (!selection?.rows?.length) return;
    currentView = view;
    caption.textContent = selection.caption;
    chart.replaceChildren();
    const maximum = Math.max(...selection.rows.map(row => row.amount));
    selection.rows.forEach(({ label, amount }) => {
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
      fill.style.width = `${Math.max(3, amount / maximum * 100)}%`;
      track.append(fill);
      const value = document.createElement('span');
      value.className = 'budget-amount';
      value.textContent = formatKsh(amount);
      row.append(name, track, value);
      chart.append(row);
    });
    budgetButtons.forEach(button => {
      const selected = button.dataset.budgetView === view;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  async function loadBudget() {
    if (!chart || !caption) return;
    try {
      const response = await fetch('data/proposed-budget-2026-27.json');
      if (!response.ok) throw new Error(`Budget data unavailable (${response.status})`);
      const source = await response.json();
      const sum = rows => rows.reduce((total, row) => total + Number(row.amount), 0);
      const incomeTotal = sum(source.income || []);
      const allocationTotal = sum(source.allocations || []);
      if (source.dataStatus !== 'PROPOSED_ONLY' || incomeTotal !== source.proposedIncomeTotal || allocationTotal !== source.proposedAllocationTotal) {
        throw new Error('Budget data did not pass its proposal and total checks');
      }
      budget = {
        income: {
          caption: `Proposed income sources · ${formatKsh(incomeTotal)} total · not received`,
          rows: source.income.map(entry => ({ label: entry.category, amount: Number(entry.amount) }))
        },
        allocation: {
          caption: `Proposed allocations · ${formatKsh(allocationTotal)} total · not actual expenditure`,
          rows: source.allocations.map(entry => ({ label: entry.category, amount: Number(entry.amount) }))
        }
      };
      renderBudget(currentView);
    } catch (error) {
      chart.replaceChildren();
      const message = document.createElement('p');
      message.className = 'chart-fallback';
      message.textContent = 'The proposed breakdown is temporarily unavailable. Actual transactions and balance remain unknown.';
      chart.append(message);
      caption.textContent = 'Proposed figures · source data unavailable';
      console.error(error);
    }
  }

  budgetButtons.forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.budgetView;
    if (budget?.[view]) renderBudget(view);
  }));
  loadBudget();

  const installButton = document.querySelector('[data-pwa-install]');
  let installPrompt = null;
  if (installButton) {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      installButton.hidden = false;
    });
    installButton.addEventListener('click', async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === 'accepted') installButton.hidden = true;
      installPrompt = null;
    });
    window.addEventListener('appinstalled', () => {
      installButton.hidden = true;
      installPrompt = null;
    });
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js', { scope: './' })
        .catch(error => console.error('Offline support could not be enabled.', error));
    }, { once: true });
  }
})();
