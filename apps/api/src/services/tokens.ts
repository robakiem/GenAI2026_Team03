import { randomBytes } from "node:crypto";

// 128-bit member link token (22 base64url chars), never derived from an id (ADR-0005, NFR-01).
export const newLinkToken = (): string => randomBytes(16).toString("base64url");

// 256-bit session id (contracts 1.2); it is the value stored in the cookie.
export const newSessionId = (): string => randomBytes(32).toString("base64url");
