import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stepShell } from "../src/core/combat.js";
import { BRICK, MAX_LIVES, STEEL, TILE } from "../src/core/constants.js";
import { hitPlayer, placePlayer, update } from "../src/core/game.js";
import { emptyMap, getTile, setTile } from "../src/core/map.js";
import { applyPowerup } from "../src/core/powerups.js";
import { hold, makeMatch } from "./helpers.js";

describe("power-ups and mines", () => {
  it("grants shield, speed, blast, and a capped extra life", () => {
    const game = makeMatch();
    const tank = game.players[0];
    drop(game, tank, "shield");
    update(game);
    assert.ok(tank.shield > 0);
    assert.equal(game.powerups.length, 0);
    assert.equal(hitPlayer(game, 0, 1), "shield");
    assert.equal(tank.lives, 3);
    assert.equal(tank.shield, 0);

    tank.alive = true;
    applyPowerup(tank, "speed");
    const start = tank.x;
    hold(tank, { right: true });
    update(game);
    assert.equal(tank.x, start + 4);

    applyPowerup(tank, "blast");
    assert.equal(tank.blast, true);
    applyPowerup(tank, "life");
    assert.equal(tank.lives, 4);
    tank.lives = MAX_LIVES;
    applyPowerup(tank, "life");
    assert.equal(tank.lives, MAX_LIVES);
  });

  it("lets a blast shell clear neighboring bricks and leave steel", () => {
    const map = emptyMap();
    setTile(map, 5, 5, BRICK);
    setTile(map, 6, 5, BRICK);
    setTile(map, 5, 4, BRICK);
    setTile(map, 5, 6, BRICK);
    setTile(map, 8, 5, BRICK);
    setTile(map, 5, 3, STEEL);
    const shell = {
      x: 4 * TILE + 8,
      y: 5 * TILE + 12,
      dir: "right",
      speed: 6,
      bounces: 1,
      blast: true,
      alive: true,
    };
    let guard = 0;
    while (shell.alive && guard < 30) {
      stepShell(shell, map);
      guard += 1;
    }
    for (const [tx, ty] of [
      [5, 5],
      [6, 5],
      [5, 4],
      [5, 6],
    ]) {
      assert.equal(getTile(map, tx, ty), 0, `${tx},${ty}`);
    }
    assert.equal(getTile(map, 8, 5), BRICK);
    assert.equal(getTile(map, 5, 3), STEEL);
    assert.equal(shell.alive, false);
  });

  it("damages an enemy that drives over a mine and spares the owner", () => {
    const game = makeMatch({ slots: ["human", "human", "off", "off"] });
    const miner = placePlayer(game, 0, 4, 4, "up");
    const victim = placePlayer(game, 1, 10, 10, "down");
    hold(miner, { secondary: true });
    update(game);
    assert.equal(game.mines.length, 1);
    const mine = game.mines[0];
    miner.x = mine.x;
    miner.y = mine.y;
    miner.alive = true;
    hold(miner, {});
    update(game);
    assert.equal(miner.lives, 3);
    assert.equal(game.mines.length, 1);

    victim.x = mine.x - 4;
    victim.y = mine.y - 4;
    victim.alive = true;
    victim.lives = 3;
    update(game);
    assert.equal(victim.lives, 2);
    assert.equal(miner.score, 1);
    assert.equal(game.mines.length, 0);
  });

  it("does not let a 2v2 mine hurt a teammate", () => {
    const game = makeMatch({ mode: "2v2", slots: ["human", "human", "off", "off"] });
    const miner = placePlayer(game, 0, 4, 4, "up");
    const ally = placePlayer(game, 1, 10, 10, "down");
    hold(miner, { secondary: true });
    update(game);
    const mine = game.mines[0];
    ally.x = mine.x - 4;
    ally.y = mine.y - 4;
    update(game);
    assert.equal(ally.lives, 3);
    assert.equal(game.mines.length, 1);
  });
});

function drop(game, tank, type) {
  game.powerups.push({
    type,
    x: tank.x,
    y: tank.y,
    w: 18,
    h: 18,
    alive: true,
  });
}
