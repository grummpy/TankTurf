import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("arcade.json", () => {
  it("matches the arcade manifest and points at real files", () => {
    const manifest = JSON.parse(read("arcade.json"));
    assert.equal(manifest.name, "Tank Turf");
    assert.equal(manifest.id, "tankturf");
    assert.equal(manifest.players, 4);
    assert.equal(manifest.minPlayers, 1);
    assert.equal(manifest.port, 8809);
    assert.equal(manifest.version, "1.0.0");
    assert.deepEqual(manifest.input, ["keyboard", "gamepad"]);
    assert.equal(manifest.icon, "assets/icon.jpg");
    assert.equal(manifest.cover, "assets/cover.jpg");
    assert.equal(manifest.launch.mac, "./launch-mac.command");
    assert.equal(manifest.launch.windows, "launch-windows.bat");
    assert.equal(manifest.launch.linux, "./launch-linux.sh");
    assert.equal(manifest.launch.web, "index.html");

    for (const rel of [
      manifest.icon,
      manifest.cover,
      manifest.launch.web,
      manifest.launch.mac.replace(/^\.\//, ""),
      manifest.launch.windows,
      manifest.launch.linux.replace(/^\.\//, ""),
      "server.py",
    ]) {
      assert.equal(fs.existsSync(path.join(root, rel)), true, rel);
    }
  });

  it("serves the documented port from the local server and launchers", () => {
    const server = read("server.py");
    assert.match(server, /127\.0\.0\.1/);
    assert.match(server, /8809/);
    assert.match(server, /no-browser/);
    for (const rel of ["launch-mac.command", "launch-linux.sh", "launch-windows.bat"]) {
      const text = read(rel);
      assert.match(text, /python/i);
      assert.match(text, /server\.py/);
      assert.match(text, /Python 3 is required/);
    }
    const mac = fs.statSync(path.join(root, "launch-mac.command")).mode;
    const linux = fs.statSync(path.join(root, "launch-linux.sh")).mode;
    assert.ok(mac & 0o111, "launch-mac.command should be executable");
    assert.ok(linux & 0o111, "launch-linux.sh should be executable");
  });
});
