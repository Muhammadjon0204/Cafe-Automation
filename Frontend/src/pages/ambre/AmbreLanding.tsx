import { useCallback, useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react';
import { TRANSLATIONS } from './data';
import type { Lang } from './types';
import { ArrowIcon, MenuIcon, MoonIcon, SunIcon } from './icons';
import { useThemeTransition, ApiError } from '@cafe/shared';
import {
  getBookableTables,
  getMenuCategories,
  getMenuDishes,
  submitReservation,
  type ApiCafeTable,
  type ApiCategory,
  type ApiDish,
} from './api';
import { CinematicExperience } from './cinematic/CinematicExperience';
import './AmbreLanding.css';

const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

function defaultReservationDateTime(): string {
  const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
  inTwoHours.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${inTwoHours.getFullYear()}-${pad(inTwoHours.getMonth() + 1)}-${pad(inTwoHours.getDate())}T${pad(inTwoHours.getHours())}:00`;
}

const MOBILE_BREAKPOINT = 820;

interface AmbreLandingProps {
  show3d?: boolean;
}

export function AmbreLanding({ show3d = true }: AmbreLandingProps) {
  const { isDark, isAnimating, toggleTheme } = useThemeTransition();
  const [lang, setLang] = useState<Lang>('ru');
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Menu data comes from the real backend (GET /api/categories, GET /api/dishes) — the
  // hardcoded RU/EN pairs in data.ts only cover the surrounding page chrome now. The
  // backend is Russian-only, so dish/category names don't change with the lang toggle.
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [allDishes, setAllDishes] = useState<ApiDish[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuReloadToken, setMenuReloadToken] = useState(0);

  const [tables, setTables] = useState<ApiCafeTable[]>([]);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [reservationName, setReservationName] = useState('');
  const [reservationPhone, setReservationPhone] = useState('');
  const [reservationGuests, setReservationGuests] = useState(2);
  const [reservationTableId, setReservationTableId] = useState<number | null>(null);
  const [reservationWhen, setReservationWhen] = useState(defaultReservationDateTime);
  const [reservationNote, setReservationNote] = useState('');
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationDone, setReservationDone] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // Mirrors admin-app's AppShell: shared tokens.css scopes its dark palette to
  // :root.theme-dark, so the flag needs to land on documentElement (not just the
  // local .app wrapper) for --color-accent/--shadow-* to resolve correctly here.
  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', isDark);
  }, [isDark]);

  useEffect(() => {
    let cancelled = false;
    setMenuLoading(true);
    setMenuError(null);
    Promise.all([getMenuCategories(), getMenuDishes()])
      .then(([fetchedCategories, fetchedDishes]) => {
        if (cancelled) return;
        setCategories(fetchedCategories);
        setAllDishes(fetchedDishes);
        setActiveCat((current) => current ?? fetchedCategories[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMenuError(error instanceof ApiError ? error.message : 'Не удалось загрузить меню.');
      })
      .finally(() => {
        if (!cancelled) setMenuLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [menuReloadToken]);

  useEffect(() => {
    getBookableTables()
      .then(setTables)
      .catch((error: unknown) => setTablesError(error instanceof ApiError ? error.message : 'Не удалось загрузить столы.'));
  }, []);

  const t = TRANSLATIONS[lang];

  const dishes = useMemo(() => allDishes.filter((dish) => dish.categoryId === activeCat), [allDishes, activeCat]);

  const eligibleTables = useMemo(
    () => tables.filter((table) => table.seatsCount >= reservationGuests),
    [tables, reservationGuests],
  );

  useEffect(() => {
    if (!eligibleTables.some((table) => table.id === reservationTableId)) {
      setReservationTableId(eligibleTables[0]?.id ?? null);
    }
  }, [eligibleTables, reservationTableId]);

  const handleReservationSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!reservationTableId) {
        setReservationError('Нет свободных столов на такое количество гостей.');
        return;
      }
      if (new Date(reservationWhen).getTime() <= Date.now()) {
        setReservationError('Выберите время в будущем.');
        return;
      }

      setReservationSubmitting(true);
      setReservationError(null);
      submitReservation({
        cafeTableId: reservationTableId,
        customerName: reservationName,
        phone: reservationPhone || undefined,
        guestsCount: reservationGuests,
        reservedAt: reservationWhen,
        note: reservationNote || undefined,
      })
        .then(() => {
          setReservationDone(true);
          setReservationName('');
          setReservationPhone('');
          setReservationNote('');
        })
        .catch((error: unknown) => {
          setReservationError(error instanceof ApiError ? error.message : 'Не удалось создать бронь.');
        })
        .finally(() => setReservationSubmitting(false));
    },
    [reservationTableId, reservationWhen, reservationName, reservationPhone, reservationGuests, reservationNote],
  );

  const rootClassName = ['app', isDark ? 'theme-dark' : ''].filter(Boolean).join(' ');

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
    el.style.boxShadow = 'var(--shadow-sm)';
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
              aria-busy={isAnimating}
              disabled={isAnimating}
              onClick={toggleTheme}
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

      <CinematicExperience lang={lang} isDark={isDark} enabled={show3d} />

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

          {menuLoading ? (
            <div className="dish-grid">
              {[0, 1, 2].map((i) => (
                <div className="dish-card skeleton-card" key={i} aria-hidden="true" />
              ))}
            </div>
          ) : menuError ? (
            <div className="section-error">
              <span>{menuError}</span>
              <button type="button" className="btn btn-outline" onClick={() => setMenuReloadToken((n) => n + 1)}>
                Повторить
              </button>
            </div>
          ) : (
            <>
              <div className="cat-tabs">
                {categories.map((cat) => {
                  const active = cat.id === activeCat;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`cat-tab ${active ? 'is-active' : ''}`}
                      onClick={() => setActiveCat(cat.id)}
                    >
                      {cat.name}
                      <span className="cat-tab-bar" style={{ transform: `scaleX(${active ? 1 : 0})` }} />
                    </button>
                  );
                })}
              </div>

              {dishes.length === 0 ? (
                <p className="dish-empty">В этой категории пока нет блюд.</p>
              ) : (
                <div className="dish-grid">
                  {dishes.map((dish) => (
                    <article key={dish.id} className="dish-card" onMouseMove={handleTilt} onMouseLeave={resetTilt}>
                      <div className="dish-shot">
                        {dish.imageUrl ? <img src={dish.imageUrl} alt={dish.name} /> : <span>{t.shot}</span>}
                      </div>
                      <div className="dish-body">
                        <div className="dish-row">
                          <h3>{dish.name}</h3>
                          <span className="dish-price">{currencyFormatter.format(dish.price)}</span>
                        </div>
                        {dish.description && <p className="dish-desc">{dish.description}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section id="reserve" className="reserve-section">
        <div className="reserve-inner">
          <p className="eyebrow">{lang === 'ru' ? 'Бронирование' : 'Reservation'}</p>
          <h2 className="menu-title">{lang === 'ru' ? 'Забронировать стол' : 'Reserve a table'}</h2>

          {reservationDone ? (
            <div className="reserve-success">
              <p>
                {lang === 'ru'
                  ? 'Заявка отправлена! Мы свяжемся с вами для подтверждения.'
                  : 'Request sent! We will reach out to confirm.'}
              </p>
              <button type="button" className="btn btn-outline" onClick={() => setReservationDone(false)}>
                {lang === 'ru' ? 'Забронировать ещё' : 'Book another table'}
              </button>
            </div>
          ) : tablesError ? (
            <div className="section-error">
              <span>{tablesError}</span>
            </div>
          ) : (
            <form className="reserve-form" onSubmit={handleReservationSubmit}>
              <div className="reserve-row">
                <label className="reserve-field">
                  <span>{lang === 'ru' ? 'Имя' : 'Name'}</span>
                  <input required value={reservationName} onChange={(e) => setReservationName(e.target.value)} />
                </label>
                <label className="reserve-field">
                  <span>{lang === 'ru' ? 'Телефон' : 'Phone'}</span>
                  <input value={reservationPhone} onChange={(e) => setReservationPhone(e.target.value)} />
                </label>
              </div>

              <div className="reserve-row">
                <label className="reserve-field">
                  <span>{lang === 'ru' ? 'Гостей' : 'Guests'}</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={reservationGuests}
                    onChange={(e) => setReservationGuests(Math.max(1, Number(e.target.value)))}
                  />
                </label>
                <label className="reserve-field">
                  <span>{lang === 'ru' ? 'Дата и время' : 'Date and time'}</span>
                  <input
                    type="datetime-local"
                    required
                    value={reservationWhen}
                    onChange={(e) => setReservationWhen(e.target.value)}
                  />
                </label>
              </div>

              <label className="reserve-field">
                <span>{lang === 'ru' ? 'Стол' : 'Table'}</span>
                <select
                  required
                  value={reservationTableId ?? ''}
                  onChange={(e) => setReservationTableId(Number(e.target.value))}
                >
                  {eligibleTables.length === 0 && <option value="">{lang === 'ru' ? 'Нет мест' : 'No tables'}</option>}
                  {eligibleTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {lang === 'ru' ? `Стол ${table.tableNumber} · до ${table.seatsCount} гостей` : `Table ${table.tableNumber} · up to ${table.seatsCount} guests`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="reserve-field">
                <span>{lang === 'ru' ? 'Пожелания' : 'Notes'}</span>
                <textarea rows={2} value={reservationNote} onChange={(e) => setReservationNote(e.target.value)} />
              </label>

              {reservationError && <div className="reserve-error">{reservationError}</div>}

              <button type="submit" className="btn btn-primary" disabled={reservationSubmitting || !reservationTableId}>
                {reservationSubmitting ? (lang === 'ru' ? 'Отправка…' : 'Sending…') : t.cta1}
              </button>
            </form>
          )}
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
