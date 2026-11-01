import { decideBot } from "./ai.js";
import { makeShell, stepShell } from "./combat.js";
import {
  DIRS,
  DIR_LIST,
  LIVES,
  MINE,
  OPPOSITE,
  PLAYER_COLORS,
  PLAYER_NAMES,
  SPAWNS,
  SPEED,
  TANK,
  TILE,
  isAligned,
  isPerp,
  tileToPx,
} from "./constants.js";
import { emptyHeld } from "./input.js";
import { cloneMap, emptyMap, generateMaze, mapFromStrings } from "./map.js";
import { blockedRect, overlapsSolid, rectsOverlap } from "./physics.js";
import { POWERUP_TYPES, applyPowerup } from "./powerups.js";
import { makeRng } from "./rng.js";

const POWER_SIZE = 18;

function makePlayer(index, slot) {
  const spawn = SPAWNS[index];
  const pos = tileToPx(spawn.tx, spawn.ty);
  return {
    index,
    name: PLAYER_NAMES[index],
    color: PLAYER_COLORS[index],
    slot,
    team: index,
    x: pos.x,
    y: pos.y,
    dir: spawn.dir,
    lives: LIVES,
    score: 0,
    roundWins: 0,
    alive: false,
    eliminated: false,
    respawn: 0,
    invuln: 0,
    shield: 0,
    speedTimer: 0,
    blast: false,
    held: emptyHeld(),
    prevHeld: emptyHeld(),
    prevAction: false,
    prevSecondary: false,
    lastDir: spawn.dir,
  };
}

function applyTeams(game) {
  for (const player of game.players) {
    player.team = game.mode === "2v2" ? (player.index < 2 ? 0 : 1) : player.index;
  }
}

function freshMap(game) {
  if (game.mapStrings) return mapFromStrings(game.mapStrings);
  if (game.layout === "empty") return emptyMap();
  if (game.layout === "fixed" && game.fixedMap) return cloneMap(game.fixedMap);
  return generateMaze(game.rng);
}

function startRound(game) {
  game.map = freshMap(game);
  game.shells = [];
  game.powerups = [];
  game.mines = [];
  game.winnerTeam = null;
  game.countdown = game.countdownTicks;
  game.phase = game.countdownTicks > 0 ? "countdown" : "playing";
  for (const player of game.players) {
    const spawn = SPAWNS[player.index];
    const pos = tileToPx(spawn.tx, spawn.ty);
    player.x = pos.x;
    player.y = pos.y;
    player.dir = spawn.dir;
    player.lastDir = spawn.dir;
    player.shield = 0;
    player.speedTimer = 0;
    player.blast = false;
    player.prevAction = false;
    player.prevSecondary = false;
    player.prevHeld = emptyHeld();
    if (player.slot === "off") {
      player.alive = false;
      player.eliminated = true;
      player.lives = 0;
      player.respawn = 0;
      player.invuln = 0;
      continue;
    }
    player.alive = true;
    player.eliminated = false;
    player.lives = LIVES;
    player.respawn = 0;
    player.invuln = game.spawnInvuln;
  }
}

export function createGame(options = {}) {
  const seed = options.seed ?? 1;
  const slots = options.slots ?? ["bot", "bot", "bot", "bot"];
  const game = {
    seed,
    rng: makeRng(seed),
    mode: options.mode === "2v2" ? "2v2" : "ffa",
    round: 1,
    roundCount: clampRounds(options.roundCount ?? 3),
    phase: "title",
    players: [0, 1, 2, 3].map((index) => makePlayer(index, slots[index] ?? "bot")),
    map: null,
    shells: [],
    powerups: [],
    mines: [],
    events: [],
    tick: 0,
    countdownTicks: options.countdownTicks ?? 180,
    roundEndTicks: options.roundEndTicks ?? 180,
    spawnInvuln: options.spawnInvuln ?? 90,
    countdown: 0,
    bannerTimer: 0,
    goTimer: 0,
    winnerTeam: null,
    notice: "",
    noticeTimer: 0,
    pausedFrom: "playing",
    layout: options.layout ?? "maze",
    mapStrings: options.mapStrings ?? null,
    fixedMap: null,
  };
  applyTeams(game);
  return game;
}

function clampRounds(n) {
  return Math.max(1, Math.min(9, n | 0));
}

export function setRoundCount(game, n) {
  game.roundCount = clampRounds(n);
  return game.roundCount;
}

export function toggleMode(game) {
  if (game.phase !== "title" && game.phase !== "join") return game.mode;
  game.mode = game.mode === "ffa" ? "2v2" : "ffa";
  applyTeams(game);
  return game.mode;
}

export function setMode(game, mode) {
  game.mode = mode === "2v2" ? "2v2" : "ffa";
  applyTeams(game);
  return game.mode;
}

export function joinSlot(game, index) {
  if (game.phase !== "join") return;
  game.players[index].slot = "human";
  game.notice = "";
}

/** Human drops to bot; bot and off swap. */
export function secondarySlot(game, index) {
  if (game.phase !== "join") return;
  const player = game.players[index];
  if (player.slot === "human") player.slot = "bot";
  else if (player.slot === "bot") player.slot = "off";
  else player.slot = "bot";
  game.notice = "";
}

export function activeCount(game) {
  return game.players.filter((player) => player.slot !== "off").length;
}

export function beginMatch(game) {
  if (activeCount(game) < 2) {
    game.notice = "Need at least two tanks";
    game.noticeTimer = 0;
    return false;
  }
  game.notice = "";
  game.round = 1;
  for (const player of game.players) {
    player.score = 0;
    player.roundWins = 0;
  }
  applyTeams(game);
  startRound(game);
  return true;
}

export function pressStart(game) {
  if (game.phase === "title") {
    game.phase = "join";
    game.notice = "";
    return;
  }
  if (game.phase === "join") beginMatch(game);
}

export function togglePause(game) {
  if (game.phase === "playing" || game.phase === "countdown") {
    game.pausedFrom = game.phase;
    game.phase = "paused";
    return;
  }
  if (game.phase === "paused") game.phase = game.pausedFrom;
}

export function toTitle(game) {
  game.phase = "title";
  game.shells = [];
  game.mines = [];
  game.powerups = [];
  game.notice = "";
  game.noticeTimer = 0;
}

export function skipBanner(game) {
  if (game.phase === "roundEnd") game.bannerTimer = 0;
}

export function rematch(game) {
  if (game.phase !== "matchEnd") return false;
  return beginMatch(game);
}

function desiredDirection(player) {
  const held = player.held || emptyHeld();
  const prev = player.prevHeld || emptyHeld();
  for (const dir of DIR_LIST) {
    if (held[dir] && !prev[dir]) return dir;
  }
  if (player.lastDir && held[player.lastDir]) return player.lastDir;
  for (const dir of DIR_LIST) {
    if (held[dir]) return dir;
  }
  return null;
}

function tryMove(game, player, dir) {
  const vector = DIRS[dir];
  const nx = player.x + vector.x * SPEED;
  const ny = player.y + vector.y * SPEED;
  if (blockedRect(game.map, nx, ny, TANK, TANK, game.players, player)) return false;
  player.x = nx;
  player.y = ny;
  player.dir = dir;
  return true;
}

function moveTank(game, player) {
  const want = desiredDirection(player);
  if (want) player.lastDir = want;
  if (!player.alive || !want) return;
  const steps = player.speedTimer > 0 ? 2 : 1;
  for (let step = 0; step < steps; step++) {
    if (isPerp(player.dir, want) && !isAligned(player)) {
      if (!tryMove(game, player, player.dir)) break;
      continue;
    }
    if (!tryMove(game, player, want)) {
      player.dir = want;
      break;
    }
  }
}

function tryFire(game, player) {
  if (!player.alive) return;
  if (!player.held.action || player.prevAction) return;
  if (game.shells.some((shell) => shell.alive && shell.owner === player.index)) return;
  const shell = makeShell(player);
  player.blast = false;
  game.shells.push(shell);
  game.events.push({ type: "shoot", player: player.index });
}

function tryMine(game, player) {
  if (!player.alive) return;
  if (!player.held.secondary || player.prevSecondary) return;
  if (game.mines.some((mine) => mine.alive && mine.owner === player.index)) return;
  const vector = DIRS[OPPOSITE[player.dir]];
  const x = player.x + vector.x * TILE + (TANK - MINE) / 2;
  const y = player.y + vector.y * TILE + (TANK - MINE) / 2;
  if (overlapsSolid(game.map, x, y, MINE, MINE)) return;
  game.mines.push({
    owner: player.index,
    team: player.team,
    x,
    y,
    w: MINE,
    h: MINE,
    alive: true,
  });
  game.events.push({ type: "mine", player: player.index });
}

function rememberEdges(player) {
  player.prevAction = !!player.held.action;
  player.prevSecondary = !!player.held.secondary;
  player.prevHeld = {
    up: !!player.held.up,
    down: !!player.held.down,
    left: !!player.held.left,
    right: !!player.held.right,
  };
}

function maybeSpawnPowerup(game, tx, ty) {
  if (game.powerups.length >= 2) return;
  if (game.rng.next() >= 0.2) return;
  const type = POWERUP_TYPES[game.rng.int(POWERUP_TYPES.length)];
  game.powerups.push({
    type,
    x: tx * TILE + (TILE - POWER_SIZE) / 2,
    y: ty * TILE + (TILE - POWER_SIZE) / 2,
    w: POWER_SIZE,
    h: POWER_SIZE,
    alive: true,
  });
}

function livingTeams(game) {
  const teams = new Set();
  for (const player of game.players) {
    if (player.slot === "off" || player.eliminated) continue;
    teams.add(player.team);
  }
  return [...teams];
}

function checkRound(game) {
  if (game.phase !== "playing") return;
  const teams = livingTeams(game);
  if (teams.length > 1) return;
  const winner = teams.length === 1 ? teams[0] : null;
  if (winner !== null) {
    for (const player of game.players) {
      if (player.slot !== "off" && player.team === winner) player.roundWins += 1;
    }
  }
  game.phase = "roundEnd";
  game.winnerTeam = winner;
  game.bannerTimer = game.roundEndTicks;
  game.events.push({ type: "round", winner });
}

/**
 * Apply a hit from attackerIndex. Friendly tanks in a shared team take no damage.
 * Returns a short result tag: ignore, friendly, invuln, shield, hurt, ko.
 */
export function hitPlayer(game, victimIndex, attackerIndex) {
  const victim = game.players[victimIndex];
  const attacker = attackerIndex == null ? null : game.players[attackerIndex];
  if (!victim || !victim.alive || victim.eliminated) return "ignore";
  if (attacker && attacker.index !== victim.index && attacker.team === victim.team) return "friendly";
  if (victim.invuln > 0) {
    game.events.push({ type: "hit", kind: "invuln", player: victim.index });
    return "invuln";
  }
  if (victim.shield > 0) {
    victim.shield = 0;
    game.events.push({ type: "hit", kind: "shield", player: victim.index });
    return "shield";
  }
  victim.lives -= 1;
  if (attacker && attacker.index !== victim.index) attacker.score += 1;
  if (victim.lives <= 0) {
    victim.lives = 0;
    victim.alive = false;
    victim.eliminated = true;
    victim.respawn = 0;
    game.events.push({ type: "ko", player: victim.index, by: attacker ? attacker.index : null });
    checkRound(game);
    return "ko";
  }
  victim.alive = false;
  victim.respawn = 90;
  game.events.push({ type: "down", player: victim.index, by: attacker ? attacker.index : null });
  return "down";
}

function collideShells(game) {
  for (const shell of game.shells) {
    if (!shell.alive) continue;
    for (const mine of game.mines) {
      if (!mine.alive) continue;
      if (!rectsOverlap(shell.x, shell.y, 6, 6, mine.x, mine.y, mine.w, mine.h)) continue;
      shell.alive = false;
      mine.alive = false;
      game.events.push({ type: "hit", kind: "mine" });
      break;
    }
    if (!shell.alive) continue;
    for (const player of game.players) {
      if (!player.alive) continue;
      if (shell.ignore.includes(player.index)) continue;
      if (!rectsOverlap(shell.x, shell.y, 6, 6, player.x, player.y, TANK, TANK)) continue;
      const result = hitPlayer(game, player.index, shell.owner);
      if (result === "friendly") {
        shell.ignore.push(player.index);
        continue;
      }
      shell.alive = false;
      break;
    }
  }
  for (let i = 0; i < game.shells.length; i++) {
    for (let j = i + 1; j < game.shells.length; j++) {
      const a = game.shells[i];
      const b = game.shells[j];
      if (!a.alive || !b.alive) continue;
      if (!rectsOverlap(a.x, a.y, 6, 6, b.x, b.y, 6, 6)) continue;
      a.alive = false;
      b.alive = false;
      game.events.push({ type: "hit", kind: "shell" });
    }
  }
  game.shells = game.shells.filter((shell) => shell.alive);
  game.mines = game.mines.filter((mine) => mine.alive);
}

function tickMines(game) {
  for (const mine of game.mines) {
    if (!mine.alive) continue;
    for (const player of game.players) {
      if (!player.alive || player.index === mine.owner) continue;
      if (!rectsOverlap(player.x, player.y, TANK, TANK, mine.x, mine.y, mine.w, mine.h)) continue;
      if (game.mode === "2v2" && player.team === mine.team) continue;
      mine.alive = false;
      hitPlayer(game, player.index, mine.owner);
      break;
    }
  }
  game.mines = game.mines.filter((mine) => mine.alive);
}

function collect(game) {
  for (const player of game.players) {
    if (!player.alive) continue;
    for (const power of game.powerups) {
      if (!power.alive) continue;
      if (!rectsOverlap(player.x, player.y, TANK, TANK, power.x, power.y, power.w, power.h)) continue;
      power.alive = false;
      applyPowerup(player, power.type);
      game.events.push({ type: "pickup", player: player.index, power: power.type });
    }
  }
  game.powerups = game.powerups.filter((power) => power.alive);
}

function tickTimers(game) {
  for (const player of game.players) {
    if (player.slot === "off" || player.eliminated) continue;
    if (player.shield > 0) player.shield -= 1;
    if (player.speedTimer > 0) player.speedTimer -= 1;
    if (player.invuln > 0) player.invuln -= 1;
    if (player.alive) continue;
    if (player.respawn > 0) player.respawn -= 1;
    if (player.respawn === 0) {
      const spawn = SPAWNS[player.index];
      const pos = tileToPx(spawn.tx, spawn.ty);
      if (!blockedRect(game.map, pos.x, pos.y, TANK, TANK, game.players, player)) {
        player.x = pos.x;
        player.y = pos.y;
        player.dir = spawn.dir;
        player.lastDir = spawn.dir;
        player.alive = true;
        player.invuln = game.spawnInvuln;
      }
    }
  }
}

function advanceShells(game) {
  const speed = game.shells.reduce((max, shell) => Math.max(max, shell.alive ? shell.speed : 0), 0);
  for (let step = 0; step < speed; step++) {
    for (const shell of [...game.shells]) {
      if (!shell.alive) continue;
      const saved = shell.speed;
      shell.speed = 1;
      const events = stepShell(shell, game.map);
      shell.speed = saved;
      for (const event of events) {
        if (event.type === "brick") maybeSpawnPowerup(game, event.tx, event.ty);
        game.events.push(event);
      }
    }
    collideShells(game);
  }
}

function advanceAfterRound(game) {
  if (game.round >= game.roundCount) {
    game.phase = "matchEnd";
    game.events.push({ type: "match" });
    return;
  }
  game.round += 1;
  startRound(game);
}

export function update(game) {
  game.events = [];
  if (game.noticeTimer > 0) {
    game.noticeTimer -= 1;
    if (game.noticeTimer === 0) game.notice = "";
  }
  if (game.goTimer > 0) game.goTimer -= 1;

  if (game.phase === "countdown") {
    const prev = game.countdown;
    game.countdown -= 1;
    if (prev > 0 && prev % 60 === 0) {
      game.events.push({ type: "countdown", n: Math.ceil(prev / 60) });
    }
    if (game.countdown <= 0) {
      game.phase = "playing";
      game.goTimer = 40;
      game.events.push({ type: "go" });
    }
    game.tick += 1;
    return;
  }

  if (game.phase === "roundEnd") {
    game.bannerTimer -= 1;
    if (game.bannerTimer <= 0) advanceAfterRound(game);
    game.tick += 1;
    return;
  }

  if (game.phase !== "playing") return;

  for (const player of game.players) {
    if (player.slot === "bot") player.held = decideBot(game, player);
    else if (player.slot === "off") player.held = emptyHeld();
    else if (!player.held) player.held = emptyHeld();
  }

  for (const player of game.players) {
    if (player.slot === "off") continue;
    moveTank(game, player);
  }
  for (const player of game.players) {
    if (player.slot === "off") continue;
    tryFire(game, player);
    tryMine(game, player);
    rememberEdges(player);
  }

  advanceShells(game);
  tickMines(game);
  collect(game);
  tickTimers(game);
  checkRound(game);
  game.tick += 1;
}

export function roundBanner(game) {
  if (game.winnerTeam == null) return "DRAW";
  if (game.mode === "2v2") return game.winnerTeam === 0 ? "WEST WINS THE ROUND" : "EAST WINS THE ROUND";
  const player = game.players.find((entry) => entry.team === game.winnerTeam && entry.slot !== "off");
  return player ? `${player.name} WINS THE ROUND` : "ROUND OVER";
}

export function standings(game) {
  return game.players
    .filter((player) => player.slot !== "off")
    .map((player) => ({
      index: player.index,
      name: player.name,
      color: player.color,
      score: player.score,
      roundWins: player.roundWins,
      team: player.team,
      slot: player.slot,
    }))
    .sort((a, b) => b.roundWins - a.roundWins || b.score - a.score || a.index - b.index);
}

export function matchResult(game) {
  const rows = standings(game);
  if (game.mode === "2v2") {
    const teams = [0, 1]
      .map((team) => {
        const members = rows.filter((row) => row.team === team);
        return {
          team,
          name: team === 0 ? "WEST" : "EAST",
          roundWins: members.length ? members[0].roundWins : 0,
          score: members.reduce((sum, member) => sum + member.score, 0),
          members,
        };
      })
      .filter((team) => team.members.length > 0)
      .sort((a, b) => b.roundWins - a.roundWins || b.score - a.score);
    const tie =
      teams.length > 1 && teams[0].roundWins === teams[1].roundWins && teams[0].score === teams[1].score;
    return { rows, teams, tie, winner: tie ? null : teams[0] ?? null };
  }
  if (rows.length === 0) return { rows, teams: [], tie: true, winner: null };
  if (rows.length === 1) return { rows, teams: [], tie: false, winner: rows[0] };
  const tie = rows[0].roundWins === rows[1].roundWins && rows[0].score === rows[1].score;
  return { rows, teams: [], tie, winner: tie ? null : rows[0] };
}

export function snapshot(game) {
  return JSON.stringify({
    phase: game.phase,
    tick: game.tick,
    round: game.round,
    mode: game.mode,
    tiles: game.map ? Array.from(game.map.tiles) : [],
    players: game.players.map((player) => ({
      x: player.x,
      y: player.y,
      dir: player.dir,
      lives: player.lives,
      score: player.score,
      roundWins: player.roundWins,
      alive: player.alive,
      eliminated: player.eliminated,
      slot: player.slot,
      shield: player.shield,
      blast: player.blast,
      speedTimer: player.speedTimer,
      team: player.team,
    })),
    shells: game.shells.map((shell) => ({
      x: Math.round(shell.x),
      y: Math.round(shell.y),
      dir: shell.dir,
      owner: shell.owner,
      alive: shell.alive,
      bounces: shell.bounces,
    })),
    powerups: game.powerups.map((power) => ({ type: power.type, x: power.x, y: power.y })),
    mines: game.mines.map((mine) => ({ x: mine.x, y: mine.y, owner: mine.owner, alive: mine.alive })),
  });
}

export function placePlayer(game, index, tx, ty, dir) {
  const player = game.players[index];
  const pos = tileToPx(tx, ty);
  player.x = pos.x;
  player.y = pos.y;
  if (dir) {
    player.dir = dir;
    player.lastDir = dir;
  }
  player.alive = player.slot !== "off";
  player.eliminated = player.slot === "off";
  player.invuln = 0;
  player.respawn = 0;
  return player;
}
