'use strict';

const account = (selector) => document.querySelector(selector);
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' });
const orderLabels = { active: 'В работе', completed: 'Собран', cancelled: 'Отменён' };
const accountParams = new URLSearchParams(location.search);
const saveRequest = accountParams.get('save');
const checkoutReturn = accountParams.get('return') === 'checkout' ? accountParams.get('build') : null;

let signedInEmail = null;
let registerMode = false;
let editingAddress = null;

function signedInProfile() {
  return readAccounts().find((profile) => profile.email === signedInEmail);
}

function updateProfile(update) {
  const profiles = readAccounts();
  const profile = profiles.find((item) => item.email === signedInEmail);
  if (!profile) throw new Error('Войдите в личный кабинет.');
  update(profile);
  writeAccounts(profiles);
  return profile;
}

function showAccountMessage(selector, message, isError = false) {
  const element = account(selector);
  element.textContent = message;
  element.classList.toggle('account-message--error', isError);
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  if (!crypto.subtle) throw new Error('Откройте BuildPC через localhost или HTTPS.');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 150000, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(new Uint8Array(hash));
}

function buildLink(parts) {
  return `configurator.html?build=${encodeURIComponent(parts.map((part) => part.id).join(','))}`;
}

function saveBuild(profile, build, name) {
  if (!name || !build.parts.length) throw new Error('Укажите название и выберите комплектующие.');
  if (profile.builds.length >= 50) throw new Error('Можно сохранить до 50 сборок.');
  profile.builds.unshift({ ...build, name, id: crypto.randomUUID(), created: Date.now() });
}

function applySaveRequest() {
  if (!new URLSearchParams(location.search).has('save')) return;
  const selected = saveRequest === '1' ? BuildStore.read() : buildFromIds(saveRequest.split(',').slice(0, CATEGORIES.length));
  const build = snapshotBuild(selected);
  const key = (parts) => parts.map((part) => part.id).sort().join(',');
  const exists = signedInProfile().builds.some((entry) => key(entry.parts) === key(build.parts));

  if (exists) {
    showAccountMessage('[data-account-message]', 'Эта сборка уже есть в кабинете.');
  } else if (!performUpdate(
    (profile) => saveBuild(profile, build, `Сборка от ${dateFormat.format(new Date())}`),
    'Сборка сохранена в разделе «Мои сборки».',
  )) {
    return;
  }
  const url = new URL(location.href);
  url.searchParams.delete('save');
  history.replaceState(null, '', url);
}

function recordParts(parts) {
  return `<details><summary>Комплектующие</summary><ul>${parts.map((part) =>
    `<li>${escapeHtml(part.name)} — ${formatPrice(part.price)}</li>`).join('')}</ul></details>`;
}

function listBuilds(profile) {
  account('[data-build-list]').innerHTML = profile.builds.length ? profile.builds.map((entry) => `
    <article class="account-entry">
      <h3>${escapeHtml(entry.name)}</h3>
      <p class="account-entry__meta">${dateFormat.format(new Date(entry.created))} · ${formatPrice(entry.total)}</p>
      ${recordParts(entry.parts)}
      <div class="account-entry__actions">
        <a class="btn btn-sm btn--ghost" href="${buildLink(entry.parts)}">Открыть в конфигураторе</a>
        <button class="btn btn-sm btn--quiet" type="button" data-remove-build="${entry.id}">Удалить</button>
      </div>
      ${buildCanBeOrdered(entry.parts) ? `
        <a class="btn btn-sm btn--accent mt-2" href="checkout.html?${new URLSearchParams({ build: entry.parts.map((part) => part.id).join(',') })}">Оформить заказ</a>`
        : '<p class="account-entry__meta mt-2">Для заказа нужна полная совместимая сборка.</p>'}
    </article>`).join('') : '<p class="text-secondary mb-0">Здесь появятся ваши сохранённые сборки.</p>';
}

function listAddresses(profile) {
  account('[data-address-list]').innerHTML = profile.addresses.length ? profile.addresses.map((entry) => `
    <article class="account-entry">
      <h3>${escapeHtml(entry.label)}</h3>
      <p>${escapeHtml(entry.address)}</p>
      <div class="account-entry__actions">
        <button type="button" class="btn btn-sm btn--ghost" data-edit-address="${entry.id}">Изменить</button>
        <button type="button" class="btn btn-sm btn--quiet" data-remove-address="${entry.id}">Удалить</button>
      </div>
    </article>`).join('') : '<p class="text-secondary mb-0">Сохранённых адресов пока нет.</p>';
}

function listOrders(profile) {
  account('[data-order-list]').innerHTML = profile.orders.length ? profile.orders.map((entry) => `
    <article class="account-entry">
      <h3>№ ${entry.number} · ${escapeHtml(entry.name)}</h3>
      <p class="account-entry__meta">${dateFormat.format(new Date(entry.created))} · ${orderLabels[entry.status]}</p>
      <p><strong>${formatPrice(entry.total)}</strong>${entry.discountRate ? ` · скидка ${entry.discountRate}% (−${formatPrice(entry.subtotal - (entry.itemsTotal ?? entry.total))})` : ''}${entry.address ? ` · ${escapeHtml(entry.address)}` : ''}</p>
      ${entry.delivery ? `<p class="account-entry__meta">${DELIVERY_METHODS[entry.delivery.method]?.label || 'Получение'} · ${formatPrice(entry.delivery.fee)} · ${PAYMENT_METHODS[entry.payment] || 'Оплата при получении'}</p>` : ''}
      ${recordParts(entry.parts)}
      <div class="account-entry__actions">
        <a class="btn btn-sm btn--ghost" href="${buildLink(entry.parts)}">Повторить сборку</a>
        ${entry.status === 'active' ? `
          <button type="button" class="btn btn-sm btn--accent" data-finish-order="${entry.id}">Отметить собранным</button>
          <button type="button" class="btn btn-sm btn--quiet" data-cancel-order="${entry.id}">Отменить заявку</button>` : ''}
      </div>
    </article>`).join('') : '<p class="text-secondary mb-0">Создайте заявку из сохранённой сборки.</p>';
}

function renderAccount(profile) {
  const build = BuildStore.read();
  const count = Object.keys(build).length;
  account('[data-auth]').hidden = true;
  account('[data-dashboard]').hidden = false;
  account('[data-account-benefits]').hidden = true;
  account('[data-profile-name]').textContent = profile.name;
  account('[data-profile-email]').textContent = profile.email;
  account('[data-current-build]').textContent = count
    ? `В конфигураторе ${count} шт. на ${formatPrice(BuildStore.total(build))}.`
    : 'Выберите детали в конфигураторе, чтобы сохранить сборку.';
  account('[data-build-form] button').disabled = !count;
  const loyalty = loyaltyFor(profile);
  account('[data-loyalty-rate]').textContent = `${loyalty.rate}%`;
  account('[data-loyalty-total]').textContent = formatPrice(loyalty.spent);
  account('[data-loyalty-level]').textContent = profile.resident ? 'Статус: резидент' :
    loyalty.rate ? 'Скидка за покупки в этом месяце активна.' :
    `До скидки 5% осталось ${formatPrice(MONTHLY_DISCOUNT_MINIMUM - loyalty.spent)}.`;
  account('[data-resident]').hidden = Boolean(profile.resident);
  listBuilds(profile);
  listAddresses(profile);
  listOrders(profile);
}

function resetAddressForm() {
  editingAddress = null;
  account('[data-address-form]').reset();
  account('[data-address-cancel]').hidden = true;
}

function signOut() {
  if (localStorage.getItem(ACTIVE_PROFILE_KEY) === signedInEmail) localStorage.removeItem(ACTIVE_PROFILE_KEY);
  signedInEmail = null;
  account('[data-dashboard]').hidden = true;
  account('[data-auth]').hidden = false;
  account('[data-account-benefits]').hidden = false;
  account('[data-auth-form]').elements.password.value = '';
  account('[data-auth-form]').elements.passwordConfirm.value = '';
  account('[data-build-form]').reset();
  resetAddressForm();
  showAccountMessage('[data-account-message]', '');
  account('#accountEmail').focus();
}

function performUpdate(update, message) {
  try {
    const profile = updateProfile(update);
    renderAccount(profile);
    showAccountMessage('[data-account-message]', message);
    return true;
  } catch (error) {
    showAccountMessage('[data-account-message]', error.message || 'Не удалось сохранить данные.', true);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const authForm = account('[data-auth-form]');
  const authSubmit = account('[data-auth-submit]');
  const authToggle = account('[data-auth-toggle]');
  const buildForm = account('[data-build-form]');
  const addressForm = account('[data-address-form]');
  const dashboard = account('[data-dashboard]');

  function returnToCheckout() {
    if (!checkoutReturn) return false;
    location.replace(`checkout.html?${new URLSearchParams({ build: checkoutReturn })}`);
    return true;
  }

  function restoreSession() {
    signedInEmail = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const profile = signedInEmail && signedInProfile();
    if (!profile) {
      if (!dashboard.hidden) signOut();
      if (checkoutReturn) showAccountMessage('[data-auth-message]', 'Войдите или создайте профиль, чтобы продолжить заказ.');
      else if (saveRequest) showAccountMessage('[data-auth-message]', 'Войдите, и сборка сохранится автоматически.');
      return;
    }
    if (returnToCheckout()) return;
    renderAccount(profile);
    applySaveRequest();
  }

  try {
    restoreSession();
  } catch {
    showAccountMessage('[data-auth-message]', 'Хранилище браузера недоступно.', true);
  }

  authToggle.addEventListener('click', () => {
    registerMode = !registerMode;
    account('[data-register-field]').hidden = !registerMode;
    authForm.elements.name.required = registerMode;
    account('[data-password-confirm-field]').hidden = !registerMode;
    authForm.elements.passwordConfirm.disabled = !registerMode;
    authForm.elements.passwordConfirm.required = registerMode;
    authForm.elements.passwordConfirm.value = '';
    authForm.elements.password.autocomplete = registerMode ? 'new-password' : 'current-password';
    account('#authTitle').textContent = registerMode ? 'Создать профиль' : 'Войти';
    authSubmit.textContent = registerMode ? 'Зарегистрироваться' : 'Войти';
    authToggle.textContent = registerMode ? 'Уже есть профиль' : 'Создать профиль';
    showAccountMessage('[data-auth-message]', '');
  });

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    authSubmit.disabled = true;
    authToggle.disabled = true;
    const email = authForm.elements.email.value.trim().toLowerCase();
    const password = authForm.elements.password.value;
    try {
      if (password.length < 8 || password.length > 128) throw new Error('Пароль должен содержать от 8 до 128 символов.');
      const profiles = readAccounts();
      let profile = profiles.find((item) => item.email === email);
      if (registerMode) {
        if (password !== authForm.elements.passwordConfirm.value) {
          authForm.elements.passwordConfirm.focus();
          throw new Error('Пароли не совпадают.');
        }
        const name = authForm.elements.name.value.trim();
        if (name.length < 2) throw new Error('Введите имя длиной от двух символов.');
        if (profile) throw new Error('Этот адрес уже зарегистрирован.');
        const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
        const passwordHash = await hashPassword(password, salt);
        profile = { name, email, salt, passwordHash, builds: [], addresses: [], orders: [] };
        const latest = readAccounts();
        if (latest.some((item) => item.email === email)) throw new Error('Этот адрес уже зарегистрирован.');
        writeAccounts([...latest, profile]);
      } else {
        if (!profile || await hashPassword(password, profile.salt) !== profile.passwordHash) {
          throw new Error('Проверьте почту и пароль.');
        }
        if (!localStorage.getItem(ACCOUNTS_KEY)) writeAccounts(profiles);
      }
      localStorage.setItem(ACTIVE_PROFILE_KEY, email);
      signedInEmail = email;
      authForm.elements.password.value = '';
      authForm.elements.passwordConfirm.value = '';
      showAccountMessage('[data-auth-message]', '');
      if (returnToCheckout()) return;
      renderAccount(signedInProfile());
      applySaveRequest();
      account('[data-logout]').focus();
    } catch (error) {
      showAccountMessage('[data-auth-message]', error.message || 'Не удалось открыть профиль.', true);
    } finally {
      authSubmit.disabled = false;
      authToggle.disabled = false;
    }
  });

  buildForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = buildForm.elements.name.value.trim();
    const build = snapshotBuild(BuildStore.read());
    if (performUpdate((profile) => saveBuild(profile, build, name), 'Сборка сохранена.')) buildForm.reset();
  });

  addressForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const label = addressForm.elements.label.value.trim();
    const address = addressForm.elements.address.value.trim();
    if (performUpdate((profile) => {
      if (!label || address.length < 6) throw new Error('Укажите название и полный адрес.');
      const existing = profile.addresses.find((entry) => entry.id === editingAddress);
      if (existing) Object.assign(existing, { label, address });
      else {
        if (profile.addresses.length >= 20) throw new Error('Можно сохранить до 20 адресов.');
        profile.addresses.unshift({ id: crypto.randomUUID(), label, address });
      }
    }, 'Адрес сохранён.')) resetAddressForm();
  });

  dashboard.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const { editAddress, removeAddress, removeBuild, finishOrder, cancelOrder } = button.dataset;
    if (editAddress) {
      const entry = signedInProfile()?.addresses.find((item) => item.id === editAddress);
      if (!entry) return;
      editingAddress = entry.id;
      addressForm.elements.label.value = entry.label;
      addressForm.elements.address.value = entry.address;
      account('[data-address-cancel]').hidden = false;
      addressForm.elements.label.focus();
    }
    if (removeAddress && performUpdate((profile) => {
      profile.addresses = profile.addresses.filter((entry) => entry.id !== removeAddress);
    }, 'Адрес удалён.') && editingAddress === removeAddress) resetAddressForm();
    if (removeBuild) performUpdate((profile) => {
      profile.builds = profile.builds.filter((entry) => entry.id !== removeBuild);
    }, 'Сборка удалена.');
    if (finishOrder || cancelOrder) performUpdate((profile) => {
      const order = profile.orders.find((entry) => entry.id === (finishOrder || cancelOrder));
      if (!order || order.status !== 'active') throw new Error('Заявка уже закрыта.');
      order.status = finishOrder ? 'completed' : 'cancelled';
      if (finishOrder) order.completedAt = Date.now();
    }, finishOrder ? 'Сборка завершена и учтена в сумме за месяц.' : 'Заявка отменена.');
  });

  account('[data-address-cancel]').addEventListener('click', resetAddressForm);
  account('[data-logout]').addEventListener('click', signOut);
  account('[data-resident]').addEventListener('click', () => {
    performUpdate((profile) => { profile.resident = true; }, 'Вы стали резидентом. Скидка 7% применяется к новым заявкам.');
  });
  document.addEventListener('build:change', () => {
    if (!signedInEmail) return;
    const profile = signedInProfile();
    if (profile) renderAccount(profile);
    else signOut();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) restoreSession();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === ACTIVE_PROFILE_KEY || event.key === ACCOUNTS_KEY || event.key === null) restoreSession();
  });
});
