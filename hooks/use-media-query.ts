import { useEffect, useState } from "react";

// Generic matchMedia hook. Starts `false` on the server / first paint, then
// settles after mount — fine for content that only appears post-hydration
// (e.g. an overlay that opens on click).
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Desktop = the `lg` Tailwind breakpoint (1024px), matching the layout
// convention used across the app. (Note: hooks/use-mobile.ts breaks at 768px.)
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
