'use strict';

const PICKUP_ADDRESS = 'Москва, Волгоградский проспект, 21, стр. 10';
const PICKUP_MAP = 'https://yandex.ru/maps/?text=' + encodeURIComponent(PICKUP_ADDRESS);
const DELIVERY_ZONES = {
  moscow: { label: 'Москва в пределах МКАД', days: '1–2 рабочих дня' },
  outside: { label: 'За МКАД, до 30 км', days: '2–3 рабочих дня' },
  city: { label: 'Другие города России', days: '3–7 рабочих дней' },
};
const DELIVERY_METHODS = {
  pickup: { label: 'Самовывоз', rates: { moscow: 0, outside: 0, city: 0 } },
  cdek: { label: 'СДЭК', rates: { moscow: 490, outside: 790, city: 1190 } },
  yandex: { label: 'Яндекс Доставка', rates: { moscow: 590, outside: 890, city: 1390 } },
};

function deliveryPrice(method, zone) {
  return DELIVERY_METHODS[method]?.rates[zone];
}

const PAYMENT_METHODS = {
  cash: 'Наличными при получении',
  card: 'Картой при получении',
  online: 'Картой онлайн',
};
