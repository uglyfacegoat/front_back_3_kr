'use strict';

const GUEST_ORDERS_KEY = 'buildpc:guest-orders:v1';
const orderPage = (selector) => document.querySelector(selector);
const checkoutParams = new URLSearchParams(location.search);

function choice(name, values) {
  return Object.entries(values).map(([id, label], index) => `
    <label class="checkout-choice">
      <input class="form-check-input" type="radio" name="${name}" value="${id}" ${index === 0 ? 'checked' : ''}>
      <span>${label}</span>
    </label>`).join('');
}

function orderName(build) {
  const ids = new Set(build.parts.map((part) => part.id));
  const preset = PRESETS.find((entry) => entry.parts.length === ids.size && entry.parts.every((id) => ids.has(id)));
  return preset?.title || 'Своя сборка';
}

document.addEventListener('DOMContentLoaded', () => {
  const requested = checkoutParams.get('build');
  const selected = requested ? buildFromIds(requested.split(',').slice(0, CATEGORIES.length)) : BuildStore.read();
  const build = snapshotBuild(selected);
  const form = orderPage('[data-checkout]');
  if (!buildCanBeOrdered(build.parts)) {
    orderPage('[data-checkout-empty]').hidden = false;
    return;
  }

  let profile = null;
  try {
    profile = activeProfile();
  } catch {
    // Без доступного хранилища форма остаётся доступна до попытки сохранения.
  }

  const discountRate = profile ? loyaltyFor(profile).rate : 0;
  const discount = Math.round(build.total * discountRate / 100);
  const itemsTotal = build.total - discount;
  const buildIds = build.parts.map((part) => part.id).join(',');
  const login = orderPage('[data-order-login]');
  const profileLine = orderPage('[data-order-profile]');
  const status = orderPage('[data-order-status]');
  const pickup = orderPage('[data-checkout-map]');

  login.href = `account.html?${new URLSearchParams({ return: 'checkout', build: buildIds })}`;
  login.hidden = Boolean(profile);
  profileLine.hidden = !profile;
  profileLine.textContent = profile ? `Профиль: ${profile.name} · ${profile.email}` : '';
  orderPage('[data-order-guest]').hidden = Boolean(profile);
  form.elements.phone.required = !profile;
  pickup.href = PICKUP_MAP;
  pickup.textContent = PICKUP_ADDRESS;

  orderPage('[data-delivery-options]').innerHTML = choice('method', Object.fromEntries(
    Object.entries(DELIVERY_METHODS).map(([id, method]) => [id, method.label]),
  ));
  orderPage('[data-payment-options]').innerHTML = choice('payment', PAYMENT_METHODS);
  orderPage('[data-delivery-zone]').innerHTML = Object.entries(DELIVERY_ZONES)
    .map(([id, zone]) => `<option value="${id}">${zone.label}</option>`).join('');

  const addresses = profile?.addresses || [];
  form.elements.savedAddress.innerHTML = '<option value="">Ввести новый адрес</option>' + addresses
    .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)} — ${escapeHtml(entry.address)}</option>`).join('');
  orderPage('[data-saved-address]').hidden = !addresses.length;

  orderPage('[data-order-parts]').innerHTML = build.parts.map((part) =>
    `<li><span>${escapeHtml(part.name)}</span><strong>${formatPrice(part.price)}</strong></li>`,
  ).join('');
  orderPage('[data-order-subtotal]').textContent = formatPrice(build.total);
  orderPage('[data-order-discount-row]').hidden = !discount;
  orderPage('[data-order-discount]').textContent = `−${formatPrice(discount)} (${discountRate}%)`;

  function updateTotal() {
    const method = form.elements.method.value;
    const zone = form.elements.zone.value;
    const isPickup = method === 'pickup';
    const saved = addresses.find((entry) => entry.id === form.elements.savedAddress.value);
    orderPage('[data-pickup]').hidden = !isPickup;
    orderPage('[data-delivery-fields]').hidden = isPickup;
    orderPage('[data-manual-address]').hidden = Boolean(saved);
    form.elements.address.disabled = isPickup || Boolean(saved);
    form.elements.address.required = !form.elements.address.disabled;
    const fee = deliveryPrice(method, zone) ?? 0;
    orderPage('[data-order-fee]').textContent = fee ? formatPrice(fee) : 'Бесплатно';
    orderPage('[data-order-total]').textContent = formatPrice(itemsTotal + fee);
    return { method, zone, fee, address: isPickup ? PICKUP_ADDRESS : saved?.address || form.elements.address.value.trim() };
  }

  form.addEventListener('change', updateTotal);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const delivery = updateTotal();
    const phone = form.elements.phone.value.trim();
    const digits = phone.replace(/\D/g, '');
    if ((phone || !profile) && (!/^[+\d()\s-]+$/.test(phone) || digits.length < 10 || digits.length > 15)) {
      status.textContent = 'Проверьте номер телефона. Нужно от 10 до 15 цифр.';
      form.elements.phone.focus();
      return;
    }
    if (!delivery.address || delivery.address.length < 6) {
      status.textContent = 'Укажите адрес доставки.';
      form.elements.address.focus();
      return;
    }

    try {
      const current = activeProfile();
      if (profile && current?.email !== profile.email) throw new Error('Профиль изменился. Обновите страницу и проверьте заказ.');
      const orders = profile ? current.orders : JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY) || '[]');
      const number = (orders[0]?.number || 0) + 1;
      orders.unshift({
        ...build,
        name: orderName(build),
        subtotal: build.total,
        itemsTotal,
        discountRate,
        total: itemsTotal + delivery.fee,
        id: crypto.randomUUID(),
        number,
        created: Date.now(),
        address: delivery.address,
        phone,
        delivery,
        payment: form.elements.payment.value,
        status: 'active',
      });
      if (profile) {
        const profiles = readAccounts();
        const updated = profiles.find((entry) => entry.email === profile.email);
        updated.orders = orders;
        writeAccounts(profiles);
      } else {
        localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
      }
      status.textContent = `Заявка № ${number} сохранена. Итого ${formatPrice(itemsTotal + delivery.fee)}.`;
      form.querySelectorAll('input, select, button[type="submit"]').forEach((field) => { field.disabled = true; });
      status.focus();
    } catch (error) {
      status.textContent = error.message || 'Не удалось сохранить заявку.';
      status.focus();
    }
  });

  updateTotal();
  form.hidden = false;
});
