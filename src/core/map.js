import { BRICK, COLS, EMPTY, ROWS, STEEL, SPAWNS } from "./constants.js";

export function index(tx, ty, cols = COLS) {
  return ty * cols + tx;
}

export function getTile(map, tx, ty) {
  if (!map || tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return STEEL;
  return map.tiles[index(tx, ty, map.cols)];
}

export function setTile(map, tx, ty, value) {
  if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return;
  map.tiles[index(tx, ty, map.cols)] = value;
}

export function emptyMap() {
  const tiles = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      tiles[index(x, y)] = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? STEEL : EMPTY;
    }
  }
  return { tiles, cols: COLS, rows: ROWS };
}

export function mapFromStrings(rows) {
  if (rows.length !== ROWS) {
    throw new Error(`map needs ${ROWS} rows, got ${rows.length}`);
  }
  const tiles = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) {
    if (rows[y].length !== COLS) {
      throw new Error(`row ${y} needs ${COLS} columns, got ${rows[y].length}`);
    }
    for (let x = 0; x < COLS; x++) {
      const ch = rows[y][x];
      tiles[index(x, y)] = ch === "#" ? STEEL : ch === "B" ? BRICK : EMPTY;
    }
  }
  return { tiles, cols: COLS, rows: ROWS };
}

export function cloneMap(map) {
  return { tiles: new Uint8Array(map.tiles), cols: map.cols, rows: map.rows };
}

function clearSpawns(map) {
  for (const spawn of SPAWNS) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = spawn.tx + dx;
        const y = spawn.ty + dy;
        if (x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1) continue;
        setTile(map, x, y, EMPTY);
      }
    }
  }
}

/** Seeded brick maze with steel pillars and open spawn pockets. */
export function generateMaze(rng) {
  const map = emptyMap();
  for (let x = 3; x < COLS - 2; x += 3) {
    for (let y = 2; y < ROWS - 2; y++) {
      if (rng.next() < 0.72) setTile(map, x, y, BRICK);
    }
    const gap = 2 + rng.int(ROWS - 4);
    setTile(map, x, gap, EMPTY);
    if (gap + 1 < ROWS - 1) setTile(map, x, gap + 1, EMPTY);
  }
  for (let y = 4; y < ROWS - 2; y += 4) {
    for (let x = 2; x < COLS - 2; x++) {
      if (getTile(map, x, y) === EMPTY && rng.next() < 0.45) setTile(map, x, y, BRICK);
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = 2 + rng.int(COLS - 4);
    const y = 2 + rng.int(ROWS - 4);
    setTile(map, x, y, STEEL);
  }
  clearSpawns(map);
  return map;
}
