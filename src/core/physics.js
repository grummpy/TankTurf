import { BRICK, SHELL, STEEL, TANK, TILE } from "./constants.js";
import { getTile } from "./map.js";

export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function tilesTouched(x, y, w, h) {
  const x0 = Math.floor(x / TILE);
  const y0 = Math.floor(y / TILE);
  const x1 = Math.floor((x + w - 1e-6) / TILE);
  const y1 = Math.floor((y + h - 1e-6) / TILE);
  const cells = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) cells.push([tx, ty]);
  }
  return cells;
}

export function overlapsSolid(map, x, y, w, h) {
  for (const [tx, ty] of tilesTouched(x, y, w, h)) {
    const tile = getTile(map, tx, ty);
    if (tile === BRICK || tile === STEEL) return true;
  }
  return false;
}

export function blockedRect(map, x, y, w, h, tanks, self) {
  if (overlapsSolid(map, x, y, w, h)) return true;
  for (const other of tanks) {
    if (other === self || !other.alive) continue;
    if (rectsOverlap(x, y, w, h, other.x, other.y, TANK, TANK)) return true;
  }
  return false;
}

/** The solid cell a shell's leading edge is touching, if any. */
export function leadingSolid(map, x, y, dir) {
  const hits = [];
  for (const [tx, ty] of tilesTouched(x, y, SHELL, SHELL)) {
    const kind = getTile(map, tx, ty);
    if (kind === BRICK || kind === STEEL) hits.push({ tx, ty, kind });
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => {
    if (dir === "right") return b.tx - a.tx || a.ty - b.ty;
    if (dir === "left") return a.tx - b.tx || a.ty - b.ty;
    if (dir === "down") return b.ty - a.ty || a.tx - b.tx;
    return a.ty - b.ty || a.tx - b.tx;
  });
  return hits[0];
}
