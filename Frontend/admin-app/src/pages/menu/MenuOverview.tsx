function pluralDishesRu(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return forms[1];
  return forms[2];
}

interface MenuOverviewProps {
  total: number;
  available: number;
  stoplist: number;
  archived: number;
}

/** One quiet inline status line under the page title — deliberately not four
 * large KPI cards; the whole point is that it stays lightweight. */
export function MenuOverview({ total, available, stoplist, archived }: MenuOverviewProps) {
  return (
    <div className="menu-overview">
      <span className="menu-overview-item">
        <strong>{total}</strong> {pluralDishesRu(total, ['блюдо', 'блюда', 'блюд'])}
      </span>
      <span className="menu-overview-dot" aria-hidden="true" />
      <span className="menu-overview-item">
        <span className="menu-overview-dot menu-overview-dot-available" aria-hidden="true" />
        {available} в продаже
      </span>
      <span className="menu-overview-item">
        <span className="menu-overview-dot menu-overview-dot-stoplist" aria-hidden="true" />
        {stoplist} в стоп-листе
      </span>
      {archived > 0 && (
        <span className="menu-overview-item">
          <span className="menu-overview-dot menu-overview-dot-archived" aria-hidden="true" />
          {archived} {pluralDishesRu(archived, ['архивное', 'архивных', 'архивных'])}
        </span>
      )}
    </div>
  );
}
