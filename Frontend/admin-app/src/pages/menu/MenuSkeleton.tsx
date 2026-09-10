import { Skeleton } from '../../components/Skeleton';

/** Skeleton rows shaped like the real menu row (media/title/meta/status/action),
 * shown instead of a full-page spinner while dishes/categories are loading. */
export function MenuSkeleton() {
  return (
    <div className="menu-skeleton" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="menu-skeleton-row" key={i}>
          <Skeleton width={56} height={48} className="menu-skeleton-media" />
          <div className="menu-skeleton-text">
            <Skeleton width="42%" height={14} />
            <Skeleton width="65%" height={12} />
          </div>
          <Skeleton width={70} height={14} />
          <Skeleton width={90} height={24} className="menu-skeleton-pill" />
          <Skeleton width={28} height={28} className="menu-skeleton-pill" />
        </div>
      ))}
    </div>
  );
}
