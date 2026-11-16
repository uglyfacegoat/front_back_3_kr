'use strict';

const catalogState = {
  search: '',
  category: 'all',
  brands: new Set(),
  priceMin: null,
  priceMax: null,
  sort: 'popular',
  visible: 8,
};

const SORTERS = {
  popular: (a, b) => b.rating - a.rating,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name, 'ru'),
};

const els = {};
const PAGE_SIZE = 8;

function parseUrlState() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  if (category && getCategory(category)) catalogState.category = category;
  const query = params.get('q');
  if (query) catalogState.search = query.slice(0, 80);
}

function syncUrl() {
  const params = new URLSearchParams();
  if (catalogState.category !== 'all') params.set('category', catalogState.category);
  if (catalogState.search) params.set('q', catalogState.search);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

function productsInCategory() {
  return catalogState.category === 'all'
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === catalogState.category);
}

function priceRangeValid() {
  const { priceMin, priceMax } = catalogState;
  return priceMin === null || priceMax === null || priceMin <= priceMax;
}

function filteredProducts() {
  const terms = catalogState.search.toLowerCase().split(/\s+/).filter(Boolean);
  const { brands, priceMin, priceMax } = catalogState;
  const checkPrice = priceRangeValid();

  return productsInCategory()
    .filter((p) => terms.every((term) => `${p.name} ${p.brand}`.toLowerCase().includes(term)))
    .filter((p) => !brands.size || brands.has(p.brand))
    .filter((p) => !checkPrice || priceMin === null || p.price >= priceMin)
    .filter((p) => !checkPrice || priceMax === null || p.price <= priceMax)
    .sort(SORTERS[catalogState.sort]);
}

function renderCategoryOptions() {
  const options = [{ id: 'all', plural: 'Все категории', count: PRODUCTS.length }]
    .concat(CATEGORIES.map((c) => ({ ...c, count: PRODUCTS.filter((p) => p.category === c.id).length })));

  els.categories.innerHTML = options.map((c) => `
    <div class="filters__option form-check">
      <input class="form-check-input" type="radio" name="category" id="cat-${c.id}" value="${c.id}"
        ${c.id === catalogState.category ? 'checked' : ''}>
      <label class="form-check-label" for="cat-${c.id}">${c.plural}</label>
      <span class="filters__count">${c.count}</span>
    </div>`).join('');
}

function renderBrandOptions() {
  const counts = new Map();
  productsInCategory().forEach((p) => counts.set(p.brand, (counts.get(p.brand) || 0) + 1));
  const brands = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'en'));

  // Убираем выбранных производителей, которых нет в новой категории.
  catalogState.brands.forEach((b) => { if (!counts.has(b)) catalogState.brands.delete(b); });

  els.brands.innerHTML = brands.map((brand, i) => `
    <div class="filters__option form-check">
      <input class="form-check-input" type="checkbox" name="brand" id="brand-${i}" value="${escapeHtml(brand)}"
        ${catalogState.brands.has(brand) ? 'checked' : ''}>
      <label class="form-check-label" for="brand-${i}">${escapeHtml(brand)}</label>
      <span class="filters__count">${counts.get(brand)}</span>
    </div>`).join('');
}

function renderActiveFilters() {
  const chips = [];
  if (catalogState.search) chips.push({ key: 'search', label: `«${catalogState.search}»` });
  if (catalogState.category !== 'all') chips.push({ key: 'category', label: getCategory(catalogState.category).plural });
  catalogState.brands.forEach((b) => chips.push({ key: 'brand', value: b, label: b }));
  if (catalogState.priceMin !== null) chips.push({ key: 'priceMin', label: `от ${formatPrice(catalogState.priceMin)}` });
  if (catalogState.priceMax !== null) chips.push({ key: 'priceMax', label: `до ${formatPrice(catalogState.priceMax)}` });

  els.active.innerHTML = chips.map((c) => `
    <button type="button" class="active-filters__chip" data-chip="${c.key}" ${c.value ? `data-value="${escapeHtml(c.value)}"` : ''}
      aria-label="Убрать фильтр: ${escapeHtml(c.label)}">
      ${escapeHtml(c.label)} <span aria-hidden="true">×</span>
    </button>`).join('');

  els.badge.textContent = chips.length ? `· ${chips.length}` : '';
}

function pluralProducts(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'товар';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара';
  return 'товаров';
}

function renderResults(append = false) {
  const items = filteredProducts();
  const start = append ? catalogState.visible : 0;
  catalogState.visible = start + PAGE_SIZE;
  const html = items.slice(start, catalogState.visible).map(renderProductCard).join('');
  if (append) els.results.insertAdjacentHTML('beforeend', html);
  else els.results.innerHTML = html;
  const remaining = Math.max(0, items.length - catalogState.visible);
  els.moreWrap.hidden = !remaining;
  els.more.textContent = remaining ? `Показать ещё ${Math.min(remaining, PAGE_SIZE)}` : 'Показать ещё';
  if (append) els.results.children[start]?.querySelector('[data-action="details"]')?.focus();
  els.empty.hidden = items.length > 0;
  els.count.innerHTML = `Найдено <strong>${items.length}</strong> ${pluralProducts(items.length)}`;
  els.priceError.hidden = priceRangeValid();
  els.priceMin.classList.toggle('is-invalid', !priceRangeValid());
  els.priceMax.classList.toggle('is-invalid', !priceRangeValid());
  renderActiveFilters();
  syncUrl();
}

function readPrice(input) {
  if (input.value === '') return null;
  const value = Number(input.value);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function resetFilters() {
  Object.assign(catalogState, { search: '', category: 'all', priceMin: null, priceMax: null });
  catalogState.brands.clear();
  els.search.value = '';
  els.priceMin.value = '';
  els.priceMax.value = '';
  els.sort.value = catalogState.sort = 'popular';
  renderCategoryOptions();
  renderBrandOptions();
  renderResults();
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  els.form = document.querySelector('[data-filters]');
  els.search = document.getElementById('search');
  els.categories = document.querySelector('[data-category-options]');
  els.brands = document.querySelector('[data-brand-options]');
  els.priceMin = document.getElementById('priceMin');
  els.priceMax = document.getElementById('priceMax');
  els.priceError = document.querySelector('[data-price-error]');
  els.sort = document.querySelector('[data-sort]');
  els.results = document.querySelector('[data-results]');
  els.empty = document.querySelector('[data-empty]');
  els.count = document.querySelector('[data-count]');
  els.active = document.querySelector('[data-active-filters]');
  els.badge = document.querySelector('[data-filter-badge]');
  els.more = document.querySelector('[data-more]');
  els.moreWrap = document.querySelector('[data-more-wrap]');

  parseUrlState();
  els.search.value = catalogState.search;
  renderCategoryOptions();
  renderBrandOptions();
  renderResults();

  els.form.addEventListener('submit', (event) => event.preventDefault());

  els.search.addEventListener('input', debounce(() => {
    catalogState.search = els.search.value.trim().slice(0, 80);
    renderResults();
  }, 200));

  els.categories.addEventListener('change', (event) => {
    catalogState.category = event.target.value;
    renderBrandOptions();
    renderResults();
  });

  els.brands.addEventListener('change', (event) => {
    const { value, checked } = event.target;
    if (checked) catalogState.brands.add(value);
    else catalogState.brands.delete(value);
    renderResults();
  });

  const onPrice = debounce(() => {
    catalogState.priceMin = readPrice(els.priceMin);
    catalogState.priceMax = readPrice(els.priceMax);
    renderResults();
  }, 250);
  els.priceMin.addEventListener('input', onPrice);
  els.priceMax.addEventListener('input', onPrice);

  els.sort.addEventListener('change', () => {
    catalogState.sort = els.sort.value;
    renderResults();
  });

  // Кнопка reset формы сбрасывает и состояние, а не только поля.
  els.form.addEventListener('reset', (event) => {
    event.preventDefault();
    resetFilters();
  });
  document.querySelector('[data-reset]').addEventListener('click', resetFilters);

  els.active.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-chip]');
    if (!chip) return;
    const key = chip.dataset.chip;
    if (key === 'search') { catalogState.search = ''; els.search.value = ''; }
    if (key === 'category') { catalogState.category = 'all'; renderCategoryOptions(); renderBrandOptions(); }
    if (key === 'brand') { catalogState.brands.delete(chip.dataset.value); renderBrandOptions(); }
    if (key === 'priceMin') { catalogState.priceMin = null; els.priceMin.value = ''; }
    if (key === 'priceMax') { catalogState.priceMax = null; els.priceMax.value = ''; }
    renderResults();
  });

  els.more.addEventListener('click', () => renderResults(true));
  bindProductActions(els.results);
});
