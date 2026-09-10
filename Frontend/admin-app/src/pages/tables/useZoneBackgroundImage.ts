import { useEffect, useState } from 'react';

// Loads the active zone's floor-plan background once per URL and caches the resulting
// HTMLImageElement, keyed purely by `url` — untouched by the tables poll (which only
// ever changes table data, not zones), so the image only reloads when the zone actually
// changes or its background is replaced (see CLAUDE.md's /tables performance note).
export function useZoneBackgroundImage(url: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(null);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return image;
}
