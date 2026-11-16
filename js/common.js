'use strict';

/* ---------- Форматирование ---------- */

const priceFormatter = new Intl.NumberFormat('ru-RU');

function formatPrice(value) {
  return `${priceFormatter.format(value)} ₽`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function formatSpecValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Есть' : 'Нет';
  if (Array.isArray(value)) return value.join(', ');
  if (SPEC_UNITS[key]) return `${value} ${SPEC_UNITS[key]}`;
  return value;
}

/* ---------- Хранилище сборки ----------
 * Сборка хранится в localStorage как { категория: id товара },
 * чтобы каталог и конфигуратор работали с одной и той же сборкой. */

const BuildStore = {
  KEY: 'buildpc:build:v1',
  memory: null,

  read() {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(this.KEY));
    } catch {
      raw = null;
    }
    if (this.memory) raw = this.memory;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    // Отбрасываем устаревшие или подменённые записи.
    const build = {};
    for (const [category, id] of Object.entries(raw)) {
      const product = getProduct(id);
      if (product && product.category === category) build[category] = id;
    }
    return build;
  },

  write(build) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(build));
      this.memory = null;
    } catch {
      const firstFailure = !this.memory;
      this.memory = { ...build };
      if (firstFailure) showToast('Браузер заблокировал сохранение. Сборка доступна до закрытия страницы.', 'error');
    }
    document.dispatchEvent(new CustomEvent('build:change', { detail: build }));
  },

  add(product) {
    const build = this.read();
    const previous = build[product.category] ? getProduct(build[product.category]) : null;
    build[product.category] = product.id;
    this.write(build);
    return previous;
  },

  remove(category) {
    const build = this.read();
    delete build[category];
    this.write(build);
  },

  replace(build) {
    this.write({ ...build });
  },

  clear() {
    this.write({});
  },

  has(productId) {
    return Object.values(this.read()).includes(productId);
  },

  total(build = this.read()) {
    return Object.values(build).reduce((sum, id) => sum + (getProduct(id)?.price || 0), 0);
  },
};

function formatBuildText(build = BuildStore.read()) {
  const lines = CATEGORIES.filter((category) => build[category.id]).map((category) => {
    const product = getProduct(build[category.id]);
    return `${category.name}: ${product.name} — ${formatPrice(product.price)}`;
  });
  return ['Сборка BuildPC', ...lines, '', `Итого: ${formatPrice(BuildStore.total(build))}`].join('\r\n');
}

function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Уведомления ---------- */

function showToast(message, type = 'success', action = null) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-atomic', 'true');
    document.body.append(stack);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-stack__item toast-stack__item--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <div class="toast-stack__body">
      <span class="toast-stack__text"></span>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Закрыть"></button>
    </div>`;
  toast.querySelector('.toast-stack__text').textContent = message;
  stack.append(toast);

  const instance = bootstrap.Toast.getOrCreateInstance(toast, { delay: action ? 7000 : 3500 });
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-stack__action';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.onClick();
      instance.hide();
    });
    toast.querySelector('.toast-stack__text').after(button);
  }
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  instance.show();
}

/* ---------- Карточка товара ---------- */

function renderTags(tags, block = 'product-card') {
  if (!tags.length) return '';
  return `<ul class="${block}__tags">${tags
    .map((tag) => `<li class="tag tag--${tag}">${TAGS[tag]}</li>`)
    .join('')}</ul>`;
}

function keySpecs(product, limit = 3) {
  return Object.entries(product.specs)
    .filter(([key]) => key !== 'power' || product.category === 'gpu')
    .slice(0, limit);
}

function renderProductCard(product) {
  const inBuild = BuildStore.has(product.id);
  const specs = keySpecs(product)
    .map(([key, value]) => `
      <div class="product-card__spec">
        <dt>${SPEC_LABELS[key]}</dt>
        <dd>${escapeHtml(formatSpecValue(key, value))}</dd>
      </div>`)
    .join('');

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-card__media">
        ${productImage(product)}
        ${renderTags(product.tags.slice(0, 1))}
      </div>
      <div class="product-card__body">
        ${MODEL_PHOTOS[product.id] ? '' : '<p class="product-card__photo-note">Фото для примера</p>'}
        <p class="product-card__category">${getCategory(product.category).name} · ${escapeHtml(product.brand)}</p>
        <h3 class="product-card__title">${escapeHtml(product.name)}</h3>
        <dl class="product-card__specs">${specs}</dl>
      </div>
      <div class="product-card__footer">
        <span class="product-card__price">${formatPrice(product.price)}</span>
        <div class="product-card__actions">
          <button type="button" class="btn btn-sm btn--ghost" data-action="details" data-id="${product.id}">
            Подробнее
          </button>
          <button type="button" class="btn btn-sm btn--accent ${inBuild ? 'is-added' : ''}" data-action="add" data-id="${product.id}"
            aria-label="${inBuild ? 'Уже в сборке' : 'Добавить в сборку'}: ${escapeHtml(product.name)}">
            ${inBuild ? 'В сборке ✓' : 'В сборку'}
          </button>
        </div>
      </div>
    </article>`;
}

/* ---------- Модальное окно с характеристиками ---------- */

let productModal = null;

function ensureProductModal() {
  if (productModal) return productModal;

  const el = document.createElement('div');
  el.className = 'modal fade product-modal';
  el.id = 'productModal';
  el.tabIndex = -1;
  el.setAttribute('aria-labelledby', 'productModalTitle');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content product-modal__content">
        <div class="modal-header product-modal__header">
          <div>
            <p class="product-modal__category" data-modal="category"></p>
            <h2 class="modal-title product-modal__title" id="productModalTitle" data-modal="title"></h2>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
        </div>
        <div class="modal-body product-modal__body">
          <figure class="product-modal__figure">
            <div class="product-modal__media" data-modal="media"></div>
            <figcaption class="product-modal__caption" data-modal="caption">Фото для примера</figcaption>
          </figure>
          <div class="product-modal__info">
            <div data-modal="tags"></div>
            <p class="product-modal__description" data-modal="description"></p>
            <p class="product-modal__fit" data-modal="fit" hidden></p>
            <h3 class="product-modal__subtitle">Характеристики</h3>
            <dl class="spec-table" data-modal="specs"></dl>
          </div>
        </div>
        <div class="modal-footer product-modal__footer">
          <span class="product-modal__price" data-modal="price"></span>
          <a class="btn btn--ghost" href="configurator.html" data-modal="go" hidden>Перейти к сборке</a>
          <button type="button" class="btn btn--accent" data-modal="add">В сборку</button>
        </div>
      </div>
    </div>`;
  document.body.append(el);

  el.querySelector('[data-modal="add"]').addEventListener('click', () => {
    const product = getProduct(el.dataset.productId);
    if (product) addToBuild(product);
  });

  productModal = { el, instance: new bootstrap.Modal(el) };
  return productModal;
}

function fillProductModal(product) {
  const { el } = ensureProductModal();
  el.dataset.productId = product.id;
  const q = (name) => el.querySelector(`[data-modal="${name}"]`);

  q('category').textContent = `${getCategory(product.category).name} · ${product.brand}`;
  q('title').textContent = product.name;
  q('media').innerHTML = productImage(product);
  q('caption').hidden = Boolean(MODEL_PHOTOS[product.id]);
  const conflicts = checkCandidate(product, BuildStore.read());
  q('fit').hidden = !conflicts.length;
  q('fit').textContent = conflicts.map((result) => result.text).join(' ');
  q('tags').innerHTML = renderTags(product.tags, 'product-modal');
  q('description').textContent = product.description;
  q('price').textContent = formatPrice(product.price);
  q('specs').innerHTML = Object.entries(product.specs)
    .map(([key, value]) => `
      <div class="spec-table__row">
        <dt class="spec-table__name">${SPEC_LABELS[key]}</dt>
        <dd class="spec-table__value">${escapeHtml(formatSpecValue(key, value))}</dd>
      </div>`)
    .join('');

  const inBuild = BuildStore.has(product.id);
  const addBtn = q('add');
  addBtn.textContent = inBuild ? 'В сборке ✓' : 'В сборку';
  addBtn.disabled = inBuild;
  q('go').hidden = !inBuild;
}

function openProductModal(productId, trigger) {
  const product = getProduct(productId);
  if (!product) return;
  fillProductModal(product);
  productModal.el.addEventListener('hidden.bs.modal', () => trigger.focus(), { once: true });
  productModal.instance.show(trigger);
}

function addToBuild(product) {
  const previous = BuildStore.add(product);
  const message = previous
    ? `«${product.name}» заменяет «${previous.name}».`
    : `«${product.name}» добавлен в сборку.`;
  showToast(message, 'success', {
    label: 'Отменить',
    onClick: () => {
      if (!BuildStore.has(product.id)) return;
      if (previous) BuildStore.add(previous);
      else BuildStore.remove(product.category);
    },
  });
}

/* Кнопки «Подробнее» и «В сборку» на любых карточках страницы. */
function bindProductActions(root) {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const product = getProduct(button.dataset.id);
    if (!product) return;

    if (button.dataset.action === 'details') openProductModal(product.id, button);
    if (button.dataset.action === 'add') {
      if (BuildStore.has(product.id)) {
        window.location.href = 'configurator.html';
        return;
      }
      addToBuild(product);
    }
  });
}

/* Обновляем состояние кнопок без перерисовки карточек. */
function syncAddButtons(root = document) {
  root.querySelectorAll('[data-action="add"]').forEach((button) => {
    const product = getProduct(button.dataset.id);
    const inBuild = BuildStore.has(button.dataset.id);
    button.classList.toggle('is-added', inBuild);
    button.textContent = inBuild ? 'В сборке ✓' : 'В сборку';
    button.setAttribute('aria-label', `${inBuild ? 'Уже в сборке, открыть конфигуратор' : 'Добавить в сборку'}: ${product.name}`);
  });
  if (productModal?.el.dataset.productId) {
    const product = getProduct(productModal.el.dataset.productId);
    if (product) fillProductModal(product);
  }
}

/* ---------- Шапка, счётчик сборки, кнопка «Наверх» ---------- */

function updateHeaderBuild() {
  const build = BuildStore.read();
  const count = Object.keys(build).length;
  const cart = document.querySelector('[data-build-cart]');
  if (cart) cart.setAttribute('aria-label', count ? `Корзина, ${count} шт., ${formatPrice(BuildStore.total(build))}` : 'Корзина пуста');
}

function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('site-header--scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // На мобильных закрываем меню после перехода по якорю.
  const collapse = header.querySelector('.navbar-collapse');
  header.querySelectorAll('.site-nav__link').forEach((link) => {
    link.addEventListener('click', () => {
      if (collapse.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(collapse).hide();
    });
  });
}

function initToTop() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'to-top';
  button.setAttribute('aria-label', 'Наверх');
  button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 15 6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.append(button);

  const toggle = () => button.classList.toggle('to-top--visible', window.scrollY > 600);
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });

  button.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.querySelector('.skip-link')?.focus({ preventScroll: true });
  });
}

/* Если фото не загрузилось, показываем схематичную иконку категории. */
document.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('product-photo')) return;
  img.insertAdjacentHTML('afterend', categoryIcon(img.dataset.category));
  img.remove();
}, true);

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initToTop();
  updateHeaderBuild();
});

document.addEventListener('build:change', () => {
  updateHeaderBuild();
  syncAddButtons();
});

// Сборка, изменённая в другой вкладке.
window.addEventListener('storage', (event) => {
  if (event.key === BuildStore.KEY) {
    document.dispatchEvent(new CustomEvent('build:change', { detail: BuildStore.read() }));
  }
});
