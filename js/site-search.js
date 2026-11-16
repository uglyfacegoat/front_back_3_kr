'use strict';

const PAGE_SEARCH_INDEX = [
  { title: 'Главная', url: 'index.html', hint: 'Готовые сборки, подбор ПК и отзывы' },
  { title: 'Готовые сборки', url: 'index.html#builds', hint: 'Игровой ПК, для работы и учёбы' },
  { title: 'Каталог комплектующих', url: 'catalog.html', hint: 'Процессоры, видеокарты, память и другие детали' },
  { title: 'Конфигуратор', url: 'configurator.html', hint: 'Проверка совместимости, бюджет и сохранение сборки' },
  { title: 'Доставка и самовывоз', url: 'delivery.html', hint: 'Тарифы, Москва, МКАД, СДЭК, Яндекс Доставка' },
  { title: 'Контакты', url: 'contacts.html', hint: 'Телефон, почта, Главный менеджер, карта, адрес и форма' },
  { title: 'Личный кабинет', url: 'account.html', hint: 'Вход, регистрация, адреса, заказы и скидки' },
  { title: 'Частые вопросы', url: 'index.html#faq', hint: 'Ответы о комплектации и ценах' },
];

document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('[data-site-search]');
  if (!trigger) return;

  const dialog = document.createElement('div');
  dialog.className = 'modal fade';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-labelledby', 'siteSearchTitle');
  dialog.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title fs-5" id="siteSearchTitle">Поиск по сайту</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть поиск"></button>
        </div>
        <div class="modal-body">
          <label class="form-label" for="siteSearch">Страница или комплектующее</label>
          <input class="form-control" type="search" id="siteSearch" autocomplete="off" maxlength="80" placeholder="Например, доставка или Ryzen">
          <div class="site-search-results list-group mt-3" data-site-search-results aria-live="polite"></div>
        </div>
      </div>
    </div>`;
  document.body.append(dialog);
  const modal = new bootstrap.Modal(dialog);
  const input = dialog.querySelector('input');
  const results = dialog.querySelector('[data-site-search-results]');
  const matches = (terms, title, hint) => terms.every((term) => `${title} ${hint}`.toLowerCase().includes(term));

  function renderSearch() {
    const query = input.value.trim();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const pages = PAGE_SEARCH_INDEX.filter(({ title, hint }) => matches(terms, title, hint));
    const products = !query ? [] : PRODUCTS.filter((product) =>
      matches(terms, product.name, `${getCategory(product.category).plural} ${product.brand}`),
    ).slice(0, 8).map((product) => ({
      title: product.name,
      url: `catalog.html?${new URLSearchParams({ q: product.name })}`,
      hint: `${getCategory(product.category).plural} · ${formatPrice(product.price)}`,
    }));
    results.innerHTML = [...pages, ...products].map(({ title, url, hint }) => `
      <a class="list-group-item list-group-item-action" href="${escapeHtml(url)}">
        <strong>${escapeHtml(title)}</strong><small>${escapeHtml(hint)}</small>
      </a>`).join('') || '<p class="text-secondary mb-0">Ничего не найдено. Попробуйте другое название.</p>';
  }

  trigger.addEventListener('click', () => modal.show(trigger));
  dialog.addEventListener('shown.bs.modal', () => input.focus());
  dialog.addEventListener('hidden.bs.modal', () => trigger.focus());
  input.addEventListener('input', renderSearch);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') results.querySelector('a')?.click();
  });
  renderSearch();
});
