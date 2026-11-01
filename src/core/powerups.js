import { MAX_LIVES } from "./constants.js";

export const POWERUP_TYPES = ["shield", "speed", "blast", "life"];

export function applyPowerup(player, type) {
  if (type === "shield") {
    player.shield = 180;
    return "shield";
  }
  if (type === "speed") {
    player.speedTimer = 300;
    return "speed";
  }
  if (type === "blast") {
    player.blast = true;
    return "blast";
  }
  if (type === "life") {
    player.lives = Math.min(MAX_LIVES, player.lives + 1);
    return "life";
  }
  return null;
}
