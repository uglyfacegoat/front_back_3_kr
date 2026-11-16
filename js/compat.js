'use strict';

/*
 * Базовая проверка совместимости. Каждое правило сравнивает пару категорий
 * и возвращает результат с уровнем: ok, warn или error.
 * parts — какие слоты затронуты, чтобы подсветить их в конфигураторе.
 */

const PSU_BASE_LOAD = 100; // плата, память, диски, вентиляторы
const PSU_RESERVE = 1.3;   // запас 30% на пики нагрузки

function buildFromPreset(preset) {
  return buildFromIds(preset.parts);
}

function buildFromIds(ids) {
  const build = {};
  ids.forEach((id) => {
    const product = getProduct(id);
    if (product) build[product.category] = id;
  });
  return build;
}

function estimatePower(parts) {
  const load = (parts.cpu?.specs.power || 0) + (parts.gpu?.specs.power || 0) + PSU_BASE_LOAD;
  const recommended = Math.ceil((load * PSU_RESERVE) / 50) * 50;
  return { load, recommended };
}

function rule(ok, parts, okText, failText, failLevel = 'error') {
  return ok
    ? { level: 'ok', parts, text: okText }
    : { level: failLevel, parts, text: failText };
}

function checkBuild(build) {
  const parts = {};
  for (const [category, id] of Object.entries(build)) parts[category] = getProduct(id);
  const { cpu, motherboard, ram, gpu, cooler, psu, storage } = parts;
  const pcCase = parts.case;
  const results = [];

  if (cpu && motherboard) {
    results.push(rule(cpu.specs.socket === motherboard.specs.socket, ['cpu', 'motherboard'],
      `Сокет процессора и платы совпадает: ${cpu.specs.socket}.`,
      `Процессор на сокете ${cpu.specs.socket} не встанет в плату с сокетом ${motherboard.specs.socket}.`));
  }

  if (ram && motherboard) {
    results.push(rule(ram.specs.memoryType === motherboard.specs.memoryType, ['ram', 'motherboard'],
      `Память ${ram.specs.memoryType} поддерживается платой.`,
      `Плата работает с ${motherboard.specs.memoryType}, а выбрана память ${ram.specs.memoryType}.`));
  }

  if (storage && motherboard && storage.specs.driveType === 'SSD NVMe') {
    results.push(rule(motherboard.specs.m2 > 0, ['storage', 'motherboard'],
      'На материнской плате есть разъём M.2 для NVMe.',
      'Для этого накопителя нужен разъём M.2 с поддержкой NVMe.'));
  }

  if (cooler && cpu) {
    results.push(rule(cooler.specs.sockets.includes(cpu.specs.socket), ['cooler', 'cpu'],
      `Кулер подходит под сокет ${cpu.specs.socket}.`,
      `Кулер не поддерживает сокет ${cpu.specs.socket}.`));
    if (cpu.specs.power > cooler.specs.maxTdp) {
      results.push({ level: 'warn', parts: ['cooler', 'cpu'],
        text: `Кулер рассчитан на ${cooler.specs.maxTdp} Вт, а процессор выделяет до ${cpu.specs.power} Вт — возможен перегрев.` });
    }
  }

  if (pcCase && motherboard) {
    results.push(rule(pcCase.specs.supports.includes(motherboard.specs.formFactor), ['case', 'motherboard'],
      `Плата ${motherboard.specs.formFactor} помещается в корпус.`,
      `Корпус рассчитан на ${pcCase.specs.supports.join('/')}, а плата — ${motherboard.specs.formFactor}.`));
  }

  if (pcCase && gpu) {
    results.push(rule(gpu.specs.length <= pcCase.specs.maxGpuLength, ['case', 'gpu'],
      `Видеокарта (${gpu.specs.length} мм) помещается в корпус.`,
      `Видеокарта длиной ${gpu.specs.length} мм не влезет: корпус вмещает до ${pcCase.specs.maxGpuLength} мм.`));
  }

  if (pcCase && cooler) {
    if (cooler.specs.radiator) {
      results.push(rule(cooler.specs.radiator <= pcCase.specs.maxRadiator, ['case', 'cooler'],
        `Радиатор ${cooler.specs.radiator} мм можно установить в корпус.`,
        `Корпус поддерживает радиаторы до ${pcCase.specs.maxRadiator} мм, а выбран ${cooler.specs.radiator} мм.`));
    } else {
      results.push(rule(cooler.specs.height <= pcCase.specs.maxCoolerHeight, ['case', 'cooler'],
        `Кулер высотой ${cooler.specs.height} мм помещается в корпус.`,
        `Кулер высотой ${cooler.specs.height} мм не влезет: корпус вмещает до ${pcCase.specs.maxCoolerHeight} мм.`));
    }
  }

  if (psu && (cpu || gpu)) {
    const { recommended } = estimatePower(parts);
    results.push(rule(psu.specs.wattage >= recommended, ['psu', 'cpu', 'gpu'],
      `Мощности блока питания хватает: ${psu.specs.wattage} Вт при рекомендуемых ${recommended} Вт.`,
      `Для этой сборки рекомендуется блок от ${recommended} Вт, выбран ${psu.specs.wattage} Вт.`, 'warn'));
  }

  if (cpu && !gpu && !cpu.specs.igpu) {
    results.push({ id: 'missing-gpu', level: 'error', parts: ['gpu', 'cpu'], text: 'У процессора нет встроенной графики — без видеокарты не будет изображения.' });
  }

  if (storage?.specs.driveType === 'HDD') {
    results.push({ level: 'warn', parts: ['storage'], text: 'Система на жёстком диске будет загружаться медленно — лучше выбрать SSD.' });
  }

  return results;
}

/* Проблемы, которые появятся, если поставить кандидата в сборку. */
function checkCandidate(product, build) {
  return checkBuild({ ...build, [product.category]: product.id })
    .filter((r) => r.level !== 'ok' && r.parts.includes(product.category));
}
