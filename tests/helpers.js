import { beginMatch, createGame, update } from "../src/core/game.js";
import { emptyHeld } from "../src/core/input.js";

export function makeMatch(options = {}) {
  const game = createGame({
    seed: 1,
    layout: "empty",
    countdownTicks: 0,
    roundEndTicks: 30,
    spawnInvuln: 0,
    slots: ["human", "human", "human", "human"],
    ...options,
  });
  beginMatch(game);
  for (const player of game.players) {
    if (player.slot !== "off") player.invuln = 0;
  }
  return game;
}

export function hold(player, partial) {
  player.held = { ...emptyHeld(), ...partial };
}

export function press(game, index, partial) {
  hold(game.players[index], partial);
  update(game);
}

export { emptyHeld };
