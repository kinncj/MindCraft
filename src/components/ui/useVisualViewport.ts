import { useEffect } from 'react';

/**
 * Keeps `--vvh` (the visible viewport height) on the root element. iOS
 * Safari does not shrink the layout viewport when the keyboard opens, so
 * bottom-pinned inputs vanish behind it unless we size to this instead.
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const apply = (): void => {
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      root.style.setProperty('--vv-top', `${Math.round(vv.offsetTop)}px`);
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--vv-top');
    };
  }, []);
}
