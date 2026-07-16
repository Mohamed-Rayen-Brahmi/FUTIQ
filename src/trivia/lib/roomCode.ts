/** Generates a random 6-character uppercase alphanumeric room code. */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1 (confusable)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Returns true when s looks like a valid room code. */
export function isValidRoomCode(s: string): boolean {
  return /^[A-Z2-9]{6}$/.test(s.toUpperCase());
}

/** Normalise user input (trim + uppercase). */
export function normaliseRoomCode(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session identity
// A guest session_id is a random UUID stored in localStorage.
// It persists across browser tabs and reloads.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'golazio:trivia-session-id';

export function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}
