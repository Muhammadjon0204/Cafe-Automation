export type Lang = 'ru' | 'en';
export type ThemeMode = 'light' | 'dark';
export type Accent = 'terracotta' | 'ochre' | 'emerald';
export type CategoryId = 'coffee' | 'breakfast' | 'mains' | 'desserts';

export interface NavItem {
  label: string;
  href: string;
}

export interface Translation {
  nav: NavItem[];
  eyebrow: string;
  heroLine1: string;
  heroLine2: string;
  tagline: string;
  cta1: string;
  cta2: string;
  metaHours: string;
  metaAddr: string;
  menuEyebrow: string;
  menuTitle: string;
  menuAll: string;
  shot: string;
  footerRights: string;
}

export interface Category {
  id: CategoryId;
  label: Record<Lang, string>;
}

export interface Dish {
  id: string;
  cat: CategoryId;
  name: Record<Lang, string>;
  desc: Record<Lang, string>;
  price: string;
}
