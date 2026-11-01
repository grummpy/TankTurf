import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function filesUnder(dir) {
  const full = path.join(root, dir);
  return fs.readdirSync(full).filter((name) => name.endsWith(".js")).map((name) => path.join(dir, name));
}

describe("offline module layout", () => {
  it("keeps DOM and canvas out of the core", () => {
    const banned = [/document/, /window/, /localStorage/, /canvas/i, /AudioContext/, /from ["']\.\.\/ui\//];
    for (const rel of filesUnder("src/core")) {
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      for (const pattern of banned) {
        assert.equal(pattern.test(text), false, `${rel} matched ${pattern}`);
      }
    }
  });

  it("does not load a CDN or a bundler", () => {
    const rels = ["index.html", ...filesUnder("src/core"), ...filesUnder("src/ui")];
    const banned = [/cdn\./i, /unpkg/, /jsdelivr/, /googleapis/, /skypack/];
    for (const rel of rels) {
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      for (const pattern of banned) {
        assert.equal(pattern.test(text), false, `${rel} matched ${pattern}`);
      }
    }
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    assert.match(html, /<canvas/);
    assert.match(html, /src\/ui\/main\.js/);
    assert.match(html, /assets\/cover\.jpg|assets\/icon\.jpg/);
  });
});
