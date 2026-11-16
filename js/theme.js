'use strict';

const THEME_KEY = 'buildpc:theme';
const pageRoot = document.documentElement;
let preferredTheme = 'light';
try {
  if (localStorage.getItem(THEME_KEY) === 'dark') preferredTheme = 'dark';
} catch {
  // Переключение можно использовать и без сохранения.
}
pageRoot.dataset.bsTheme = preferredTheme;

document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;

  function setTheme(theme) {
    pageRoot.dataset.bsTheme = theme;
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    button.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
  }

  setTheme(preferredTheme);
  button.addEventListener('click', () => {
    const next = pageRoot.dataset.bsTheme === 'dark' ? 'light' : 'dark';
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => setTheme(next));
    } else {
      setTheme(next);
    }
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Тема изменена для открытой страницы.
    }
  });
});
