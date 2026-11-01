/** Shared simulation constants. The browser layer lives outside this folder. */

export const TILE = 32;
export const COLS = 19;
export const ROWS = 15;
export const TANK = 26;
export const INSET = 3;
export const SPEED = 2;
export const SHELL = 6;
export const SHELL_SPEED = 6;
export const MINE = 16;
export const LIVES = 3;
export const MAX_LIVES = 5;

export const EMPTY = 0;
export const BRICK = 1;
export const STEEL = 2;

export const PLAYER_NAMES = ["GOLD", "SAGE", "AZURE", "CRIMSON"];
export const PLAYER_COLORS = ["#f2c14e", "#3dbe7a", "#4aa3ff", "#e23d3d"];

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const DIR_LIST = ["up", "down", "left", "right"];

export const OPPOSITE = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

/** Corner pockets inside the steel border: top-left, top-right, bottom-left, bottom-right. */
export const SPAWNS = [
  { tx: 1, ty: 1, dir: "down" },
  { tx: COLS - 2, ty: 1, dir: "down" },
  { tx: 1, ty: ROWS - 2, dir: "up" },
  { tx: COLS - 2, ty: ROWS - 2, dir: "up" },
];

export function tileToPx(tx, ty) {
  return { x: tx * TILE + INSET, y: ty * TILE + INSET };
}

export function isPerp(a, b) {
  if (!a || !b || a === b) return false;
  const horizontal = a === "left" || a === "right";
  const otherHorizontal = b === "left" || b === "right";
  return horizontal !== otherHorizontal;
}

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function isAligned(entity) {
  return mod(entity.x - INSET, TILE) === 0 && mod(entity.y - INSET, TILE) === 0;
}
