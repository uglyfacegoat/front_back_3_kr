'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MESSAGE_MAX = 1000;

const RULES = {
  name(value) {
    const v = value.trim();
    if (!v) return 'Введите имя.';
    if (v.length < 2) return 'Имя должно быть не короче 2 символов.';
    if (v.length > 60) return 'Укажите имя длиной до 60 символов.';
    return '';
  },
  email(value) {
    const v = value.trim();
    if (!v) return 'Введите электронную почту.';
    if (!EMAIL_RE.test(v)) return 'Проверьте адрес: например, name@mail.ru.';
    return '';
  },
  topic(value) {
    return value ? '' : 'Выберите тему обращения.';
  },
  message(value) {
    const v = value.trim();
    if (!v) return 'Напишите сообщение.';
    if (v.length < 10) return `Слишком коротко: ещё ${10 - v.length} симв. минимум.`;
    if (v.length > MESSAGE_MAX) return `Не больше ${MESSAGE_MAX} символов.`;
    return '';
  },

};

function validateField(field) {
  const rule = RULES[field.name];
  if (!rule) return true;
  const error = rule(field.value, field);
  const feedback = document.getElementById(`${field.id}Error`);
  field.classList.toggle('is-invalid', Boolean(error));
  field.classList.toggle('is-valid', !error && field.type !== 'checkbox');
  field.setAttribute('aria-invalid', String(Boolean(error)));
  if (feedback) feedback.textContent = error;
  return !error;
}

function showStatus(box, type, html) {
  box.className = `alert alert-${type}`;
  box.innerHTML = html;
  box.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-feedback-form]');
  const status = document.querySelector('[data-form-status]');
  const message = form.elements.message;
  const counter = document.querySelector('[data-counter]');
  const attachHint = document.querySelector('[data-attach-hint]');
  const touched = new Set();

  document.querySelectorAll('[data-feedback-topic]').forEach((button) => {
    button.addEventListener('click', () => {
      const topic = form.elements.topic;
      topic.value = button.dataset.feedbackTopic;
      validateField(topic);
      status.className = 'alert d-none';
      const firstField = [form.elements.name, form.elements.email].find((field) => !field.value.trim());
      (firstField || message).focus();
    });
  });

  const updateAttachHint = () => {
    const count = Object.keys(BuildStore.read()).length;
    form.elements.attachBuild.disabled = count === 0;
    attachHint.textContent = count ? `(${count} шт., ${formatPrice(BuildStore.total())})` : '(сборка пуста)';
  };
  updateAttachHint();
  document.addEventListener('build:change', updateAttachHint);

  const updateCounter = () => {
    const length = message.value.length;
    counter.textContent = `${length} / ${MESSAGE_MAX}`;
    counter.classList.toggle('feedback__counter--over', length > MESSAGE_MAX);
  };
  message.addEventListener('input', updateCounter);

  // Ошибку показываем после того, как пользователь покинул поле, а не на первом символе.
  form.addEventListener('focusout', (event) => {
    if (!RULES[event.target.name]) return;
    touched.add(event.target.name);
    validateField(event.target);
  });
  form.addEventListener('input', (event) => {
    if (touched.has(event.target.name)) validateField(event.target);
  });
  form.addEventListener('change', (event) => {
    if (event.target.type === 'checkbox' || event.target.tagName === 'SELECT') {
      touched.add(event.target.name);
      validateField(event.target);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = Object.keys(RULES).map((name) => form.elements[name]);
    const invalid = fields.filter((field) => !validateField(field));
    fields.forEach((f) => touched.add(f.name));

    if (invalid.length) {
      const list = invalid
        .map((f) => `<li>${escapeHtml(document.getElementById(`${f.id}Error`).textContent)}</li>`)
        .join('');
      showStatus(status, 'danger', `<strong>Форма заполнена с ошибками (${invalid.length}).</strong><ul class="mb-0 mt-1">${list}</ul>`);
      invalid[0].focus();
      return;
    }

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const topic = form.elements.topic.selectedOptions[0].textContent;
    const body = [`Имя: ${name}`, `Почта для ответа: ${email}`, '', message.value.trim()];
    const build = BuildStore.read();
    if (form.elements.attachBuild.checked && Object.keys(build).length) {
      body.push('', formatBuildText(build));
    }
    const text = body.join('\r\n');

    if (event.submitter?.value === 'download') {
      downloadText('buildpc-message.txt', `Тема: ${topic}\r\n\r\n${text}`);
      showStatus(status, 'success', 'Текст обращения подготовлен к скачиванию.');
      return;
    }

    const recipient = document.querySelector('[data-contact-email]').textContent.trim();
    const draft = `mailto:${recipient}?subject=${encodeURIComponent('BuildPC — ' + topic)}&body=${encodeURIComponent(text)}`;
    status.className = 'alert alert-info';
    status.replaceChildren('Письмо подготовлено. Отправьте его из почтового приложения. ');
    const link = document.createElement('a');
    link.href = draft;
    link.className = 'btn btn-sm btn--ghost';
    link.textContent = 'Открыть письмо ещё раз';
    status.append(link);
    status.focus();
    window.location.href = draft;
  });
});
