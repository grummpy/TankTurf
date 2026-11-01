import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TANK, TILE } from "../src/core/constants.js";
import { update } from "../src/core/game.js";
import { setTile } from "../src/core/map.js";
import { BRICK } from "../src/core/constants.js";
import { rectsOverlap } from "../src/core/physics.js";
import { hold, makeMatch } from "./helpers.js";

describe("movement and collision", () => {
  it("moves a tank by its speed while the path is open", () => {
    const game = makeMatch();
    const tank = game.players[0];
    const start = tank.x;
    hold(tank, { right: true });
    for (let i = 0; i < 10; i++) update(game);
    assert.equal(tank.dir, "right");
    assert.equal(tank.x, start + 20);
    assert.equal(tank.y, game.players[0].y);
  });

  it("does not enter brick or the steel border", () => {
    const game = makeMatch();
    const tank = game.players[0];
    setTile(game.map, 2, 1, BRICK);
    hold(tank, { right: true });
    for (let i = 0; i < 30; i++) update(game);
    assert.ok(!overlapsBrick(tank, 2, 1));
    assert.ok(tank.x + TANK <= 2 * TILE);

    hold(tank, { left: true });
    for (let i = 0; i < 40; i++) update(game);
    assert.ok(tank.x >= TILE);
    assert.ok(!overlapsBrick(tank, 0, 1));
  });

  it("does not overlap another tank", () => {
    const game = makeMatch();
    const a = game.players[0];
    const b = game.players[1];
    a.x = 5 * TILE + 3;
    a.y = 5 * TILE + 3;
    b.x = 6 * TILE + 3;
    b.y = 5 * TILE + 3;
    b.alive = true;
    hold(a, { right: true });
    hold(b, {});
    for (let i = 0; i < 20; i++) update(game);
    assert.equal(
      rectsOverlap(a.x, a.y, TANK, TANK, b.x, b.y, TANK, TANK),
      false,
    );
  });

  it("slides to the lane and then turns", () => {
    const game = makeMatch();
    const tank = game.players[0];
    tank.dir = "right";
    tank.x += 4;
    assert.equal((tank.x - 3) % TILE === 0, false);
    hold(tank, { down: true });
    update(game);
    assert.equal(tank.dir, "right");
    assert.ok(tank.x > 3);
    for (let i = 0; i < 20; i++) update(game);
    assert.equal(tank.dir, "down");
  });
});

function overlapsBrick(tank, tx, ty) {
  return rectsOverlap(tank.x, tank.y, TANK, TANK, tx * TILE, ty * TILE, TILE, TILE);
}
