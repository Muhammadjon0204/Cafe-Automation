import type { Category, Dish, Lang, Translation } from './types';

export const TRANSLATIONS: Record<Lang, Translation> = {
  ru: {
    nav: [
      { label: 'Главная', href: '#top' },
      { label: 'Меню', href: '#menu' },
      { label: 'Бронирование', href: '#reserve' },
      { label: 'О нас', href: '#about' },
    ],
    eyebrow: 'Specialty cafe · Сезонная кухня',
    heroLine1: 'Кофе, к которому',
    heroLine2: 'возвращаются',
    tagline:
      'Медленный кофе и сезонная кухня в тихом ритме центра города. Обжарка на месте, продукты от локальных фермеров.',
    cta1: 'Забронировать стол',
    cta2: 'Смотреть меню',
    metaHours: 'Ежедневно 8:00–23:00',
    metaAddr: 'Большая Никитская, 12',
    menuEyebrow: 'Меню',
    menuTitle: 'Избранное из меню',
    menuAll: 'Смотреть всё меню',
    shot: 'фото блюда',
    footerRights: '© 2026 AMBRE',
  },
  en: {
    nav: [
      { label: 'Home', href: '#top' },
      { label: 'Menu', href: '#menu' },
      { label: 'Reserve', href: '#reserve' },
      { label: 'About', href: '#about' },
    ],
    eyebrow: 'Specialty coffee · Seasonal kitchen',
    heroLine1: 'Coffee worth',
    heroLine2: 'returning for',
    tagline:
      'Slow coffee and a seasonal kitchen in the quiet rhythm of the city centre. Roasted in-house, sourced from local growers.',
    cta1: 'Reserve a table',
    cta2: 'View menu',
    metaHours: 'Daily 8:00–23:00',
    metaAddr: '12 Bolshaya Nikitskaya',
    menuEyebrow: 'Menu',
    menuTitle: 'From the menu',
    menuAll: 'View full menu',
    shot: 'food shot',
    footerRights: '© 2026 AMBRE',
  },
};

export const CATEGORIES: Category[] = [
  { id: 'coffee', label: { ru: 'Кафе', en: 'Coffee' } },
  { id: 'breakfast', label: { ru: 'Завтраки', en: 'Breakfast' } },
  { id: 'mains', label: { ru: 'Основное', en: 'Mains' } },
  { id: 'desserts', label: { ru: 'Десерты', en: 'Desserts' } },
];

export const DISHES: Dish[] = [
  {
    id: 'flat-white',
    cat: 'coffee',
    name: { ru: 'Флэт уайт', en: 'Flat White' },
    desc: { ru: 'Двойной эспрессо, микропена, ореховый финиш', en: 'Double espresso, silk microfoam, nutty finish' },
    price: '320 ₽',
  },
  {
    id: 'v60-ethiopia',
    cat: 'coffee',
    name: { ru: 'V60 Эфиопия', en: 'V60 Ethiopia' },
    desc: { ru: 'Ручная воронка, ноты жасмина и персика', en: 'Hand pour-over, notes of jasmine and peach' },
    price: '420 ₽',
  },
  {
    id: 'lavender-raf',
    cat: 'coffee',
    name: { ru: 'Раф лаванда', en: 'Lavender Raf' },
    desc: { ru: 'Сливочный, с лавандовым сиропом', en: 'Creamy, with house lavender syrup' },
    price: '390 ₽',
  },
  {
    id: 'sourdough-scramble',
    cat: 'breakfast',
    name: { ru: 'Скрэмбл на закваске', en: 'Sourdough Scramble' },
    desc: { ru: 'Яйца, страчателла, зелёное масло', en: 'Eggs, stracciatella, green herb butter' },
    price: '690 ₽',
  },
  {
    id: 'house-granola',
    cat: 'breakfast',
    name: { ru: 'Домашняя гранола', en: 'House Granola' },
    desc: { ru: 'Йогурт, сезонные ягоды, мёд', en: 'Yogurt, seasonal berries, honey' },
    price: '480 ₽',
  },
  {
    id: 'cheese-pancakes',
    cat: 'breakfast',
    name: { ru: 'Сырники', en: 'Cheese Pancakes' },
    desc: { ru: 'Топлёная сметана, вишнёвый соус', en: 'Baked sour cream, cherry compote' },
    price: '520 ₽',
  },
  {
    id: 'cacio-e-pepe',
    cat: 'mains',
    name: { ru: 'Качо-э-пепе', en: 'Cacio e Pepe' },
    desc: { ru: 'Пекорино, чёрный перец, тальятелле', en: 'Pecorino, black pepper, fresh tagliatelle' },
    price: '890 ₽',
  },
  {
    id: 'charred-roots',
    cat: 'mains',
    name: { ru: 'Корнеплоды на углях', en: 'Charred Roots' },
    desc: { ru: 'Тахини, дукка, гранат', en: 'Tahini, dukkah, pomegranate' },
    price: '740 ₽',
  },
  {
    id: 'whole-dorada',
    cat: 'mains',
    name: { ru: 'Дорадо целиком', en: 'Whole Dorada' },
    desc: { ru: 'Фенхель, лимон, оливковое масло', en: 'Fennel, lemon, olive oil' },
    price: '1290 ₽',
  },
  {
    id: 'basque-cheesecake',
    cat: 'desserts',
    name: { ru: 'Баскский чизкейк', en: 'Basque Cheesecake' },
    desc: { ru: 'Карамелизированная корка, соль', en: 'Caramelised crust, flaky salt' },
    price: '460 ₽',
  },
  {
    id: 'pear-tart',
    cat: 'desserts',
    name: { ru: 'Тарт с грушей', en: 'Pear Tart' },
    desc: { ru: 'Миндальный крем, тимьян', en: 'Almond cream, thyme' },
    price: '480 ₽',
  },
  {
    id: 'chocolate-fondant',
    cat: 'desserts',
    name: { ru: 'Шоколадный фондан', en: 'Chocolate Fondant' },
    desc: { ru: 'Солёная карамель, крем-фреш', en: 'Salted caramel, crème fraîche' },
    price: '520 ₽',
  },
];
