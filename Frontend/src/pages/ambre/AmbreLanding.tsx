import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { CATEGORIES, DISHES, TRANSLATIONS } from './data';
import type { Accent, CategoryId, Lang } from './types';
import { ArrowIcon, MenuIcon, MoonIcon, SunIcon } from './icons';
import './AmbreLanding.css';

const CoffeeCup3D = lazy(() => import('./CoffeeCup3D').then((m) => ({ default: m.CoffeeCup3D })));

const MOBILE_BREAKPOINT = 820;

interface AmbreLandingProps {
  accent?: Accent;
  show3d?: boolean;
}

export function AmbreLanding({ accent = 'terracotta', show3d = true }: AmbreLandingProps) {
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState<Lang>('ru');
  const [activeCat, setActiveCat] = useState<CategoryId>('coffee');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [threeActive, setThreeActive] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  const t = TRANSLATIONS[lang];

  const dishes = useMemo(
    () =>
      DISHES.filter((dish) => dish.cat === activeCat).map((dish) => ({
        id: dish.id,
        name: dish.name[lang],
        desc: dish.desc[lang],
        price: dish.price,
      })),
    [activeCat, lang],
  );

  const rootClassName = ['app', `accent-${accent}`, isDark ? 'theme-dark' : ''].filter(Boolean).join(' ');

  const handleTilt = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(920px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-5px)`;
    el.style.boxShadow = 'var(--shadow-lg)';
  }, []);

  const resetTilt = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'perspective(920px) rotateX(0deg) rotateY(0deg) translateY(0)';
    el.style.boxShadow = 'var(--shadow-md)';
  }, []);

  return (
    <div className={rootClassName} id="top">
      <header className="site-header">
        <div className="header-inner">
          <a href="#top" className="brand">AMBRE</a>

          {!isMobile && (
            <nav className="nav-desktop">
              {t.nav.map((item) => (
                <a key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          <div className="header-controls">
            <div className="lang-switch">
              <button type="button" className={`lang-btn ${lang === 'ru' ? 'is-active' : ''}`} onClick={() => setLang('ru')}>
                RU
              </button>
              <span className="lang-sep">/</span>
              <button type="button" className={`lang-btn ${lang === 'en' ? 'is-active' : ''}`} onClick={() => setLang('en')}>
                EN
              </button>
            </div>

            <button
              type="button"
              className="icon-btn"
              aria-label="Toggle theme"
              onClick={() => setIsDark((v) => !v)}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {isMobile && (
              <button type="button" className="icon-btn" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
                <MenuIcon />
              </button>
            )}
          </div>
        </div>

        {isMobile && menuOpen && (
          <nav className="nav-mobile">
            {t.nav.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="hero-title">
            <span>{t.heroLine1}</span>
            <span className="hero-title-italic">{t.heroLine2}</span>
          </h1>
          <p className="hero-tagline">{t.tagline}</p>
          <div className="hero-cta">
            <a href="#reserve" className="btn btn-primary">
              {t.cta1}
            </a>
            <a href="#menu" className="btn btn-outline">
              {t.cta2}
            </a>
          </div>
          <div className="hero-meta">
            <span>{t.metaHours}</span>
            <span className="dot" />
            <span>{t.metaAddr}</span>
          </div>
        </div>

        <div className="hero-visual">
          {!threeActive && (
            <div className="orb">
              <span>A</span>
            </div>
          )}
          {show3d && !isMobile && (
            <Suspense fallback={null}>
              <CoffeeCup3D enabled={show3d} onActive={() => setThreeActive(true)} />
            </Suspense>
          )}
        </div>
      </section>

      <section id="menu" className="menu-section">
        <div className="menu-inner">
          <div className="menu-head">
            <div>
              <p className="eyebrow">{t.menuEyebrow}</p>
              <h2 className="menu-title">{t.menuTitle}</h2>
            </div>
            <a href="#menu" className="menu-all-link">
              {t.menuAll}
              <ArrowIcon />
            </a>
          </div>

          <div className="cat-tabs">
            {CATEGORIES.map((cat) => {
              const active = cat.id === activeCat;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-tab ${active ? 'is-active' : ''}`}
                  onClick={() => setActiveCat(cat.id)}
                >
                  {cat.label[lang]}
                  <span className="cat-tab-bar" style={{ transform: `scaleX(${active ? 1 : 0})` }} />
                </button>
              );
            })}
          </div>

          <div className="dish-grid">
            {dishes.map((dish) => (
              <article key={dish.id} className="dish-card" onMouseMove={handleTilt} onMouseLeave={resetTilt}>
                <div className="dish-shot">
                  <span>{t.shot}</span>
                </div>
                <div className="dish-body">
                  <div className="dish-row">
                    <h3>{dish.name}</h3>
                    <span className="dish-price">{dish.price}</span>
                  </div>
                  <p className="dish-desc">{dish.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span className="brand">AMBRE</span>
        <div className="footer-meta">
          <span>{t.metaAddr}</span>
          <span>{t.metaHours}</span>
          <span>{t.footerRights}</span>
        </div>
      </footer>
    </div>
  );
}
