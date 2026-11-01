import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { update } from "../src/core/game.js";
import { placePlayer } from "../src/core/game.js";
import { makeMatch } from "./helpers.js";

describe("bots", () => {
  it("fires down a clear lane at an enemy", () => {
    const game = makeMatch({
      slots: ["bot", "human", "off", "off"],
      layout: "empty",
      seed: 3,
    });
    placePlayer(game, 0, 2, 5, "right");
    placePlayer(game, 1, 8, 5, "left");
    game.players[1].held = { up: false, down: false, left: false, right: false, action: false, secondary: false };
    update(game);
    assert.ok(game.shells.some((shell) => shell.owner === 0 && shell.alive));
    assert.ok(game.events.some((event) => event.type === "shoot" && event.player === 0));
  });
});
