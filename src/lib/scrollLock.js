let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';

/**
 * Locks the body and HTML scroll when a modal, popup, or filter sheet is opened.
 * Supports multiple nested modals via reference counting.
 */
export function lockScroll() {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('overflow-hidden');
    document.documentElement.classList.add('overflow-hidden');
  }
  lockCount++;
}

/**
 * Unlocks the body and HTML scroll when a modal, popup, or filter sheet is closed.
 */
export function unlockScroll() {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalBodyOverflow || '';
    document.documentElement.style.overflow = originalHtmlOverflow || '';
    document.body.classList.remove('overflow-hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }
}
