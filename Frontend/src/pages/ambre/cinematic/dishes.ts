import type { Lang } from '../types';

export interface ChapterCopy {
  eyebrow: string;
  title: string[];
  subtitle: string;
}

export interface ChapterMeta {
  id: 'coffee' | 'shakshuka' | 'plov' | 'dessert';
  /** World-space Z offset — the fixed position the camera travels toward. */
  z: number;
  /** [start, end] global scroll-progress this chapter occupies (overlaps
   * with neighbors on purpose, so lighting/text cross-blend during travel). */
  range: [number, number];
  /** [start, end] the chapter is at full presence — outside `range` it's 0. */
  core: [number, number];
  copy: Record<Lang, ChapterCopy>;
}

export const WORLD_STEP = 9;

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'coffee',
    z: 0,
    range: [0, 0.32],
    // Core starts exactly at range start (0), not after a ramp-in — this is
    // the very first chapter, so it must already be at full presence on
    // initial page load, before the visitor has scrolled at all.
    core: [0, 0.26],
    copy: {
      ru: {
        eyebrow: '01 — Фирменный кофе',
        title: ['Кофе, к которому', 'возвращаются'],
        subtitle: 'Обжарка на месте. Медленный ритуал в каждой чашке.',
      },
      en: {
        eyebrow: '01 — Signature Coffee',
        title: ['Coffee worth', 'returning for'],
        subtitle: 'Roasted in-house — a slow ritual in every cup.',
      },
    },
  },
  {
    id: 'shakshuka',
    z: -WORLD_STEP,
    range: [0.28, 0.62],
    core: [0.36, 0.56],
    copy: {
      ru: {
        eyebrow: '02 — Шакшука',
        title: ['Яйца, томлёные', 'в печи'],
        subtitle: 'Спелые томаты, перец и зелень — утро, которое не торопится.',
      },
      en: {
        eyebrow: '02 — Shakshuka',
        title: ['Eggs, slow-baked', 'in the pan'],
        subtitle: 'Ripe tomato, pepper, fresh herbs — a morning unhurried.',
      },
    },
  },
  {
    id: 'plov',
    z: -WORLD_STEP * 2,
    range: [0.56, 0.86],
    core: [0.66, 0.82],
    copy: {
      ru: {
        eyebrow: '03 — Таджикский плов',
        title: ['Плов по', 'семейному рецепту'],
        subtitle: 'Рассыпчатый рис, томлёное мясо и морковь — традиция на тарелке.',
      },
      en: {
        eyebrow: '03 — Tajik Plov',
        title: ['Plov, the family', 'recipe'],
        subtitle: 'Fragrant rice, slow-braised meat, carrot — tradition on a plate.',
      },
    },
  },
  {
    id: 'dessert',
    z: -WORLD_STEP * 3,
    range: [0.8, 1.0],
    // Core ends exactly at range end (1.0), not before a ramp-out — this is
    // the last chapter, so it must stay at full presence through the very
    // end of the sequence rather than fading before the final release.
    core: [0.88, 1.0],
    copy: {
      ru: {
        eyebrow: '04 — Десерт дня',
        title: ['Финал,', 'который запоминается'],
        subtitle: 'Тёмный шоколад, ганаш и ягоды — сладкая точка вечера.',
      },
      en: {
        eyebrow: "04 — Today's Dessert",
        title: ['A finale worth', 'remembering'],
        subtitle: "Dark chocolate, ganache, berries — the evening's sweet close.",
      },
    },
  },
];

export const FINAL_COPY: Record<Lang, ChapterCopy> = {
  ru: {
    eyebrow: 'AMBRE',
    title: ['Добро пожаловать', 'в AMBRE'],
    subtitle: 'Кухня и кофейня в самом центре города.',
  },
  en: {
    eyebrow: 'AMBRE',
    title: ['Welcome', 'to AMBRE'],
    subtitle: 'A kitchen and coffeehouse in the heart of the city.',
  },
};

/** Global progress at which the pinned scene releases into the normal page. */
export const FINAL_REVEAL_START = 0.93;
