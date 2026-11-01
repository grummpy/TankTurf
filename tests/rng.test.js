import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeRng } from "../src/core/rng.js";
import { snapshot } from "../src/core/game.js";
import { makeMatch } from "./helpers.js";
import { update } from "../src/core/game.js";

describe("seeded rng", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = makeRng(0x7a11);
    const b = makeRng(0x7a11);
    const seqA = Array.from({ length: 8 }, () => a.next());
    const seqB = Array.from({ length: 8 }, () => b.next());
    assert.deepEqual(seqA, seqB);
    assert.equal(a.state, b.state);
  });

  it("diverges for a different seed", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    assert.notEqual(a.next(), b.next());
  });

  it("draws integers inside the requested range", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 40; i++) {
      const n = rng.int(5);
      assert.ok(n >= 0 && n < 5);
      assert.equal(n, Math.floor(n));
    }
  });

  it("replays a bot match from the same seed", () => {
    const run = () => {
      const game = makeMatch({
        seed: 42,
        layout: "maze",
        slots: ["bot", "bot", "bot", "bot"],
        countdownTicks: 0,
        spawnInvuln: 0,
      });
      for (let i = 0; i < 180; i++) update(game);
      return snapshot(game);
    };
    assert.equal(run(), run());
  });
});
