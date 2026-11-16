'use strict';

const ACCOUNTS_KEY = 'buildpc:accounts:v1';
const ACTIVE_PROFILE_KEY = 'buildpc:active-profile:v1';
const MONTHLY_DISCOUNT_MINIMUM = 100000;
const DEFAULT_PROFILE = {
  name: 'Завгороднев Ярослав Александрович',
  email: 'unit90780@gmail.com',
  salt: 'e9869c295655c47c84739b8b71e296c0',
  passwordHash: '6db6e669e2f678aa8969ac99f273edc36265404399321547c06432412db7d83a',
  builds: [],
  addresses: [],
  orders: [],
};

function readAccounts() {
  const data = localStorage.getItem(ACCOUNTS_KEY);
  return data ? JSON.parse(data) : [structuredClone(DEFAULT_PROFILE)];
}

function writeAccounts(profiles) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(profiles));
}

function activeProfile() {
  const email = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return email ? readAccounts().find((profile) => profile.email === email) || null : null;
}

function loyaltyFor(profile, now = new Date()) {
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const spent = profile.orders.reduce((total, order) => {
    const date = new Date(order.completedAt ?? order.created);
    return order.status === 'completed' && date >= month && date < nextMonth ? total + (order.itemsTotal ?? order.total) : total;
  }, 0);
  return { spent, rate: profile.resident ? 7 : spent >= MONTHLY_DISCOUNT_MINIMUM ? 5 : 0 };
}

function snapshotBuild(build) {
  const parts = CATEGORIES.filter((category) => build[category.id]).map((category) => {
    const product = getProduct(build[category.id]);
    return { id: product.id, name: product.name, price: product.price };
  });
  return { parts, total: BuildStore.total(build) };
}

function buildCanBeOrdered(parts) {
  const build = buildFromIds(parts.map((part) => part.id));
  return CATEGORIES.every((category) => !category.required || build[category.id]) &&
    !checkBuild(build).some((check) => check.level === 'error');
}

