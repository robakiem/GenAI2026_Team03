import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Architecture rules of CLAUDE.md §3 and §5 turned into checks: a violation fails the build
// instead of waiting for a reviewer to notice (ADR-0001).
const root = fileURLToPath(new URL("../../../", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (name === "generated" || name === "node_modules" || name === "dist") return [];
    if (statSync(join(root, path)).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}
const read = (path: string) => readFileSync(join(root, path), "utf8");
const importsOf = (path: string) => [...read(path).matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
const offenders = (files: string[], bad: (spec: string) => boolean) =>
  files.flatMap((file) => importsOf(file).filter(bad).map((spec) => `${relative("", file)} → ${spec}`));

describe("Dependency direction: routes → services → data; shared depends on nothing", () => {
  it("packages/shared imports nothing from the apps and nothing but zod", () => {
    const bad = offenders(sources("packages/shared/src"), (s) => !s.startsWith(".") && s !== "zod");
    expect(bad).toEqual([]);
  });

  it("data imports neither services nor routes", () => {
    expect(offenders(sources("apps/api/src/data"), (s) => /\/(services|routes)\//.test(s))).toEqual([]);
  });

  it("services import no routes, no express and no HTTP types", () => {
    expect(offenders(sources("apps/api/src/services"), (s) => /routes|^express/.test(s))).toEqual([]);
  });

  it("routes never touch the database layer or Prisma directly", () => {
    expect(offenders(sources("apps/api/src/routes"), (s) => /\/data\/|@prisma|generated/.test(s))).toEqual([]);
  });

  it("the web app never imports the API app", () => {
    expect(offenders(sources("apps/web/src"), (s) => /apps\/api|@babki\/api/.test(s))).toEqual([]);
  });

  it("the API never imports the web app", () => {
    expect(offenders(sources("apps/api/src"), (s) => /apps\/web|@babki\/web/.test(s))).toEqual([]);
  });
});

describe("Money is never a float, a decimal or a string in storage and calculations (CLAUDE.md §5)", () => {
  it("the Prisma schema stores every …Kopecks and …Bp column as an integer", () => {
    const schema = read("apps/api/prisma/schema.prisma");
    const columns = [...schema.matchAll(/^\s*(\w*(?:Kopecks|Bp))\s+(\w+\??)/gm)];
    expect(columns.length).toBeGreaterThan(0);
    for (const [, name, type] of columns) expect(["Int", "Int?", "BigInt"], name).toContain(type);
    expect(schema).not.toMatch(/\b(Float|Decimal)\b/);
  });

  it("calculation and service code has no toFixed, parseFloat or Math.round on money", () => {
    const files = [...sources("packages/shared/src"), ...sources("apps/api/src/services")];
    const bad = files.filter((f) => /\.toFixed\(|parseFloat\(|Math\.round\(/.test(read(f)));
    expect(bad).toEqual([]);
  });
});

describe("Business rules stay out of routes and components", () => {
  it("routes contain no arithmetic on kopecks, no AppError and no state checks", () => {
    for (const file of sources("apps/api/src/routes")) {
      const text = read(file);
      expect(text, file).not.toMatch(/new AppError|Kopecks\s*[-+*/]|\.state\s*===/);
    }
  });

  it("web components import the split and settlement logic from shared, not their own copy", () => {
    const duplicated = sources("apps/web/src").filter((f) => /function\s+(splitExpense|computeBalances|proposeTransfers)\b/.test(read(f)));
    expect(duplicated).toEqual([]);
  });

  it("no user-visible Ukrainian text is hard-coded outside i18n/uk.ts", () => {
    const bad = sources("apps/web/src")
      .filter((f) => !f.endsWith("i18n/uk.ts"))
      .filter((f) => /[А-Яа-яІіЇїЄєҐґ]{3,}/.test(read(f).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(bad).toEqual([]);
  });
});

describe("Hygiene that CLAUDE.md forbids", () => {
  it("no eslint-disable and no `as any` in production code", () => {
    const files = [...sources("apps/api/src"), ...sources("apps/web/src"), ...sources("packages/shared/src")];
    expect(files.filter((f) => /eslint-disable|\bas any\b/.test(read(f)))).toEqual([]);
  });

  it("no file in the repository's tracked source mentions a secret-looking literal", () => {
    const files = [...sources("apps/api/src"), ...sources("apps/web/src")].filter((f) => !f.includes("/test/"));
    expect(files.filter((f) => /(api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{8,}["']/i.test(read(f)))).toEqual([]);
  });
});
