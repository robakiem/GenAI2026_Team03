import type { PrismaClient } from "../data/generated/client";

type Method = (...args: unknown[]) => unknown;
type Replace = (prop: string | symbol) => { value: unknown } | undefined;

// A Proxy over `target` that answers some properties itself and forwards the rest (bound to the
// real object, so Prisma's internals keep their `this`). Used to break the database from the inside.
export function intercept<T extends object>(target: T, replace: Replace): T {
  return new Proxy(target, {
    get(object, prop, receiver) {
      const replacement = replace(prop);
      if (replacement) return replacement.value;
      const original: unknown = Reflect.get(object, prop, receiver);
      return typeof original === "function" ? (original as Method).bind(object) : original;
    },
  });
}

// Every operation on every model, and every transaction, fails with whatever `failure` makes.
export function brokenPrisma(prisma: PrismaClient, failure: () => unknown): PrismaClient {
  const fail = () => {
    throw failure();
  };
  const model = new Proxy({}, { get: () => fail });
  return intercept(prisma, (prop) => {
    if (prop === "$transaction" || prop === "$queryRaw") return { value: fail };
    if (typeof prop === "string" && !prop.startsWith("$")) return { value: model };
    return undefined;
  });
}

// Inside transactions, `model` behaves as usual except for the given methods, which are replaced.
// Everything outside a transaction, and every other model, is the real thing.
export function overrideInTransaction(prisma: PrismaClient, model: string, overrides: Record<string, Method>): PrismaClient {
  return intercept(prisma, (prop) => {
    if (prop !== "$transaction") return undefined;
    const run = (fn: (tx: unknown) => Promise<unknown>) =>
      prisma.$transaction((tx) =>
        fn(
          intercept(tx, (txProp) => {
            if (txProp !== model) return undefined;
            const real = (tx as unknown as Record<string, object>)[model];
            return { value: intercept(real, (name) => (typeof name === "string" && name in overrides ? { value: overrides[name] } : undefined)) };
          }),
        ),
      );
    return { value: run };
  });
}
