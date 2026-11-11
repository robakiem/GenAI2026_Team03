// A unique-constraint violation from Prisma (e.g. a duplicate member name) is code "P2002".
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

interface UniqueViolationMeta {
  target?: unknown;
  driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
}

// The columns behind a P2002, so a caller can tell which unique constraint was hit. Prisma 7 with
// a driver adapter reports them in meta.driverAdapterError.cause.constraint.fields; the query
// engine of earlier versions used meta.target. Returns null when neither is present.
export function uniqueViolationTarget(error: unknown): string[] | null {
  if (!isUniqueViolation(error)) return null;
  const meta = (error as { meta?: UniqueViolationMeta }).meta;
  const target = meta?.driverAdapterError?.cause?.constraint?.fields ?? meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return null;
}
