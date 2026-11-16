'use strict';

const BUDGET_KEY = 'buildpc:budget:v1';

const cfg = {
  pickerCategory: null,
  pickerModal: null,
  budget: null,
};

const $ = (selector) => document.querySelector(selector);

/* Размеры без подписи непонятны, поэтому для них показываем название параметра. */
const LABELED_META = ['length', 'height', 'radiator', 'maxGpuLength', 'maxCoolerHeight', 'maxRadiator', 'maxTdp'];

function slotMeta(product) {
  return keySpecs(product, 3)
    .map(([key, value]) => {
      const text = formatSpecValue(key, value);
      return LABELED_META.includes(key) ? `${SPEC_LABELS[key].toLowerCase()} ${text}` : text;
    })
    .join(' · ');
}

function issuesBySlot(checks) {
  const map = {};
  checks.filter((c) => c.level !== 'ok').forEach((c) => {
    c.parts.forEach((part) => { (map[part] ||= []).push(c); });
  });
  return map;
}

/* ---------- Слоты ---------- */

function renderSlots(build, checks) {
  const issues = issuesBySlot(checks);
  const cpu = getProduct(build.cpu);

  $('[data-slots]').innerHTML = CATEGORIES.map((category) => {
    const product = build[category.id] ? getProduct(build[category.id]) : null;
    const slotIssues = issues[category.id] || [];
    const hasError = slotIssues.some((i) => i.level === 'error');
    const needsGraphics = category.id === 'gpu' && cpu && !cpu.specs.igpu;
    const state = hasError ? 'error' : slotIssues.length ? 'warn' : product ? 'ok' : 'empty';
    const issueText = slotIssues.map((i) => `<span class="slot__issue">${escapeHtml(i.text)}</span>`).join('');

    return `
      <li class="slot slot--${state}" data-slot="${category.id}">
        <div class="slot__image">${product ? productImage(product) : categoryIcon(category.id)}</div>
        <div class="slot__body">
          <p class="slot__label">
            ${category.name}
            ${category.required || needsGraphics ? '' : '<span class="slot__optional">необязательно</span>'}
          </p>
          ${product
            ? `<strong class="slot__name">${escapeHtml(product.name)}</strong>
               <span class="slot__meta">${escapeHtml(slotMeta(product))}</span>`
            : '<span class="slot__name slot__name--empty">Не выбрано</span>'}
          ${issueText}
        </div>
        <span class="slot__price">${product ? formatPrice(product.price) : ''}</span>
        <div class="slot__actions">
          ${product
            ? `<button type="button" class="btn btn-sm btn--ghost" data-pick="${category.id}" aria-label="Заменить: ${category.name}">Заменить</button>
               <button type="button" class="btn btn-sm btn--quiet" data-remove="${category.id}" aria-label="Убрать из сборки: ${category.name}">Убрать</button>`
            : `<button type="button" class="btn btn-sm btn--accent" data-pick="${category.id}" aria-label="Выбрать: ${category.name}">Выбрать</button>`}
        </div>
      </li>`;
  }).join('');
}

/* ---------- Прогресс, итог, бюджет ---------- */

function renderProgress(build, checks) {
  const cpu = getProduct(build.cpu);
  const required = CATEGORIES.filter((c) => c.required || (c.id === 'gpu' && cpu && !cpu.specs.igpu));
  const filled = required.filter((c) => build[c.id]).length;
  const percent = Math.round((filled / required.length) * 100);
  const errors = checks.filter((c) => c.level === 'error').length;
  const warns = checks.filter((c) => c.level === 'warn').length;

  $('[data-progress-text]').textContent = `Выбрано ${filled} из ${required.length} обязательных деталей`;
  const bar = $('[data-progress-bar]');
  bar.setAttribute('aria-valuenow', percent);
  bar.firstElementChild.style.width = `${percent}%`;
  bar.firstElementChild.classList.toggle('bg-danger', errors > 0);
  bar.firstElementChild.classList.toggle('bg-success', !errors && filled === required.length);

  const status = $('[data-progress-status]');
  status.className = 'build-progress__status';
  if (errors) {
    status.textContent = `Несовместимость: ${errors}`;
    status.classList.add('build-progress__status--error');
  } else if (filled === required.length) {
    status.textContent = warns ? `Сборка готова, замечаний: ${warns}` : 'Сборка готова';
    status.classList.add(warns ? 'build-progress__status--warn' : 'build-progress__status--ok');
  } else {
    status.textContent = '';
  }
}

function readBudget() {
  try {
    const value = Number(localStorage.getItem(BUDGET_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function renderBudget(total) {
  const budget = cfg.budget;
  const box = $('[data-budget]');
  box.hidden = !budget;
  if (!budget) return;

  const percent = Math.min(100, Math.round((total / budget) * 100));
  const over = total > budget;
  const bar = $('[data-budget-bar]');
  bar.setAttribute('aria-valuenow', percent);
  bar.firstElementChild.style.width = `${percent}%`;
  bar.firstElementChild.classList.toggle('bg-danger', over);

  const text = $('[data-budget-text]');
  text.classList.toggle('budget__text--over', over);
  text.textContent = over
    ? `Бюджет превышен на ${formatPrice(total - budget)}`
    : `Осталось ${formatPrice(budget - total)} из ${formatPrice(budget)}`;
}

function renderSummary(build, checks) {
  const parts = {};
  Object.entries(build).forEach(([cat, id]) => { parts[cat] = getProduct(id); });
  const total = BuildStore.total(build);
  const empty = !Object.keys(build).length;

  $('[data-total]').textContent = formatPrice(total);
  $('[data-mobile-price]').textContent = formatPrice(total);
  renderBudget(total);

  const missing = CATEGORIES.filter((c) => c.required && !build[c.id]);
  const items = empty
    ? [{ level: 'info', text: 'Сборка пуста. Выберите детали или начните с готовой сборки.' }]
    : [...checks];
  if (!empty && missing.length) {
    items.push({ level: 'info', text: `Осталось выбрать: ${missing.map((c) => c.name.toLowerCase()).join(', ')}.` });
  }

  const order = { error: 0, warn: 1, ok: 2, info: 3 };
  $('[data-checks]').innerHTML = items
    .sort((a, b) => order[a.level] - order[b.level])
    .map((c) => `<li class="checks__item checks__item--${c.level}">${escapeHtml(c.text)}</li>`)
    .join('');

  const hasPowerParts = parts.cpu || parts.gpu;
  const { load, recommended } = estimatePower(parts);
  $('[data-power-load]').textContent = hasPowerParts ? `≈ ${load} Вт` : '—';
  $('[data-power-rec]').textContent = hasPowerParts ? `от ${recommended} Вт` : '—';

  $('[data-copy]').disabled = empty;
  $('[data-download]').disabled = empty;
  const saveButton = $('[data-account-save]');
  const orderButton = $('[data-account-order]');
  saveButton.hidden = empty;
  orderButton.hidden = CATEGORIES.some((category) => category.required && !build[category.id]) ||
    checks.some((check) => check.level === 'error');
  if (!empty) {
    const params = new URLSearchParams({ save: Object.values(build).join(',') });
    saveButton.href = `account.html?${params}`;
    orderButton.href = `checkout.html?${new URLSearchParams({ build: Object.values(build).join(',') })}`;
  }
  $('[data-share]').disabled = empty;
  $('[data-share]').hidden = window.location.protocol === 'file:';
  $('[data-clear]').disabled = empty;
}

function render() {
  const build = BuildStore.read();
  const checks = checkBuild(build);
  renderSlots(build, checks);
  renderProgress(build, checks);
  renderSummary(build, checks);
  if (cfg.pickerCategory) renderPicker();
}

/* ---------- Окно выбора ---------- */

function fillBrandOptions(categoryId) {
  const brands = [...new Set(PRODUCTS.filter((p) => p.category === categoryId).map((p) => p.brand))]
    .sort((a, b) => a.localeCompare(b, 'en'));
  $('#pickerBrand').innerHTML = '<option value="">Все производители</option>'
    + brands.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
}

function renderPickerSpecs(product) {
  return Object.entries(product.specs)
    .map(([key, value]) => `<div class="spec-table__row"><dt class="spec-table__name">${SPEC_LABELS[key]}</dt><dd class="spec-table__value">${escapeHtml(formatSpecValue(key, value))}</dd></div>`)
    .join('');
}

function renderPicker() {
  const category = getCategory(cfg.pickerCategory);
  const build = BuildStore.read();
  const query = $('#pickerSearch').value.trim().toLowerCase();
  const brand = $('#pickerBrand').value;
  const sort = $('#pickerSort').value;
  const onlyCompatible = $('#pickerCompatible').checked;

  const all = PRODUCTS
    .filter((p) => p.category === category.id)
    .map((product) => {
      const notes = checkCandidate(product, build);
      const problems = notes.filter((result) => result.level === 'error' && result.id !== 'missing-gpu');
      return { product, problems, notes };
    });

  const items = all
    .filter(({ product }) => !query || product.name.toLowerCase().includes(query))
    .filter(({ product }) => !brand || product.brand === brand)
    .filter(({ product, problems }) => !onlyCompatible || !problems.length || build[category.id] === product.id);

  const sorters = {
    popular: (a, b) => b.product.rating - a.product.rating,
    'price-asc': (a, b) => a.product.price - b.product.price,
    'price-desc': (a, b) => b.product.price - a.product.price,
  };
  items.sort((a, b) => a.problems.length - b.problems.length || sorters[sort](a, b));

  const hidden = all.filter(({ product, problems }) => problems.length && product.id !== build[category.id]).length;
  $('#pickerTitle').textContent = `Выбор: ${category.name.toLowerCase()}`;
  $('[data-picker-count]').textContent = `Показано ${items.length} из ${all.length}`
    + (onlyCompatible && hidden ? ` · скрыто несовместимых: ${hidden}` : '');

  $('[data-picker-empty]').hidden = items.length > 0;
  $('[data-picker-empty-text]').textContent = onlyCompatible && hidden
    ? 'Попробуйте выключить «Только совместимые» или изменить другие детали сборки.'
    : 'Попробуйте изменить запрос или производителя.';

  $('[data-picker-list]').innerHTML = items.map(({ product, problems, notes }) => {
    const current = build[category.id] === product.id;
    const result = problems[0] || notes[0];
    const note = result
      ? `<span class="picker__note picker__note--${problems.length ? 'error' : 'warn'}">${escapeHtml(result.text)}</span>`
      : '';
    return `
      <li class="picker__item ${current ? 'picker__item--current' : ''} ${problems.length ? 'picker__item--incompatible' : ''}">
        <div class="picker__image">${productImage(product)}</div>
        <div class="picker__info">
          <span class="picker__name">${escapeHtml(product.name)}</span>
          <span class="picker__meta">${escapeHtml(slotMeta(product))}</span>
          ${note}
          <details class="picker__details">
            <summary>Все характеристики</summary>
            <dl class="spec-table">${renderPickerSpecs(product)}</dl>
          </details>
        </div>
        <div class="picker__side">
          <span class="picker__price">${formatPrice(product.price)}</span>
          ${current
            ? '<span class="picker__current">Выбрано</span>'
            : `<button type="button" class="btn btn-sm ${problems.length ? 'btn--ghost' : 'btn--accent'}" data-choose="${product.id}">Выбрать</button>`}
        </div>
      </li>`;
  }).join('');
}

function openPicker(categoryId) {
  cfg.pickerCategory = categoryId;
  $('#pickerSearch').value = '';
  $('#pickerSort').value = 'popular';
  $('#pickerCompatible').checked = true;
  fillBrandOptions(categoryId);
  renderPicker();
  cfg.pickerModal.show();
}

/* ---------- Готовые сборки, ссылка, копирование ---------- */

/* Новую сборку загружаем сразу, а прежнюю можно вернуть кнопкой в уведомлении. */
function replaceBuild(build, message) {
  const previous = BuildStore.read();
  BuildStore.replace(build);
  const hadBuild = Object.keys(previous).length > 0;
  showToast(
    hadBuild ? `${message} Прежняя сборка заменена.` : message,
    'success',
    hadBuild ? { label: 'Вернуть', onClick: () => BuildStore.replace(previous) } : null,
  );
}

function applyPreset(presetId) {
  const preset = getPreset(presetId);
  if (preset) replaceBuild(buildFromPreset(preset), `Загружена сборка «${preset.title}».`);
}

function shareUrl() {
  const build = BuildStore.read();
  const ids = CATEGORIES.map((c) => build[c.id]).filter(Boolean);
  const url = new URL('configurator.html', window.location.href);
  url.searchParams.set('build', ids.join(','));
  return url.toString();
}

function buildAsText() {
  const text = formatBuildText();
  if (window.location.protocol === 'file:') return text;
  return `${text}\r\nСсылка: ${shareUrl()}`;
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    const dialog = $('#copyDialog');
    const field = $('#copyValue');
    field.value = text;
    dialog.showModal();
    field.focus();
    field.select();
  }
}

/* Открытие по ссылке: ?preset=gaming или ?build=id1,id2,... */
function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const presetId = params.get('preset');
  const shared = params.get('build');

  if (presetId && getPreset(presetId)) {
    applyPreset(presetId);
  } else if (shared) {
    const ids = shared.split(',').slice(0, CATEGORIES.length);
    const build = buildFromIds(ids);
    if (Object.keys(build).length) {
      replaceBuild(build, 'Открыта сборка по ссылке.');
    } else {
      showToast('Ссылка повреждена: в ней нет известных деталей.', 'error');
    }
  }
  if (presetId || shared) history.replaceState(null, '', window.location.pathname);
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('has-mobile-total');
  cfg.pickerModal = new bootstrap.Modal($('#pickerModal'));

  $('[data-preset-buttons]').innerHTML = PRESETS.map((preset) => `
    <button type="button" class="preset-option" data-preset="${preset.id}">
      <img src="img/products/pc-${preset.id}-1.png" alt="" loading="lazy" decoding="async">
      <span><strong>${escapeHtml(preset.title)}</strong><small>${formatPrice(presetTotal(preset))}</small></span>
    </button>`).join('');

  cfg.budget = readBudget();
  if (cfg.budget) $('#budget').value = cfg.budget;

  applyUrlParams();
  render();

  $('[data-slots]').addEventListener('click', (event) => {
    const pick = event.target.closest('[data-pick]');
    const remove = event.target.closest('[data-remove]');
    if (pick) openPicker(pick.dataset.pick);
    if (remove) {
      const category = remove.dataset.remove;
      const product = getProduct(BuildStore.read()[category]);
      BuildStore.remove(category);
      if (product) {
        showToast(`«${product.name}» убран из сборки.`, 'success', {
          label: 'Вернуть',
          onClick: () => {
            if (!BuildStore.read()[category]) BuildStore.add(product);
          },
        });
      }
    }
  });

  $('[data-picker-list]').addEventListener('click', (event) => {
    const choose = event.target.closest('[data-choose]');
    if (!choose) return;
    const product = getProduct(choose.dataset.choose);
    if (!product) return;
    addToBuild(product);
    cfg.pickerModal.hide();
  });

  ['#pickerSearch', '#pickerBrand', '#pickerSort', '#pickerCompatible'].forEach((selector) => {
    $(selector).addEventListener(selector === '#pickerSearch' ? 'input' : 'change', renderPicker);
  });

  $('#pickerModal').addEventListener('shown.bs.modal', () => $('#pickerSearch').focus());
  $('#pickerModal').addEventListener('hidden.bs.modal', () => {
    // Возвращаем фокус на кнопку слота, из которого открыли окно.
    const button = document.querySelector(`[data-slot="${cfg.pickerCategory}"] [data-pick]`);
    cfg.pickerCategory = null;
    button?.focus();
  });

  $('[data-preset-buttons]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (button) applyPreset(button.dataset.preset);
  });

  $('#budget').addEventListener('input', () => {
    const value = Number($('#budget').value);
    cfg.budget = Number.isSafeInteger(value) && value > 0 ? value : null;
    try {
      if (cfg.budget) localStorage.setItem(BUDGET_KEY, String(cfg.budget));
      else localStorage.removeItem(BUDGET_KEY);
    } catch {
      // Лимит остаётся доступен в открытой вкладке.
    }
    renderBudget(BuildStore.total());
  });

  $('[data-share]').addEventListener('click', () => copyText(shareUrl(), 'Ссылка на сборку скопирована.'));
  $('[data-copy]').addEventListener('click', () => copyText(buildAsText(), 'Список сборки скопирован.'));
  $('[data-download]').addEventListener('click', () => downloadText('buildpc-parts.txt', buildAsText()));
  $('[data-clear]').addEventListener('click', () => {
    const previous = BuildStore.read();
    BuildStore.clear();
    showToast('Сборка очищена.', 'success', { label: 'Вернуть', onClick: () => BuildStore.replace(previous) });
  });
});

document.addEventListener('build:change', render);
