'use strict';

/*
 * Справочник комплектующих. Цены используются для оценки бюджета.
 * power — оценка потребления в ваттах, нужна для расчёта блока питания.
 * Размеры (длина видеокарты, высота кулера) нужны для проверки корпуса.
 */

const CATEGORIES = [
  { id: 'cpu', name: 'Процессор', plural: 'Процессоры', required: true },
  { id: 'motherboard', name: 'Материнская плата', plural: 'Материнские платы', required: true },
  { id: 'ram', name: 'Оперативная память', plural: 'Оперативная память', required: true },
  { id: 'gpu', name: 'Видеокарта', plural: 'Видеокарты', required: false },
  { id: 'storage', name: 'Накопитель', plural: 'Накопители', required: true },
  { id: 'cooler', name: 'Охлаждение', plural: 'Охлаждение', required: true },
  { id: 'psu', name: 'Блок питания', plural: 'Блоки питания', required: true },
  { id: 'case', name: 'Корпус', plural: 'Корпуса', required: true },
];

const TAGS = {
  gaming: 'Для игр',
  budget: 'Бюджетный',
  popular: 'Популярный',
  work: 'Для работы',
};

const SPEC_LABELS = {
  socket: 'Сокет',
  cores: 'Ядра / потоки',
  frequency: 'Частота',
  igpu: 'Встроенная графика',
  chipset: 'Чипсет',
  memoryType: 'Тип памяти',
  formFactor: 'Форм-фактор',
  slots: 'Слоты памяти',
  m2: 'Слоты M.2',
  capacity: 'Объём',
  speed: 'Частота',
  kit: 'Комплект',
  vram: 'Видеопамять',
  length: 'Длина',
  interface: 'Интерфейс',
  driveType: 'Тип',
  read: 'Чтение',
  wattage: 'Мощность',
  certificate: 'Сертификат',
  modular: 'Модульные кабели',
  coolerType: 'Тип',
  sockets: 'Совместимые сокеты',
  maxTdp: 'Отвод тепла',
  height: 'Высота',
  radiator: 'Радиатор',
  supports: 'Платы',
  maxGpuLength: 'Видеокарта до',
  maxCoolerHeight: 'Кулер до',
  maxRadiator: 'Радиатор до',
  fans: 'Вентиляторы',
  power: 'Потребление',
};

const SPEC_UNITS = {
  power: 'Вт',
  wattage: 'Вт',
  maxTdp: 'Вт',
  length: 'мм',
  height: 'мм',
  radiator: 'мм',
  maxGpuLength: 'мм',
  maxCoolerHeight: 'мм',
  maxRadiator: 'мм',
};

/* Короткий конструктор, чтобы список товаров читался как таблица. */
function item(id, category, brand, name, price, rating, tags, specs, description) {
  return { id, category, brand, name, price, rating, tags, specs, description };
}

const PRODUCTS = [
  // ---------- Процессоры ----------
  item('cpu-r5-5600', 'cpu', 'AMD', 'AMD Ryzen 5 5600', 9990, 85, ['budget'],
    { socket: 'AM4', cores: '6 / 12', frequency: '3,5–4,4 ГГц', igpu: false, power: 65 },
    'Доступный процессор на платформе AM4 с памятью DDR4. Нужна отдельная видеокарта.'),
  item('cpu-r7-5700x3d', 'cpu', 'AMD', 'AMD Ryzen 7 5700X3D', 21990, 82, ['gaming'],
    { socket: 'AM4', cores: '8 / 16', frequency: '3,0–4,1 ГГц', igpu: false, power: 105 },
    'Игровой процессор с увеличенным кешем для старой платформы AM4.'),
  item('cpu-r5-7600', 'cpu', 'AMD', 'AMD Ryzen 5 7600', 18990, 98, ['popular', 'gaming'],
    { socket: 'AM5', cores: '6 / 12', frequency: '3,8–5,1 ГГц', igpu: true, power: 65 },
    'Шестиядерный процессор на AM5 с поддержкой DDR5. Хороший баланс цены и производительности.'),
  item('cpu-r7-7700', 'cpu', 'AMD', 'AMD Ryzen 7 7700', 26990, 80, [],
    { socket: 'AM5', cores: '8 / 16', frequency: '3,8–5,3 ГГц', igpu: true, power: 65 },
    'Восемь ядер при умеренном энергопотреблении. Подходит и для игр, и для работы.'),
  item('cpu-r7-7800x3d', 'cpu', 'AMD', 'AMD Ryzen 7 7800X3D', 39990, 93, ['gaming', 'popular'],
    { socket: 'AM5', cores: '8 / 16', frequency: '4,2–5,0 ГГц', igpu: true, power: 120 },
    'Восьмиядерный процессор с кешем 3D V-Cache, один из самых быстрых в играх.'),
  item('cpu-r7-9700x', 'cpu', 'AMD', 'AMD Ryzen 7 9700X', 31990, 78, [],
    { socket: 'AM5', cores: '8 / 16', frequency: '3,8–5,5 ГГц', igpu: true, power: 105 },
    'Процессор на архитектуре Zen 5 для универсального компьютера.'),
  item('cpu-r9-9900x', 'cpu', 'AMD', 'AMD Ryzen 9 9900X', 44990, 72, ['work'],
    { socket: 'AM5', cores: '12 / 24', frequency: '4,4–5,6 ГГц', igpu: true, power: 120 },
    '12 ядер для монтажа, рендеринга и компиляции.'),
  item('cpu-i3-12100f', 'cpu', 'Intel', 'Intel Core i3-12100F', 7490, 83, ['budget'],
    { socket: 'LGA1700', cores: '4 / 8', frequency: '3,3–4,3 ГГц', igpu: false, power: 58 },
    'Самый доступный процессор для офисной или простой игровой сборки. Без встроенной графики.'),
  item('cpu-i5-12400f', 'cpu', 'Intel', 'Intel Core i5-12400F', 10990, 94, ['budget', 'popular'],
    { socket: 'LGA1700', cores: '6 / 12', frequency: '2,5–4,4 ГГц', igpu: false, power: 65 },
    'Популярный бюджетный процессор Intel. Без встроенной графики — нужна видеокарта.'),
  item('cpu-i5-13400f', 'cpu', 'Intel', 'Intel Core i5-13400F', 15990, 86, [],
    { socket: 'LGA1700', cores: '10 / 16', frequency: '2,5–4,6 ГГц', igpu: false, power: 65 },
    '10 ядер (6 производительных и 4 энергоэффективных) по разумной цене.'),
  item('cpu-i5-14600kf', 'cpu', 'Intel', 'Intel Core i5-14600KF', 25990, 81, ['gaming'],
    { socket: 'LGA1700', cores: '14 / 20', frequency: '3,5–5,3 ГГц', igpu: false, power: 181 },
    'Разблокированный процессор для игр. Нужен хороший кулер.'),
  item('cpu-i7-14700k', 'cpu', 'Intel', 'Intel Core i7-14700K', 41990, 79, ['work'],
    { socket: 'LGA1700', cores: '20 / 28', frequency: '3,4–5,6 ГГц', igpu: true, power: 253 },
    '20 ядер для рендеринга и монтажа. Под нагрузкой требует мощного охлаждения.'),

  // ---------- Материнские платы ----------
  item('mb-gb-a520m', 'motherboard', 'Gigabyte', 'Gigabyte A520M K V2', 5990, 74, ['budget'],
    { socket: 'AM4', chipset: 'AMD A520', memoryType: 'DDR4', formFactor: 'mATX', slots: 2, m2: 1 },
    'Простая плата для недорогой сборки на Ryzen 3000/5000.'),
  item('mb-asus-b550', 'motherboard', 'ASUS', 'ASUS TUF Gaming B550-Plus', 11990, 84, ['popular'],
    { socket: 'AM4', chipset: 'AMD B550', memoryType: 'DDR4', formFactor: 'ATX', slots: 4, m2: 2 },
    'Надёжная плата для Ryzen 3000/5000 с усиленным питанием и PCIe 4.0.'),
  item('mb-gb-a620m', 'motherboard', 'Gigabyte', 'Gigabyte A620M S2H', 8990, 76, ['budget'],
    { socket: 'AM5', chipset: 'AMD A620', memoryType: 'DDR5', formFactor: 'mATX', slots: 2, m2: 1 },
    'Самый доступный вход на платформу AM5.'),
  item('mb-asus-b650m', 'motherboard', 'ASUS', 'ASUS TUF Gaming B650M-Plus', 16490, 87, ['popular'],
    { socket: 'AM5', chipset: 'AMD B650', memoryType: 'DDR5', formFactor: 'mATX', slots: 4, m2: 2 },
    'Компактная плата с хорошим питанием для Ryzen 7000/9000.'),
  item('mb-msi-b650', 'motherboard', 'MSI', 'MSI B650 Gaming Plus WiFi', 17990, 88, ['gaming'],
    { socket: 'AM5', chipset: 'AMD B650', memoryType: 'DDR5', formFactor: 'ATX', slots: 4, m2: 2 },
    'Плата для Ryzen 7000/9000 с Wi-Fi и четырьмя слотами DDR5.'),
  item('mb-asus-x870', 'motherboard', 'ASUS', 'ASUS Prime X870-P WiFi', 25990, 70, ['work'],
    { socket: 'AM5', chipset: 'AMD X870', memoryType: 'DDR5', formFactor: 'ATX', slots: 4, m2: 4 },
    'Старший чипсет AM5: USB4, четыре слота M.2 и PCIe 5.0.'),
  item('mb-asrock-h610m', 'motherboard', 'ASRock', 'ASRock H610M-HDV/M.2', 6990, 73, ['budget'],
    { socket: 'LGA1700', chipset: 'Intel H610', memoryType: 'DDR4', formFactor: 'mATX', slots: 2, m2: 1 },
    'Бюджетная плата для Intel 12–14 поколения.'),
  item('mb-msi-b760m', 'motherboard', 'MSI', 'MSI PRO B760M-A DDR4', 11490, 86, ['budget', 'popular'],
    { socket: 'LGA1700', chipset: 'Intel B760', memoryType: 'DDR4', formFactor: 'mATX', slots: 4, m2: 2 },
    'Компактная плата для Intel 12–14 поколения с недорогой памятью DDR4.'),
  item('mb-gb-b760-ddr5', 'motherboard', 'Gigabyte', 'Gigabyte B760 DS3H DDR5', 13990, 77, [],
    { socket: 'LGA1700', chipset: 'Intel B760', memoryType: 'DDR5', formFactor: 'ATX', slots: 4, m2: 2 },
    'Полноразмерная плата для Intel с поддержкой DDR5.'),
  item('mb-asus-z790', 'motherboard', 'ASUS', 'ASUS Prime Z790-P', 22990, 72, ['work'],
    { socket: 'LGA1700', chipset: 'Intel Z790', memoryType: 'DDR5', formFactor: 'ATX', slots: 4, m2: 3 },
    'Плата на старшем чипсете Intel с поддержкой разгона процессоров серии K.'),

  // ---------- Оперативная память ----------
  item('ram-ddr4-16', 'ram', 'Kingston', 'Kingston Fury Beast 16 ГБ DDR4-3200', 3990, 82, ['budget'],
    { memoryType: 'DDR4', capacity: '16 ГБ', kit: '2 × 8 ГБ', speed: '3200 МТ/с' },
    'Базовый комплект для учёбы, офиса и нетребовательных игр.'),
  item('ram-ddr4-32', 'ram', 'Corsair', 'Corsair Vengeance LPX 32 ГБ DDR4-3600', 6990, 87, ['popular'],
    { memoryType: 'DDR4', capacity: '32 ГБ', kit: '2 × 16 ГБ', speed: '3600 МТ/с' },
    'Комплект с запасом для игр и многозадачности на платформах DDR4.'),
  item('ram-ddr4-32-patriot', 'ram', 'Patriot', 'Patriot Viper Steel 32 ГБ DDR4-3600', 7290, 74, [],
    { memoryType: 'DDR4', capacity: '32 ГБ', kit: '2 × 16 ГБ', speed: '3600 МТ/с' },
    'Память DDR4 с металлическими радиаторами.'),
  item('ram-ddr5-16', 'ram', 'Kingston', 'Kingston Fury Beast 16 ГБ DDR5-5600', 5490, 78, ['budget'],
    { memoryType: 'DDR5', capacity: '16 ГБ', kit: '2 × 8 ГБ', speed: '5600 МТ/с' },
    'Минимальный комплект DDR5 для недорогой сборки.'),
  item('ram-ddr5-32', 'ram', 'Kingston', 'Kingston Fury Beast 32 ГБ DDR5-6000', 9990, 95, ['popular', 'gaming'],
    { memoryType: 'DDR5', capacity: '32 ГБ', kit: '2 × 16 ГБ', speed: '6000 МТ/с' },
    'Оптимальная частота для Ryzen 7000/9000. Поддерживает профили EXPO и XMP.'),
  item('ram-ddr5-32-gskill', 'ram', 'G.Skill', 'G.Skill Flare X5 32 ГБ DDR5-6000 CL30', 11490, 84, ['gaming'],
    { memoryType: 'DDR5', capacity: '32 ГБ', kit: '2 × 16 ГБ', speed: '6000 МТ/с' },
    'Быстрая память с низкими задержками для игровых сборок на AMD.'),
  item('ram-ddr5-48', 'ram', 'Corsair', 'Corsair Vengeance 48 ГБ DDR5-6000', 14990, 71, ['work'],
    { memoryType: 'DDR5', capacity: '48 ГБ', kit: '2 × 24 ГБ', speed: '6000 МТ/с' },
    'Нестандартный объём 48 ГБ — запас для работы без переплаты за 64 ГБ.'),
  item('ram-ddr5-64', 'ram', 'G.Skill', 'G.Skill Trident Z5 64 ГБ DDR5-6000', 19990, 70, ['work'],
    { memoryType: 'DDR5', capacity: '64 ГБ', kit: '2 × 32 ГБ', speed: '6000 МТ/с' },
    'Большой объём для монтажа видео, 3D и виртуальных машин.'),

  // ---------- Видеокарты ----------
  item('gpu-rtx3050', 'gpu', 'NVIDIA', 'Palit GeForce RTX 3050 StormX 6 ГБ', 18990, 72, ['budget'],
    { vram: '6 ГБ GDDR6', interface: 'PCIe 4.0 x8', length: 166, power: 70 },
    'Компактная видеокарта без дополнительного питания для простых игр.'),
  item('gpu-rx7600', 'gpu', 'AMD', 'Sapphire Radeon RX 7600 Pulse 8 ГБ', 27990, 83, ['budget'],
    { vram: '8 ГБ GDDR6', interface: 'PCIe 4.0 x8', length: 240, power: 165 },
    'Недорогая видеокарта для Full HD.'),
  item('gpu-rtx4060', 'gpu', 'NVIDIA', 'Palit GeForce RTX 4060 Dual 8 ГБ', 32990, 97, ['popular', 'gaming'],
    { vram: '8 ГБ GDDR6', interface: 'PCIe 4.0 x8', length: 250, power: 115 },
    'Видеокарта для игр в Full HD с поддержкой DLSS 3 и низким энергопотреблением.'),
  item('gpu-rtx4060ti', 'gpu', 'NVIDIA', 'Gigabyte GeForce RTX 4060 Ti Windforce OC 8 ГБ', 42990, 80, ['gaming'],
    { vram: '8 ГБ GDDR6', interface: 'PCIe 4.0 x8', length: 282, power: 160 },
    'Заметно быстрее RTX 4060 в Full HD и уверенно справляется с 1440p.'),
  item('gpu-rx7700xt', 'gpu', 'AMD', 'Sapphire Radeon RX 7700 XT Pulse 12 ГБ', 46990, 78, ['gaming'],
    { vram: '12 ГБ GDDR6', interface: 'PCIe 4.0 x16', length: 280, power: 245 },
    '12 ГБ видеопамяти для игр в 1440p.'),
  item('gpu-rx7800xt', 'gpu', 'AMD', 'PowerColor Radeon RX 7800 XT Hellhound 16 ГБ', 52990, 81, ['gaming'],
    { vram: '16 ГБ GDDR6', interface: 'PCIe 4.0 x16', length: 322, power: 263 },
    '16 ГБ памяти для игр в 1440p с высокими настройками текстур.'),
  item('gpu-rtx4070s', 'gpu', 'NVIDIA', 'MSI GeForce RTX 4070 Super Ventus 2X 12 ГБ', 64990, 89, ['gaming', 'popular'],
    { vram: '12 ГБ GDDR6X', interface: 'PCIe 4.0 x16', length: 242, power: 220 },
    'Комфортная игра в 1440p и ускорение рендеринга в рабочих программах.'),
  item('gpu-rtx5070', 'gpu', 'NVIDIA', 'MSI GeForce RTX 5070 Ventus 2X 12 ГБ', 69990, 85, ['gaming'],
    { vram: '12 ГБ GDDR7', interface: 'PCIe 5.0 x16', length: 228, power: 250 },
    'Видеокарта нового поколения с DLSS 4 в компактном двухвентиляторном исполнении.'),
  item('gpu-rtx4070tis', 'gpu', 'NVIDIA', 'ASUS TUF GeForce RTX 4070 Ti Super 16 ГБ', 89990, 76, ['work'],
    { vram: '16 ГБ GDDR6X', interface: 'PCIe 4.0 x16', length: 305, power: 285 },
    '16 ГБ памяти для 3D, нейросетей и игр в 4K.'),
  item('gpu-rtx4080s', 'gpu', 'NVIDIA', 'Gigabyte GeForce RTX 4080 Super Gaming OC 16 ГБ', 119990, 71, ['gaming', 'work'],
    { vram: '16 ГБ GDDR6X', interface: 'PCIe 4.0 x16', length: 342, power: 320 },
    'Флагманский уровень для игр в 4K. Большая длина — проверьте корпус.'),

  // ---------- Накопители ----------
  item('ssd-nv2-500', 'storage', 'Kingston', 'Kingston NV2 500 ГБ', 3490, 78, ['budget'],
    { driveType: 'SSD NVMe', capacity: '500 ГБ', interface: 'M.2 PCIe 4.0', read: 'до 3500 МБ/с' },
    'Быстрый системный диск для недорогой сборки.'),
  item('ssd-p3plus-1tb', 'storage', 'Crucial', 'Crucial P3 Plus 1 ТБ', 6490, 82, ['budget'],
    { driveType: 'SSD NVMe', capacity: '1 ТБ', interface: 'M.2 PCIe 4.0', read: 'до 5000 МБ/с' },
    'Недорогой SSD на 1 ТБ для системы и игр.'),
  item('ssd-980-1tb', 'storage', 'Samsung', 'Samsung 980 1 ТБ', 7490, 93, ['popular'],
    { driveType: 'SSD NVMe', capacity: '1 ТБ', interface: 'M.2 PCIe 3.0', read: 'до 3500 МБ/с' },
    'Надёжный SSD на 1 ТБ для системы и библиотеки игр.'),
  item('ssd-kc3000-1tb', 'storage', 'Kingston', 'Kingston KC3000 1 ТБ', 9490, 79, ['gaming'],
    { driveType: 'SSD NVMe', capacity: '1 ТБ', interface: 'M.2 PCIe 4.0', read: 'до 7000 МБ/с' },
    'Быстрый накопитель с радиатором для быстрой загрузки игр.'),
  item('ssd-sn850x-2tb', 'storage', 'WD', 'WD Black SN850X 2 ТБ', 15990, 85, ['work', 'gaming'],
    { driveType: 'SSD NVMe', capacity: '2 ТБ', interface: 'M.2 PCIe 4.0', read: 'до 7300 МБ/с' },
    'Скоростной накопитель для больших проектов и тяжёлых игр.'),
  item('ssd-990pro-2tb', 'storage', 'Samsung', 'Samsung 990 Pro 2 ТБ', 19990, 75, ['work'],
    { driveType: 'SSD NVMe', capacity: '2 ТБ', interface: 'M.2 PCIe 4.0', read: 'до 7450 МБ/с' },
    'Один из самых быстрых SSD на PCIe 4.0.'),
  item('ssd-870evo-1tb', 'storage', 'Samsung', 'Samsung 870 EVO 1 ТБ SATA', 8990, 72, [],
    { driveType: 'SSD SATA', capacity: '1 ТБ', interface: 'SATA III, 2,5″', read: 'до 560 МБ/с' },
    'SATA-диск для старых плат или как дополнительное хранилище.'),
  item('hdd-barracuda-2tb', 'storage', 'Seagate', 'Seagate BarraCuda 2 ТБ HDD', 5990, 68, ['budget'],
    { driveType: 'HDD', capacity: '2 ТБ', interface: 'SATA III, 3,5″', read: 'до 220 МБ/с' },
    'Жёсткий диск для фото, видео и архивов. Систему лучше ставить на SSD.'),

  // ---------- Охлаждение ----------
  item('cool-se214', 'cooler', 'ID-Cooling', 'ID-Cooling SE-214-XT', 1290, 80, ['budget'],
    { coolerType: 'Башенный', sockets: ['AM4', 'AM5', 'LGA1700'], maxTdp: 180, height: 150 },
    'Самый простой башенный кулер — заметно тише боксового.'),
  item('cool-ak400', 'cooler', 'Deepcool', 'Deepcool AK400', 2490, 92, ['popular', 'budget'],
    { coolerType: 'Башенный', sockets: ['AM4', 'AM5', 'LGA1700'], maxTdp: 220, height: 155 },
    'Тихий кулер, которого хватает для большинства процессоров среднего класса.'),
  item('cool-pa120', 'cooler', 'Thermalright', 'Thermalright Peerless Assassin 120 SE', 3790, 88, ['gaming', 'popular'],
    { coolerType: 'Двухбашенный', sockets: ['AM4', 'AM5', 'LGA1700'], maxTdp: 260, height: 157 },
    'Две башни и два вентилятора: запас по охлаждению для игровых процессоров.'),
  item('cool-ak620', 'cooler', 'Deepcool', 'Deepcool AK620', 5490, 79, ['gaming'],
    { coolerType: 'Двухбашенный', sockets: ['AM4', 'AM5', 'LGA1700'], maxTdp: 260, height: 160 },
    'Мощный воздушный кулер с хорошей совместимостью с высокими модулями памяти.'),
  item('cool-nhd15', 'cooler', 'Noctua', 'Noctua NH-D15 chromax.black', 12990, 70, ['work'],
    { coolerType: 'Двухбашенный', sockets: ['AM4', 'AM5', 'LGA1700'], maxTdp: 280, height: 165 },
    'Один из самых тихих и эффективных воздушных кулеров. Высокий — нужен просторный корпус.'),
  item('cool-lf3-240', 'cooler', 'Arctic', 'Arctic Liquid Freezer III 240', 7990, 77, [],
    { coolerType: 'Жидкостное', sockets: ['AM4', 'AM5', 'LGA1700'], maxTdp: 280, radiator: 240 },
    'Жидкостное охлаждение с радиатором 240 мм.'),
  item('cool-lf3-360', 'cooler', 'Arctic', 'Arctic Liquid Freezer III 360', 10990, 74, ['work'],
    { coolerType: 'Жидкостное', sockets: ['AM4', 'AM5', 'LGA1700'], maxTdp: 350, radiator: 360 },
    'Жидкостная система для горячих процессоров под длительной нагрузкой.'),

  // ---------- Блоки питания ----------
  item('psu-pk550d', 'psu', 'Deepcool', 'Deepcool PK550D 550 Вт', 4990, 80, ['budget'],
    { wattage: 550, certificate: '80 PLUS Bronze', modular: 'Нет' },
    'Недорогой блок питания для систем с видеокартой начального уровня.'),
  item('psu-pf650', 'psu', 'Deepcool', 'Deepcool PF650 650 Вт', 5490, 76, ['budget'],
    { wattage: 650, certificate: '80 PLUS', modular: 'Нет' },
    'Простой блок с запасом мощности под среднюю видеокарту.'),
  item('psu-mwe750', 'psu', 'Cooler Master', 'Cooler Master MWE Gold 750 V2', 8990, 91, ['popular', 'gaming'],
    { wattage: 750, certificate: '80 PLUS Gold', modular: 'Полностью' },
    'Блок с запасом мощности для игровых сборок и модульными кабелями.'),
  item('psu-rm750e', 'psu', 'Corsair', 'Corsair RM750e 750 Вт', 10990, 84, ['gaming'],
    { wattage: 750, certificate: '80 PLUS Gold', modular: 'Полностью' },
    'Тихий блок с разъёмом 12V-2x6 для современных видеокарт.'),
  item('psu-pp12-850', 'psu', 'be quiet!', 'be quiet! Pure Power 12 M 850 Вт', 12990, 77, ['work'],
    { wattage: 850, certificate: '80 PLUS Gold', modular: 'Полностью' },
    'Тихий блок питания с разъёмом 12V-2x6 для мощных видеокарт.'),
  item('psu-focus-1000', 'psu', 'Seasonic', 'Seasonic Focus GX-1000 1000 Вт', 17990, 70, ['work'],
    { wattage: 1000, certificate: '80 PLUS Gold', modular: 'Полностью' },
    'Мощный блок для топовых видеокарт и процессоров.'),

  // ---------- Корпуса ----------
  item('case-q300l', 'case', 'Cooler Master', 'Cooler Master MasterBox Q300L', 3790, 74, ['budget'],
    { supports: ['mATX'], maxGpuLength: 360, maxCoolerHeight: 157, maxRadiator: 240, fans: '1 в комплекте' },
    'Компактный корпус для плат mATX и Mini-ITX.'),
  item('case-zalman-s5', 'case', 'Zalman', 'Zalman S5 Black', 4290, 75, ['budget'],
    { supports: ['ATX', 'mATX'], maxGpuLength: 300, maxCoolerHeight: 160, maxRadiator: 240, fans: '3 в комплекте' },
    'Простой Midi-Tower с сетчатой передней панелью.'),
  item('case-cc560', 'case', 'Deepcool', 'Deepcool CC560 V2', 4990, 87, ['budget', 'popular'],
    { supports: ['ATX', 'mATX'], maxGpuLength: 370, maxCoolerHeight: 163, maxRadiator: 360, fans: '4 в комплекте' },
    'Недорогой корпус со стеклянной стенкой и четырьмя вентиляторами.'),
  item('case-ch360', 'case', 'Deepcool', 'Deepcool CH360', 6490, 71, [],
    { supports: ['mATX'], maxGpuLength: 320, maxCoolerHeight: 174, maxRadiator: 360, fans: '2 в комплекте' },
    'Компактный корпус только для плат mATX и Mini-ITX.'),
  item('case-air903', 'case', 'Montech', 'Montech AIR 903 MAX', 6990, 80, ['gaming'],
    { supports: ['ATX', 'mATX'], maxGpuLength: 400, maxCoolerHeight: 180, maxRadiator: 360, fans: '4 в комплекте' },
    'Просторный корпус с отличной продуваемостью.'),
  item('case-h5flow', 'case', 'NZXT', 'NZXT H5 Flow', 8990, 76, [],
    { supports: ['ATX', 'mATX'], maxGpuLength: 365, maxCoolerHeight: 165, maxRadiator: 280, fans: '2 в комплекте' },
    'Аккуратный корпус с простой укладкой кабелей.'),
  item('case-lancool-216', 'case', 'Lian Li', 'Lian Li Lancool 216', 9490, 90, ['popular', 'gaming'],
    { supports: ['ATX', 'mATX'], maxGpuLength: 392, maxCoolerHeight: 180, maxRadiator: 360, fans: '3 в комплекте' },
    'Просторный корпус с хорошей продуваемостью и двумя крупными вентиляторами спереди.'),
  item('case-north', 'case', 'Fractal Design', 'Fractal Design North', 13990, 73, ['work'],
    { supports: ['ATX', 'mATX'], maxGpuLength: 355, maxCoolerHeight: 170, maxRadiator: 360, fans: '2 в комплекте' },
    'Корпус с деревянной передней панелью для рабочего места.'),
];

const PRESETS = [
  {
    id: 'gaming',
    photos: 3,
    title: 'Игровая',
    tag: 'gaming',
    summary: 'Компьютер для игр в Full HD и 1440p',
    parts: ['cpu-r5-7600', 'mb-msi-b650', 'ram-ddr5-32', 'gpu-rtx4060ti', 'ssd-980-1tb', 'cool-ak400', 'psu-mwe750', 'case-lancool-216'],
  },
  {
    id: 'work',
    photos: 2,
    title: 'Для работы',
    tag: 'work',
    summary: 'Монтаж, 3D, программирование',
    parts: ['cpu-r9-9900x', 'mb-asus-x870', 'ram-ddr5-64', 'gpu-rtx4070s', 'ssd-sn850x-2tb', 'cool-lf3-360', 'psu-pp12-850', 'case-north'],
  },
  {
    id: 'study',
    photos: 2,
    title: 'Для учёбы',
    tag: 'budget',
    summary: 'Компьютер для учёбы, офиса и лёгких игр',
    parts: ['cpu-i5-12400f', 'mb-msi-b760m', 'ram-ddr4-16', 'gpu-rtx3050', 'ssd-p3plus-1tb', 'cool-ak400', 'psu-pk550d', 'case-cc560'],
  },
  {
    id: 'studio',
    photos: 3,
    title: 'Для монтажа',
    tag: 'work',
    summary: '48 ГБ памяти и отдельная видеокарта для видео и графики',
    parts: ['cpu-r7-9700x', 'mb-asus-b650m', 'ram-ddr5-48', 'gpu-rtx4070tis', 'ssd-kc3000-1tb', 'cool-lf3-240', 'psu-pp12-850', 'case-air903'],
  },
  {
    id: 'compact',
    photos: 2,
    title: 'Компактная',
    tag: 'budget',
    summary: 'Корпус mATX и встроенная графика для повседневных задач',
    parts: ['cpu-r7-7700', 'mb-gb-a620m', 'ram-ddr5-16', 'ssd-p3plus-1tb', 'cool-ak400', 'psu-pk550d', 'case-q300l'],
  },
  {
    id: 'power',
    photos: 2,
    title: 'Для игр в 4K',
    tag: 'gaming',
    summary: 'RTX 4080 Super, 64 ГБ памяти и SSD на 2 ТБ',
    parts: ['cpu-i7-14700k', 'mb-asus-z790', 'ram-ddr5-64', 'gpu-rtx4080s', 'ssd-990pro-2tb', 'cool-lf3-360', 'psu-focus-1000', 'case-air903'],
  },
];

const PRODUCT_INDEX = new Map(PRODUCTS.map((p) => [p.id, p]));

function getProduct(id) {
  return PRODUCT_INDEX.get(id) || null;
}

function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

function presetTotal(preset) {
  return preset.parts.reduce((sum, id) => sum + (getProduct(id)?.price || 0), 0);
}

/* Фотографии модели имеют приоритет над примерами категории. */
const MODEL_PHOTOS = {
  'cpu-r5-7600': 'cpu-amd',
  'cpu-r7-7800x3d': 'cpu-r7-7800x3d',
  'cpu-i7-14700k': 'cpu-i7-14700k',
  'hdd-barracuda-2tb': 'hdd',
  'cool-nhd15': 'cooler-tower',
};

function photoFor(product) {
  const { category, brand, specs } = product;
  if (MODEL_PHOTOS[product.id]) return MODEL_PHOTOS[product.id];
  if (category === 'cpu') return brand === 'Intel' ? 'cpu-intel' : 'cpu-amd';
  if (category === 'motherboard' && specs.socket === 'AM4') return 'motherboard-am4';
  if (category === 'ram' && specs.memoryType === 'DDR4') return 'ram-ddr4';
  if (category === 'cooler') return specs.radiator ? 'cooler-aio' : 'cooler-tower';
  if (category === 'storage') {
    if (product.id === 'ssd-nv2-500') return 'ssd-kingston-nv2';
    if (product.id === 'ssd-990pro-2tb') return 'ssd-samsung-990pro';
    if (specs.driveType === 'HDD') return 'hdd';
    if (specs.driveType === 'SSD SATA') return 'ssd-sata';
    return 'ssd-nvme';
  }
  if (category === 'gpu') return brand === 'AMD' ? 'gpu-amd' : 'gpu-nvidia';
  return category;
}

const CATEGORY_ICONS = {
  cpu: '<rect x="18" y="18" width="44" height="44" rx="3"/><rect x="28" y="28" width="24" height="24" rx="1"/><path d="M26 10v8M34 10v8M42 10v8M50 10v8M26 62v8M34 62v8M42 62v8M50 62v8M10 26h8M10 34h8M10 42h8M10 50h8M62 26h8M62 34h8M62 42h8M62 50h8"/>',
  motherboard: '<rect x="10" y="10" width="60" height="60" rx="3"/><rect x="18" y="18" width="18" height="18"/><path d="M46 18v30M52 18v30M58 18v30M18 46h22M18 54h22M18 62h14"/><circle cx="62" cy="62" r="2"/>',
  ram: '<rect x="6" y="28" width="68" height="22" rx="2"/><path d="M14 34h8v10h-8zM26 34h8v10h-8zM46 34h8v10h-8zM58 34h8v10h-8zM40 50v6M10 50v4M70 50v4"/>',
  gpu: '<rect x="6" y="20" width="68" height="36" rx="3"/><circle cx="28" cy="38" r="11"/><circle cx="54" cy="38" r="11"/><circle cx="28" cy="38" r="3"/><circle cx="54" cy="38" r="3"/><path d="M12 56v6h28v-6"/>',
  storage: '<rect x="8" y="30" width="64" height="20" rx="2"/><path d="M8 40h-2M16 36h14v8H16zM36 36h10v8H36zM52 36h10v8H52z"/><circle cx="68" cy="40" r="1.5"/>',
  cooler: '<rect x="12" y="12" width="56" height="56" rx="6"/><circle cx="40" cy="40" r="20"/><circle cx="40" cy="40" r="5"/><path d="M40 20c6 6 6 10 0 15M60 40c-6 6-10 6-15 0M40 60c-6-6-6-10 0-15M20 40c6-6 10-6 15 0"/>',
  psu: '<rect x="10" y="16" width="60" height="48" rx="3"/><circle cx="34" cy="40" r="15"/><path d="M34 25v30M19 40h30M24 30l20 20M44 30L24 50"/><rect x="56" y="24" width="8" height="10"/>',
  case: '<rect x="20" y="6" width="40" height="68" rx="3"/><path d="M28 16h24M28 22h24"/><circle cx="40" cy="44" r="9"/><circle cx="40" cy="44" r="2"/><circle cx="52" cy="66" r="1.5"/>',
};

function categoryIcon(category, extraClass = '') {
  const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.cpu;
  return `<svg class="product-image ${extraClass}" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icon}</svg>`;
}

/* Фото товара; при ошибке загрузки заменяется иконкой (см. common.js). */
function productImage(product, extraClass = '') {
  return `<img class="product-photo ${extraClass}" src="img/products/${photoFor(product)}.jpg" alt="" loading="lazy" decoding="async" data-category="${product.category}">`;
}
