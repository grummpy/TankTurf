import { BRICK, DIR_LIST, DIRS, SPEED, STEEL, TANK, TILE, isAligned } from "./constants.js";
import { emptyHeld } from "./input.js";
import { getTile } from "./map.js";
import { blockedRect } from "./physics.js";

function nearest(player, enemies) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of enemies) {
    const dist = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

function laneClear(map, player, enemy, dir) {
  const step = DIRS[dir];
  let tx = Math.floor((player.x + TANK / 2) / TILE);
  let ty = Math.floor((player.y + TANK / 2) / TILE);
  const etx = Math.floor((enemy.x + TANK / 2) / TILE);
  const ety = Math.floor((enemy.y + TANK / 2) / TILE);
  tx += step.x;
  ty += step.y;
  let guard = 0;
  while ((tx !== etx || ty !== ety) && guard < 40) {
    const tile = getTile(map, tx, ty);
    if (tile === BRICK || tile === STEEL) return false;
    tx += step.x;
    ty += step.y;
    guard += 1;
  }
  return guard < 40;
}

function shotDirection(game, player, enemies) {
  if (!isAligned(player)) return null;
  const pcx = player.x + TANK / 2;
  const pcy = player.y + TANK / 2;
  let best = null;
  let bestDist = Infinity;
  for (const enemy of enemies) {
    const ecx = enemy.x + TANK / 2;
    const ecy = enemy.y + TANK / 2;
    let dir = null;
    if (Math.abs(pcy - ecy) <= 10 && Math.abs(ecx - pcx) > TILE / 2) {
      dir = ecx > pcx ? "right" : "left";
    } else if (Math.abs(pcx - ecx) <= 10 && Math.abs(ecy - pcy) > TILE / 2) {
      dir = ecy > pcy ? "down" : "up";
    }
    if (!dir) continue;
    if (!laneClear(game.map, player, enemy, dir)) continue;
    const dist = Math.abs(ecx - pcx) + Math.abs(ecy - pcy);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

/** Simple turret: shoot down a clear lane, otherwise walk toward the nearest enemy. */
export function decideBot(game, player) {
  const held = emptyHeld();
  if (!player.alive) return held;
  const enemies = game.players.filter(
    (other) => other.alive && other.slot !== "off" && other.team !== player.team,
  );
  const shot = shotDirection(game, player, enemies);
  const flying = game.shells.some((shell) => shell.alive && shell.owner === player.index);
  if (shot && !flying) {
    player.dir = shot;
    held.action = !player.prevAction;
    return held;
  }
  if (!isAligned(player)) {
    if (player.dir) held[player.dir] = true;
    return held;
  }
  const options = DIR_LIST.filter((dir) => {
    const vector = DIRS[dir];
    return !blockedRect(
      game.map,
      player.x + vector.x * SPEED,
      player.y + vector.y * SPEED,
      TANK,
      TANK,
      game.players,
      player,
    );
  });
  if (options.length === 0) return held;
  const target = nearest(player, enemies);
  let best = options[0];
  let bestScore = -Infinity;
  for (const dir of options) {
    const nx = player.x + DIRS[dir].x * TILE;
    const ny = player.y + DIRS[dir].y * TILE;
    let score = dir === player.dir ? 2 : 0;
    if (target) score -= Math.abs(target.x - nx) + Math.abs(target.y - ny);
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  if (options.length > 1 && game.rng.next() < 0.1) {
    best = options[game.rng.int(options.length)];
  }
  held[best] = true;
  return held;
}
