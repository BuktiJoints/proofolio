import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openapi } from "@/server/openapi";
function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? routes(join(dir, entry.name))
      : entry.name === "route.ts"
        ? [join(dir, entry.name)]
        : [],
  );
}
describe("OpenAPI contract coverage", () => {
  it("documents every product/public/health route and exported HTTP method", () => {
    const paths = openapi.paths as Record<string, Record<string, unknown>>;
    for (const file of routes("app/api").filter(
      (file) => !file.includes("[...all]"),
    )) {
      const path =
        "/" +
        file
          .replace(/^app\//, "")
          .replace(/\/route.ts$/, "")
          .replace(/\[([^\]]+)\]/g, "{$1}");
      expect(Object.hasOwn(paths, path)).toBe(true);
      const methods = [
        ...readFileSync(file, "utf8").matchAll(
          /export const (GET|POST|PUT|PATCH|DELETE|HEAD)\b/g,
        ),
      ].map((match) => match[1].toLowerCase());
      for (const method of methods)
        expect(Object.hasOwn(paths[path], method)).toBe(true);
    }
  });
  it("resolves all schema references", () => {
    const schemaNames = new Set(Object.keys(openapi.components.schemas));
    for (const match of JSON.stringify(openapi).matchAll(
      /#\/components\/schemas\/([A-Za-z]+)/g,
    ))
      expect(schemaNames.has(match[1])).toBe(true);
  });
});
