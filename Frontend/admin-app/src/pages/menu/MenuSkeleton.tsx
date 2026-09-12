import { Skeleton } from '../../components/Skeleton';

/** Skeleton columns shaped like the real category-columns board (header +
 * a couple of card-shaped blocks per column), shown instead of a full-page
 * spinner while dishes/categories are loading. */
export function MenuSkeleton() {
  return (
    <div className="menu-skeleton" aria-hidden="true">
      {[0, 1, 2].map((column) => (
        <div className="menu-skeleton-column" key={column}>
          <Skeleton width="55%" height={16} />
          {[0, 1].map((card) => (
            <div className="menu-skeleton-card" key={card}>
              <Skeleton width="80%" height={14} />
              <Skeleton width="45%" height={12} />
              <div className="menu-skeleton-card-footer">
                <Skeleton width={72} height={12} />
                <Skeleton width={24} height={24} className="menu-skeleton-pill" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
