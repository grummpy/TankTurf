import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stepShell } from "../src/core/combat.js";
import { BRICK, STEEL, TILE } from "../src/core/constants.js";
import { placePlayer, update } from "../src/core/game.js";
import { emptyMap, getTile, setTile } from "../src/core/map.js";
import { hold, makeMatch } from "./helpers.js";

describe("shells", () => {
  it("destroys a brick tile and stops", () => {
    const map = emptyMap();
    setTile(map, 5, 5, BRICK);
    setTile(map, 6, 5, BRICK);
    const shell = shellAt(4, 5);
    let guard = 0;
    while (shell.alive && guard < 40) {
      stepShell(shell, map);
      guard += 1;
    }
    assert.equal(getTile(map, 5, 5), 0);
    assert.equal(getTile(map, 6, 5), BRICK);
    assert.equal(shell.alive, false);
  });

  it("bounces once off steel and dies on the next steel hit", () => {
    const map = emptyMap();
    setTile(map, 5, 5, STEEL);
    const shell = shellAt(4, 5);
    let bounces = 0;
    let guard = 0;
    while (shell.alive && guard < 200) {
      const events = stepShell(shell, map);
      bounces += events.filter((event) => event.type === "bounce").length;
      guard += 1;
    }
    assert.equal(bounces, 1);
    assert.equal(shell.alive, false);
    assert.equal(getTile(map, 5, 5), STEEL);
  });

  it("keeps only one shell in flight per tank", () => {
    const game = makeMatch({ slots: ["human", "human", "off", "off"] });
    const tank = placePlayer(game, 0, 3, 3, "right");
    placePlayer(game, 1, 10, 10, "up");
    hold(tank, { action: true });
    update(game);
    assert.equal(game.shells.filter((shell) => shell.owner === 0).length, 1);
    for (let i = 0; i < 8; i++) update(game);
    assert.equal(game.shells.filter((shell) => shell.owner === 0).length, 1);
    hold(tank, {});
    update(game);
    while (game.shells.some((shell) => shell.owner === 0 && shell.alive)) update(game);
    hold(tank, { action: true });
    update(game);
    assert.equal(game.shells.filter((shell) => shell.owner === 0).length, 1);
  });

  it("passes through a teammate and damages the other team", () => {
    const game = makeMatch({
      mode: "2v2",
      slots: ["human", "human", "human", "off"],
    });
    const a = placePlayer(game, 0, 2, 5, "right");
    const ally = placePlayer(game, 1, 4, 5, "left");
    const enemy = placePlayer(game, 2, 8, 5, "left");
    ally.lives = 3;
    enemy.lives = 3;
    hold(a, { action: true });
    update(game);
    for (let i = 0; i < 50; i++) update(game);
    assert.equal(ally.lives, 3);
    assert.equal(ally.eliminated, false);
    assert.equal(enemy.lives, 2);
    assert.equal(a.score, 1);
  });

  it("cancels both shells when they meet", () => {
    const game = makeMatch({ slots: ["human", "human", "off", "off"] });
    const a = placePlayer(game, 0, 2, 6, "right");
    const b = placePlayer(game, 1, 8, 6, "left");
    hold(a, { action: true });
    hold(b, { action: true });
    update(game);
    assert.equal(game.shells.length, 2);
    for (let i = 0; i < 40; i++) update(game);
    assert.equal(game.shells.length, 0);
    assert.equal(a.lives, 3);
    assert.equal(b.lives, 3);
  });
});

function shellAt(tx, ty) {
  return {
    owner: 0,
    team: 0,
    x: tx * TILE + 8,
    y: ty * TILE + 12,
    dir: "right",
    speed: 6,
    bounces: 1,
    blast: false,
    alive: true,
    ignore: [0],
  };
}
