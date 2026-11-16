'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const zoneSelect = document.querySelector('#calcZone');
  const methodSelect = document.querySelector('#calcMethod');
  const map = document.querySelector('[data-delivery-map]');
  zoneSelect.innerHTML = Object.entries(DELIVERY_ZONES)
    .map(([id, zone]) => `<option value="${id}">${zone.label}</option>`).join('');
  methodSelect.innerHTML = Object.entries(DELIVERY_METHODS)
    .map(([id, method]) => `<option value="${id}">${method.label}</option>`).join('');
  map.href = PICKUP_MAP;
  map.textContent = PICKUP_ADDRESS;
  document.querySelector('[data-delivery-rates]').innerHTML = Object.entries(DELIVERY_ZONES).map(([id, zone]) => `
    <tr><th scope="row">${zone.label}</th><td>${formatPrice(deliveryPrice('cdek', id))}</td>
      <td>${formatPrice(deliveryPrice('yandex', id))}</td><td>${zone.days}</td></tr>`).join('');

  function renderRate() {
    const price = deliveryPrice(methodSelect.value, zoneSelect.value);
    const pickup = methodSelect.value === 'pickup';
    zoneSelect.disabled = pickup;
    document.querySelector('[data-delivery-total]').textContent = price ? formatPrice(price) : 'Бесплатно';
    document.querySelector('[data-delivery-days]').textContent = pickup ? 'Самовывоз' : DELIVERY_ZONES[zoneSelect.value].days;
  }

  methodSelect.addEventListener('change', renderRate);
  zoneSelect.addEventListener('change', renderRate);
  renderRate();
});
