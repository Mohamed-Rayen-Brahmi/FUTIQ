// Two persistence backends, used for different kinds of data:
//
// - Cookie + localStorage (dual-write): for small, bounded data — the guest
//   stats blob (streak/games played/games won). Some preview/embedded
//   environments (sandboxed iframes, strict privacy modes) block or wipe
//   localStorage, and some block cookies; writing to both and reading
//   whichever has data survives a much wider range of environments than
//   either alone. Cookies are set with a long expiry (1 year) and Path=/ so
//   they survive a full browser close/reopen.
//
// - localStorage only: for round state (the guess history array, which
//   grows with every guess and can hold full player objects). Cookies have
//   a hard ~4KB-per-cookie limit; once round state crosses that, the browser
//   silently refuses to update the cookie, so it freezes at whatever guess
//   count last fit — while localStorage keeps recording every guess
//   correctly. Reading would then have to choose between a frozen cookie and
//   an up-to-date localStorage value with no reliable way to tell which is
//   newer, so round state skips the cookie backend entirely rather than risk
//   silently truncating a player's progress.

const COOKIE_MAX_AGE_DAYS = 365;

function setCookie(name: string, value: string, days = COOKIE_MAX_AGE_DAYS): void {
  try {
    const maxAge = days * 24 * 60 * 60;
    const encoded = encodeURIComponent(value);
    // Secure is added automatically when served over https (real deployments)
    // but omitted on plain http (local/dev preview), where a Secure cookie
    // would just get silently dropped by the browser instead of set.
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encoded}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // ignore (cookies disabled/blocked)
  }
}

function getCookie(name: string): string | null {
  try {
    const prefix = `${name}=`;
    const parts = document.cookie.split('; ');
    for (const part of parts) {
      if (part.startsWith(prefix)) {
        return decodeURIComponent(part.slice(prefix.length));
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function deleteCookie(name: string): void {
  try {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function getLocal(name: string): string | null {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
}

function setLocal(name: string, value: string): void {
  try {
    localStorage.setItem(name, value);
  } catch {
    // ignore (storage disabled/full)
  }
}

function removeLocal(name: string): void {
  try {
    localStorage.removeItem(name);
  } catch {
    // ignore
  }
}

/** Read a small value, checking cookie first, falling back to localStorage. */
export function readPersisted(key: string): string | null {
  const cookieVal = getCookie(key);
  if (cookieVal !== null) return cookieVal;
  return getLocal(key);
}

/** Write a small value to both backends so either one surviving is enough. */
export function writePersisted(key: string, value: string): void {
  setCookie(key, value);
  setLocal(key, value);
}

/** Remove a small value from both backends. */
export function clearPersisted(key: string): void {
  deleteCookie(key);
  removeLocal(key);
}

/** Read a value from localStorage only (for data too large/variable for a cookie). */
export function readLocal(key: string): string | null {
  return getLocal(key);
}

/** Write a value to localStorage only (for data too large/variable for a cookie). */
export function writeLocal(key: string, value: string): void {
  setLocal(key, value);
}

/** Remove a localStorage-only value. */
export function clearLocal(key: string): void {
  removeLocal(key);
}
