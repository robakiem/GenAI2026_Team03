import type { Request, Response } from "express";

// The session cookie (contracts 2.1, ADR-0005): HttpOnly, SameSite=Lax, Path=/, 30 days,
// Secure only when the request arrived over HTTPS.
export const SESSION_COOKIE = "babki_session";

export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      return decodeCookieValue(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

// A malformed value must read as "no session" (→ 401), never crash the request with a URIError.
function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function setSessionCookie(res: Response, id: string, expiresAt: Date, secure: boolean): void {
  res.cookie(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", secure, expires: expiresAt });
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/", secure });
}
