import { useEffect } from 'react';

type ScrollLockSnapshot = {
  scrollTop: number;
  htmlOverflow: string;
  htmlOverscroll: string;
  bodyOverflow: string;
  bodyOverscroll: string;
};

let activeLocks = 0;
let snapshot: ScrollLockSnapshot | null = null;

function lockPageScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  activeLocks += 1;
  if (activeLocks > 1) return;

  const { body, documentElement } = document;
  const scrollTop = window.scrollY;
  snapshot = {
    scrollTop,
    htmlOverflow: documentElement.style.overflow,
    htmlOverscroll: documentElement.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
  };

  documentElement.style.overflow = 'hidden';
  documentElement.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
}

function unlockPageScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || activeLocks === 0) return;
  activeLocks -= 1;
  if (activeLocks > 0 || !snapshot) return;

  const { body, documentElement } = document;
  const previous = snapshot;
  snapshot = null;
  documentElement.style.overflow = previous.htmlOverflow;
  documentElement.style.overscrollBehavior = previous.htmlOverscroll;
  body.style.overflow = previous.bodyOverflow;
  body.style.overscrollBehavior = previous.bodyOverscroll;
  window.scrollTo(0, previous.scrollTop);
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    lockPageScroll();
    return unlockPageScroll;
  }, [active]);
}
