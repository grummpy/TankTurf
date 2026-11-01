import {
  beginMatch,
  createGame,
  joinSlot,
  pressStart,
  rematch,
  secondarySlot,
  setRoundCount,
  skipBanner,
  toggleMode,
  togglePause,
  toTitle,
  update,
} from "../core/game.js";
import { ACTIONS, actionsFromGamepad, readPlayers, rebind } from "../core/input.js";
import { makeRng } from "../core/rng.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { controlRows, render } from "./render.js";
import { loadSettings, saveSettings } from "./storage.js";

const STEP = 1000 / 60;
const RESERVED = new Set(["Escape", "KeyM"]);

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const input = createInput(window);
const audio = createAudio();
const cover = new Image();
cover.src = "assets/cover.jpg";

const settings = loadSettings();
let binds = settings.binds;
const game = createGame({
  seed: newSeed(),
  roundCount: settings.roundCount,
  mode: settings.mode,
});

const ui = {
  menuIndex: 0,
  overlay: null,
  rebinding: null,
  pads: [false, false, false, false],
  cover,
  muted: settings.muted,
  volume: settings.volume,
  roundCount: settings.roundCount,
  binds,
};

audio.setMuted(ui.muted);
audio.setVolume(ui.volume / 10);

let last = performance.now();
let acc = 0;
let prevPadPause = false;
let padWas = [false, false, false, false];
let prevJoin = [false, false, false, false];
let prevSecondary = [false, false, false, false];
const latch = [blankHeld(), blankHeld(), blankHeld(), blankHeld()];

function blankHeld() {
  return { up: false, down: false, left: false, right: false, action: false, secondary: false };
}

canvas.addEventListener("pointerdown", () => {
  audio.unlock();
  canvas.focus();
});
window.addEventListener("keydown", onKey, { capture: true });
window.addEventListener("gamepadconnected", (event) => notePad(event.gamepad.index, true));
window.addEventListener("gamepaddisconnected", (event) => notePad(event.gamepad.index, false));

canvas.focus();
requestAnimationFrame(frame);

function frame(now) {
  const dt = Math.min(100, now - last);
  last = now;
  acc += dt;

  const pads = input.pollPads();
  for (let i = 0; i < 4; i++) {
    const on = !!(pads[i] && pads[i].connected);
    if (on !== padWas[i]) notePad(i, on);
    ui.pads[i] = on;
  }

  captureEdges(pads);
  const reading = readPlayers(binds, (code) => input.isDown(code), pads);
  applyLatch(reading.players, pads);
  const padPause = pads.some((pad) => pad && actionsFromGamepad(pad)?.pause);
  if (padPause && !prevPadPause) onPausePressed();
  prevPadPause = padPause;

  let steps = 0;
  while (acc >= STEP && steps < 5) {
    for (let i = 0; i < 4; i++) game.players[i].held = reading.players[i];
    if (ui.overlay) updateNoticesOnly();
    else update(game);
    for (const event of game.events) audio.play(event);
    acc -= STEP;
    steps += 1;
  }
  if (acc > STEP * 5) acc = 0;
  watchJoin(reading.players);
  if (steps > 0 || (game.phase !== "playing" && game.phase !== "countdown")) clearLatch();

  ui.binds = binds;
  ui.muted = settings.muted;
  ui.volume = settings.volume;
  ui.roundCount = game.roundCount;
  render(ctx, game, ui);
  requestAnimationFrame(frame);
}

function updateNoticesOnly() {
  game.events = [];
  if (game.noticeTimer > 0) {
    game.noticeTimer -= 1;
    if (game.noticeTimer === 0) game.notice = "";
  }
}

function captureEdges(pads) {
  for (const code of input.takeEdges()) {
    for (let i = 0; i < 4; i++) {
      if (pads[i] && pads[i].connected) continue;
      const bind = binds[i];
      for (const action of ACTIONS) {
        if (bind[action] && bind[action] === code) latch[i][action] = true;
      }
    }
  }
}

function applyLatch(players, pads) {
  for (let i = 0; i < 4; i++) {
    if (pads[i] && pads[i].connected) continue;
    for (const action of ACTIONS) {
      if (latch[i][action]) players[i][action] = true;
    }
  }
}

function clearLatch() {
  for (let i = 0; i < 4; i++) latch[i] = blankHeld();
}

function watchJoin(players) {
  if (game.phase !== "join" || ui.overlay) {
    prevJoin = [false, false, false, false];
    prevSecondary = [false, false, false, false];
    return;
  }
  for (let i = 0; i < 4; i++) {
    const held = players[i] || {};
    if (held.action && !prevJoin[i]) joinSlot(game, i);
    if (held.secondary && !prevSecondary[i]) secondarySlot(game, i);
    prevJoin[i] = !!held.action;
    prevSecondary[i] = !!held.secondary;
  }
}

function onKey(event) {
  audio.unlock();
  if (ui.rebinding) {
    event.preventDefault();
    if (!event.repeat && !RESERVED.has(event.code)) {
      binds = rebind(binds, ui.rebinding.player, ui.rebinding.action, event.code);
      settings.binds = binds;
      saveSettings(settings);
    }
    ui.rebinding = null;
    return;
  }
  if (event.repeat) return;

  if (event.code === "KeyM") {
    settings.muted = !settings.muted;
    audio.setMuted(settings.muted);
    saveSettings(settings);
    event.preventDefault();
    return;
  }

  if (event.code === "KeyQ" && game.phase === "join" && !ui.overlay) {
    toggleMode(game);
    settings.mode = game.mode;
    saveSettings(settings);
    event.preventDefault();
    return;
  }

  if (
    (event.code === "BracketLeft" || event.code === "BracketRight") &&
    (game.phase === "join" || ui.overlay === "settings")
  ) {
    const delta = event.code === "BracketRight" ? 1 : -1;
    setRoundCount(game, game.roundCount + delta);
    settings.roundCount = game.roundCount;
    saveSettings(settings);
    event.preventDefault();
    return;
  }

  if (event.code === "Tab") {
    event.preventDefault();
    if (game.phase === "join" || game.phase === "paused") openSettings();
    return;
  }

  if (event.code === "Escape") {
    event.preventDefault();
    onEscape();
    return;
  }

  if (event.code === "Enter") {
    event.preventDefault();
    onConfirm();
    return;
  }

  if (
    isMenuPhase() &&
    (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "ArrowDown" || event.code === "KeyS")
  ) {
    event.preventDefault();
    moveMenu(event.code === "ArrowUp" || event.code === "KeyW" ? -1 : 1);
    return;
  }

  if (
    ui.overlay === "settings" &&
    (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "KeyA" || event.code === "KeyD")
  ) {
    event.preventDefault();
    nudgeSetting(event.code === "ArrowLeft" || event.code === "KeyA" ? -1 : 1);
  }
}

function isMenuPhase() {
  return ui.overlay != null || game.phase === "paused";
}

function menuLength() {
  if (ui.overlay === "controls") return controlRows(binds).length;
  if (ui.overlay === "settings") return 4;
  if (game.phase === "paused") return 3;
  return 0;
}

function moveMenu(delta) {
  const length = menuLength();
  if (!length) return;
  ui.menuIndex = (ui.menuIndex + delta + length) % length;
}

function onConfirm() {
  if (ui.overlay === "controls") {
    const row = controlRows(binds)[ui.menuIndex];
    if (!row || row.action === "back") {
      ui.overlay = "settings";
      ui.menuIndex = 2;
      return;
    }
    ui.rebinding = { player: row.player, action: row.action, index: ui.menuIndex };
    return;
  }
  if (ui.overlay === "settings") {
    if (ui.menuIndex === 2) {
      ui.overlay = "controls";
      ui.menuIndex = 0;
    } else if (ui.menuIndex === 3) {
      ui.overlay = null;
      ui.menuIndex = game.phase === "paused" ? 1 : 0;
    }
    return;
  }
  if (game.phase === "paused") {
    if (ui.menuIndex === 0) togglePause(game);
    else if (ui.menuIndex === 1) openSettings();
    else toTitle(game);
    return;
  }
  if (game.phase === "title") {
    pressStart(game);
    return;
  }
  if (game.phase === "join") {
    armSeed();
    beginMatch(game);
    return;
  }
  if (game.phase === "roundEnd") {
    skipBanner(game);
    return;
  }
  if (game.phase === "matchEnd") {
    armSeed();
    rematch(game);
  }
}

function onEscape() {
  if (ui.overlay === "controls") {
    ui.overlay = "settings";
    ui.menuIndex = 2;
    return;
  }
  if (ui.overlay === "settings") {
    ui.overlay = null;
    ui.menuIndex = game.phase === "paused" ? 1 : 0;
    return;
  }
  if (game.phase === "matchEnd") {
    toTitle(game);
    return;
  }
  if (game.phase === "playing" || game.phase === "countdown" || game.phase === "paused") {
    togglePause(game);
    ui.menuIndex = 0;
    ui.overlay = null;
  }
}

function onPausePressed() {
  if (ui.overlay) return;
  if (game.phase === "title") {
    pressStart(game);
    return;
  }
  if (game.phase === "join") {
    armSeed();
    beginMatch(game);
    return;
  }
  if (game.phase === "roundEnd") {
    skipBanner(game);
    return;
  }
  if (game.phase === "matchEnd") {
    armSeed();
    rematch(game);
    return;
  }
  if (game.phase === "playing" || game.phase === "countdown" || game.phase === "paused") {
    togglePause(game);
    ui.menuIndex = 0;
  }
}

function openSettings() {
  ui.overlay = "settings";
  ui.menuIndex = 0;
  if (game.phase === "playing" || game.phase === "countdown") togglePause(game);
}

function nudgeSetting(delta) {
  if (ui.menuIndex === 0) {
    settings.volume = Math.max(0, Math.min(10, settings.volume + delta));
    audio.setVolume(settings.volume / 10);
    saveSettings(settings);
    return;
  }
  if (ui.menuIndex === 1) {
    setRoundCount(game, game.roundCount + delta);
    settings.roundCount = game.roundCount;
    saveSettings(settings);
  }
}

function notePad(index, on) {
  if (index < 0 || index > 3) return;
  if (padWas[index] === on) return;
  padWas[index] = on;
  ui.pads[index] = on;
  game.notice = on ? `P${index + 1} PAD LINKED` : `P${index + 1} PAD DROPPED`;
  game.noticeTimer = 120;
}

function armSeed() {
  game.seed = newSeed();
  game.rng = makeRng(game.seed);
}

function newSeed() {
  return (Math.floor(Math.random() * 0xffffffff) ^ (Date.now() >>> 0)) >>> 0 || 1;
}
