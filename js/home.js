'use strict';

function renderPresetParts(preset) {
  return preset.parts
    .map(getProduct)
    .filter(Boolean)
    .map((p) => `
      <li class="preset-card__part">
        <span>${getCategory(p.category).name}</span>
        <span>${escapeHtml(p.name)}</span>
      </li>`)
    .join('');
}

function renderPresets(container) {
  const lowestPrice = Math.min(...PRESETS.map(presetTotal));
  container.innerHTML = PRESETS.map((preset) => `
    <article class="preset-card">
      <figure class="preset-card__photo">
        <div class="preset-gallery" data-preset-gallery="${preset.id}" data-frame="1">
          <button class="btn btn-sm btn--ghost preset-gallery__arrow" type="button" data-frame-step="-1"
            aria-label="Предыдущее фото: ${escapeHtml(preset.title)}">‹</button>
          <img src="img/products/pc-${preset.id}-1.png" alt="Системный блок, фото 1. ${escapeHtml(preset.title)}" loading="lazy" decoding="async">
          <button class="btn btn-sm btn--ghost preset-gallery__arrow" type="button" data-frame-step="1"
            aria-label="Следующее фото: ${escapeHtml(preset.title)}">›</button>
        </div>
        <figcaption><span>Пример внешнего вида</span><span data-frame-count aria-live="polite">1 из ${preset.photos}</span></figcaption>
      </figure>
      <div class="preset-card__head">
        <h3 class="preset-card__title">${preset.title}</h3>
        ${presetTotal(preset) === lowestPrice ? '<span class="tag tag--budget">Самая доступная</span>' : ''}
        ${preset.id === 'gaming' ? '<span class="tag tag--popular">Популярный выбор</span>' : ''}
      </div>
      <p class="preset-card__summary">${preset.summary}</p>
      <ul class="preset-card__parts">${renderPresetParts(preset)}</ul>
      <div class="preset-card__foot">
        <span class="preset-card__price">${formatPrice(presetTotal(preset))}</span>
        <div class="preset-card__actions">
          <a class="btn btn--ghost" href="configurator.html?preset=${preset.id}">Открыть сборку</a>
          <a class="btn btn--accent" href="checkout.html?${new URLSearchParams({ build: preset.parts.join(',') })}">Заказать</a>
        </div>
      </div>
    </article>`).join('');

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-frame-step]');
    if (!button) return;
    const gallery = button.closest('[data-preset-gallery]');
    const preset = getPreset(gallery.dataset.presetGallery);
    const step = Number(button.dataset.frameStep);
    const frame = (Number(gallery.dataset.frame) - 1 + step + preset.photos) % preset.photos + 1;
    gallery.dataset.frame = frame;
    const image = gallery.querySelector('img');
    image.src = `img/products/pc-${preset.id}-${frame}.png`;
    image.alt = `Системный блок, фото ${frame}. ${preset.title}`;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      image.animate([{ opacity: .35, transform: 'translateX(5px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 240 });
    }
    gallery.closest('figure').querySelector('[data-frame-count]').textContent = `${frame} из ${preset.photos}`;
  });
}

function renderHomeCategories(container) {
  container.innerHTML = CATEGORIES.map((category) => {
    const products = PRODUCTS.filter((product) => product.category === category.id);
    const sample = products[0];
    return `
      <li>
        <a class="home-categories__link" href="catalog.html?category=${category.id}">
          <span class="home-categories__photo">${productImage(sample)}</span>
          <span>${category.plural}<small class="home-categories__count">${products.length} позиций</small></span>
        </a>
      </li>`;
  }).join('');
}

function initReviews() {
  const ticker = document.querySelector('[data-review-ticker]');
  const track = ticker.querySelector('.review-ticker__track');
  const copy = track.firstElementChild.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('button').forEach((button) => { button.tabIndex = -1; });
  track.append(copy);
  ticker.classList.add('review-ticker--ready');

  const button = document.querySelector('[data-review-toggle]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const applyMotionPreference = () => { button.hidden = motion.matches; };
  applyMotionPreference();
  motion.addEventListener('change', applyMotionPreference);
  function syncPause(paused) {
    ticker.classList.toggle('review-ticker--paused', paused);
    button.textContent = paused ? 'Продолжить' : 'Пауза';
    button.setAttribute('aria-pressed', String(paused));
  }
  button.addEventListener('click', () => syncPause(!ticker.classList.contains('review-ticker--paused')));
  ticker.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-review-more]');
    if (!trigger) return;
    const card = trigger.closest('.review-card');
    const index = [...card.parentElement.children].indexOf(card);
    const primary = track.firstElementChild.children[index].querySelector('[data-review-more]');
    const expanded = primary.getAttribute('aria-expanded') === 'true';
    [track.firstElementChild, copy].forEach((group) => {
      const entry = group.children[index];
      const more = entry.querySelector('[data-review-more]');
      entry.querySelector('.review-card__extra').hidden = expanded;
      more.setAttribute('aria-expanded', String(!expanded));
      more.textContent = expanded ? 'Развернуть' : 'Свернуть';
    });
    if (!expanded) {
      syncPause(true);
      primary.focus({ preventScroll: true });
      ticker.scrollLeft = primary.closest('.review-card').offsetLeft;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomeCategories(document.querySelector('[data-home-categories]'));
  const popular = document.querySelector('[data-popular]');
  popular.innerHTML = PRODUCTS
    .filter((p) => p.tags.includes('popular'))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8)
    .map(renderProductCard)
    .join('');
  bindProductActions(popular);

  renderPresets(document.querySelector('[data-presets]'));
  initReviews();
});
