import { BRICK, DIRS, OPPOSITE, SHELL, SHELL_SPEED, TILE } from "./constants.js";
import { getTile, setTile } from "./map.js";
import { leadingSolid } from "./physics.js";

export function makeShell(player) {
  const dir = DIRS[player.dir];
  const lead = 13 + SHELL / 2 + 2;
  return {
    owner: player.index,
    team: player.team,
    x: player.x + 13 - SHELL / 2 + dir.x * lead,
    y: player.y + 13 - SHELL / 2 + dir.y * lead,
    dir: player.dir,
    speed: SHELL_SPEED,
    bounces: 1,
    blast: !!player.blast,
    alive: true,
    ignore: [player.index],
  };
}

/**
 * Advance one shell. Bricks are destroyed. Steel is indestructible:
 * the shell reverses once, then dies on the next steel contact.
 */
export function stepShell(shell, map) {
  const events = [];
  let left = shell.speed;
  while (left > 0 && shell.alive) {
    const dir = DIRS[shell.dir];
    const nextX = shell.x + dir.x;
    const nextY = shell.y + dir.y;
    const hit = leadingSolid(map, nextX, nextY, shell.dir);
    if (!hit) {
      shell.x = nextX;
      shell.y = nextY;
      left -= 1;
      continue;
    }
    if (hit.kind === BRICK) {
      destroyBrick(map, hit.tx, hit.ty);
      events.push({ type: "brick", tx: hit.tx, ty: hit.ty });
      if (shell.blast) {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = hit.tx + dx;
          const ny = hit.ty + dy;
          if (getTile(map, nx, ny) === BRICK) {
            destroyBrick(map, nx, ny);
            events.push({ type: "brick", tx: nx, ty: ny });
          }
        }
      }
      shell.alive = false;
      break;
    }
    if (shell.bounces > 0) {
      shell.bounces -= 1;
      shell.dir = OPPOSITE[shell.dir];
      events.push({ type: "bounce", tx: hit.tx, ty: hit.ty });
      left -= 1;
      continue;
    }
    shell.alive = false;
    events.push({ type: "steel", tx: hit.tx, ty: hit.ty });
    break;
  }
  return events;
}

export function destroyBrick(map, tx, ty) {
  if (getTile(map, tx, ty) !== BRICK) return false;
  setTile(map, tx, ty, 0);
  return true;
}

export function shellOverlapsTile(shell, tx, ty) {
  return (
    shell.x < (tx + 1) * TILE &&
    shell.x + SHELL > tx * TILE &&
    shell.y < (ty + 1) * TILE &&
    shell.y + SHELL > ty * TILE
  );
}
