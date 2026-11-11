// A unique-constraint violation from Prisma (e.g. a duplicate member name) is code "P2002".
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

// The columns/index behind a P2002, so a caller can tell which unique constraint was hit.
// Returns null when Prisma did not report a target.
export function uniqueViolationTarget(error: unknown): string[] | null {
  if (!isUniqueViolation(error)) return null;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return null;
}
