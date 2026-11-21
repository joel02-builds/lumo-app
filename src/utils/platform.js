/**
 * Plattform-Erkennung (rein, mit übergebbaren Werten – testbar ohne Browser)
 * ─────────────────────────────────────────────────────────────────────────────
 * isIOS: iPhone, iPod, iPad – auch iPadOS 13+. Das iPad meldet sich dort im Standardmodus als Mac
 * ("Macintosh" im User-Agent, navigator.platform "MacIntel"). Standardmethode, es von einem echten Mac
 * zu unterscheiden: Ein iPad hat einen Touchscreen (maxTouchPoints > 1), ein Mac nicht.
 * Das alte Windows-Phone-Merkmal (window.MSStream) schließt weiterhin aus.
 */
export function isIOS({
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  platform = typeof navigator !== 'undefined' ? navigator.platform : '',
  maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
  msStream = typeof window !== 'undefined' ? window.MSStream : undefined,
} = {}) {
  if (msStream) return false;
  if (/iphone|ipad|ipod/i.test(userAgent || '')) return true;
  return platform === 'MacIntel' && Number(maxTouchPoints) > 1; // iPadOS 13+
}
