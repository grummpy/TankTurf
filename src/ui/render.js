import { BRICK, COLS, ROWS, STEEL, TILE } from "../core/constants.js";
import { matchResult, roundBanner } from "../core/game.js";
import { formatCode } from "../core/input.js";
import { getTile } from "../core/map.js";

export const VIEW_W = 960;
export const VIEW_H = 640;
export const FIELD_X = (VIEW_W - COLS * TILE) / 2;
export const FIELD_Y = 72;

const FONT = 'ui-monospace, "Cascadia Mono", "Courier New", monospace';

export function render(ctx, game, ui) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#12151a";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (game.phase === "title") {
    drawTitle(ctx, ui);
    drawNotice(ctx, game);
    return;
  }

  if (game.phase === "join" && !ui.overlay) {
    drawJoin(ctx, game, ui);
    drawNotice(ctx, game);
    return;
  }

  if (game.map) drawWorld(ctx, game);
  drawHud(ctx, game, ui);

  if (game.phase === "countdown" || game.goTimer > 0) drawCountdown(ctx, game);
  if (game.phase === "roundEnd") drawBanner(ctx, roundBanner(game), "ENTER skips");
  if (game.phase === "matchEnd") drawMatch(ctx, game);
  if (game.phase === "paused" && !ui.overlay) drawPause(ctx, ui);
  if (ui.overlay === "settings") drawSettings(ctx, ui);
  if (ui.overlay === "controls") drawControls(ctx, ui);
  drawNotice(ctx, game);
}

function drawTitle(ctx, ui) {
  const img = ui.cover;
  if (img && img.complete && img.naturalWidth) {
    const scale = Math.max(VIEW_W / img.naturalWidth, VIEW_H / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#1b2430";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.fillStyle = "rgba(6, 8, 12, 0.62)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f2c14e";
  ctx.font = `700 88px ${FONT}`;
  ctx.fillText("TANK TURF", VIEW_W / 2, 250);
  ctx.fillStyle = "#f4efe2";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText("DESTRUCTIBLE BRICKFIELD  ·  4 LOCAL TANKS", VIEW_W / 2, 300);
  const blink = Math.floor(performance.now() / 500) % 2 === 0;
  ctx.fillStyle = blink ? "#ffe08a" : "#c9b27a";
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText("PRESS START / ENTER", VIEW_W / 2, 390);
  ctx.fillStyle = "#d5d0c6";
  ctx.font = `16px ${FONT}`;
  ctx.fillText("Free-for-all or 2v2  ·  bots fill empty seats  ·  M mutes", VIEW_W / 2, 450);
}

function drawJoin(ctx, game, ui) {
  panel(ctx, 150, 36, 660, 568);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2c14e";
  ctx.font = `700 42px ${FONT}`;
  ctx.fillText("CREW SELECT", VIEW_W / 2, 90);
  ctx.fillStyle = "#d9d3c7";
  ctx.font = `16px ${FONT}`;
  ctx.fillText("ACTION joins   ·   SECONDARY cycles BOT / OFF", VIEW_W / 2, 122);

  game.players.forEach((player, index) => {
    const y = 170 + index * 78;
    ctx.fillStyle = "#1c2128";
    ctx.fillRect(190, y, 580, 66);
    ctx.fillStyle = player.color;
    ctx.fillRect(206, y + 14, 38, 38);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f4efe2";
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(`P${index + 1}  ${player.name}`, 260, y + 30);
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = "#b7c0cc";
    const team = game.mode === "2v2" ? (player.team === 0 ? "WEST" : "EAST") : "SOLO";
    ctx.fillText(team, 260, y + 52);
    ctx.textAlign = "right";
    ctx.fillStyle = slotColor(player.slot);
    ctx.font = `700 22px ${FONT}`;
    const pad = ui.pads[index] ? "  PAD" : "";
    ctx.fillText(`${player.slot.toUpperCase()}${pad}`, 750, y + 40);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4efe2";
  ctx.font = `18px ${FONT}`;
  const mode = game.mode === "2v2" ? "2v2  ·  FRIENDLY FIRE OFF" : "FREE-FOR-ALL";
  ctx.fillText(`${mode}     ROUNDS ${game.roundCount}`, VIEW_W / 2, 510);
  ctx.fillStyle = "#ffe08a";
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText("ENTER TO BATTLE", VIEW_W / 2, 548);
  ctx.fillStyle = "#9aa4b2";
  ctx.font = `14px ${FONT}`;
  ctx.fillText("Q mode    [ ] rounds    TAB settings", VIEW_W / 2, 576);
}

function slotColor(slot) {
  if (slot === "human") return "#f2c14e";
  if (slot === "bot") return "#8fd0ff";
  return "#66707c";
}

function drawWorld(ctx, game) {
  ctx.fillStyle = "#0e1014";
  ctx.fillRect(FIELD_X - 8, FIELD_Y - 8, COLS * TILE + 16, ROWS * TILE + 16);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const tile = getTile(game.map, tx, ty);
      const x = FIELD_X + tx * TILE;
      const y = FIELD_Y + ty * TILE;
      if (tile === BRICK) drawBrick(ctx, x, y);
      else if (tile === STEEL) drawSteel(ctx, x, y);
      else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? "#2c261c" : "#352c22";
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  for (const power of game.powerups) drawPower(ctx, power);
  for (const mine of game.mines) drawMine(ctx, mine, game.tick);
  for (const shell of game.shells) drawShell(ctx, shell);
  for (const player of game.players) drawTank(ctx, player, game.tick);
}

function drawBrick(ctx, x, y) {
  ctx.fillStyle = "#a34a34";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = "#6d2e22";
  ctx.fillRect(x, y + 15, TILE, 2);
  ctx.fillRect(x + 15, y, 2, 15);
  ctx.fillRect(x, y + 17, 2, 15);
  ctx.fillRect(x + 15, y + 17, 2, 15);
}

function drawSteel(ctx, x, y) {
  ctx.fillStyle = "#8d97a3";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = "#d7dee6";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.fillStyle = "#505862";
  for (const [rx, ry] of [
    [6, 6],
    [TILE - 9, 6],
    [6, TILE - 9],
    [TILE - 9, TILE - 9],
  ]) {
    ctx.fillRect(x + rx, y + ry, 3, 3);
  }
}

function drawPower(ctx, power) {
  const x = FIELD_X + power.x;
  const y = FIELD_Y + power.y;
  const colors = { shield: "#7ee0ff", speed: "#ffe14a", blast: "#ff8a3d", life: "#5dE38a" };
  ctx.fillStyle = "#111";
  ctx.fillRect(x - 2, y - 2, power.w + 4, power.h + 4);
  ctx.fillStyle = colors[power.type] || "#fff";
  ctx.fillRect(x, y, power.w, power.h);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = "center";
  const label = { shield: "SH", speed: "SP", blast: "BL", life: "+1" }[power.type] || "?";
  ctx.fillText(label, x + power.w / 2, y + 13);
}

function drawMine(ctx, mine, tick) {
  const x = FIELD_X + mine.x + mine.w / 2;
  const y = FIELD_Y + mine.y + mine.h / 2;
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = Math.floor(tick / 8) % 2 === 0 ? "#ff4d4d" : "#7a1f1f";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawShell(ctx, shell) {
  ctx.fillStyle = shell.blast ? "#ffb020" : "#ffe9a0";
  ctx.fillRect(FIELD_X + shell.x, FIELD_Y + shell.y, 6, 6);
  ctx.fillStyle = "#fff";
  ctx.fillRect(FIELD_X + shell.x + 2, FIELD_Y + shell.y + 2, 2, 2);
}

function drawTank(ctx, player, tick) {
  if (!player.alive) return;
  if (player.invuln > 0 && Math.floor(tick / 4) % 2 === 0) return;
  const x = FIELD_X + player.x;
  const y = FIELD_Y + player.y;
  ctx.fillStyle = "#161616";
  ctx.fillRect(x, y + 4, 5, 18);
  ctx.fillRect(x + 21, y + 4, 5, 18);
  ctx.fillStyle = player.color;
  ctx.fillRect(x + 5, y + 3, 16, 20);
  const cx = x + 13;
  const cy = y + 13;
  ctx.fillStyle = "#241c14";
  ctx.fillRect(cx - 4, cy - 4, 8, 8);
  ctx.fillStyle = "#f7f7f2";
  if (player.dir === "up") ctx.fillRect(cx - 2, y - 4, 4, 14);
  else if (player.dir === "down") ctx.fillRect(cx - 2, cy, 4, 16);
  else if (player.dir === "left") ctx.fillRect(x - 4, cy - 2, 14, 4);
  else ctx.fillRect(cx, cy - 2, 16, 4);
  if (player.shield > 0) {
    ctx.strokeStyle = "#9ee7ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, 32, 32);
  }
  if (player.blast) {
    ctx.fillStyle = "#ff8a3d";
    ctx.fillRect(x + 11, y + 22, 4, 4);
  }
}

function drawHud(ctx, game, ui) {
  ctx.textAlign = "left";
  ctx.font = `700 16px ${FONT}`;
  game.players.forEach((player, index) => {
    const x = 16 + index * 180;
    ctx.fillStyle = player.color;
    ctx.fillRect(x, 18, 14, 14);
    ctx.fillStyle = player.slot === "off" ? "#66707c" : "#f4efe2";
    ctx.fillText(`P${index + 1} ${player.name}`, x + 20, 31);
    ctx.font = `14px ${FONT}`;
    const lives = player.slot === "off" ? "OUT" : `${player.lives} HP`;
    ctx.fillStyle = "#c5ccd6";
    ctx.fillText(`${lives}   ${player.score} KO   ${player.roundWins} W`, x, 54);
    if (ui.pads[index]) drawPadIcon(ctx, x + 150, 16);
    ctx.font = `700 16px ${FONT}`;
  });
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffe08a";
  ctx.font = `700 16px ${FONT}`;
  const mode = game.mode === "2v2" ? "2v2" : "FFA";
  ctx.fillText(`${mode}   ROUND ${game.round}/${game.roundCount}`, VIEW_W - 18, 31);
  ctx.fillStyle = ui.muted ? "#e23d3d" : "#9aa4b2";
  ctx.font = `14px ${FONT}`;
  ctx.fillText(ui.muted ? "MUTED" : `VOL ${ui.volume}`, VIEW_W - 18, 54);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8b93a0";
  ctx.font = `13px ${FONT}`;
  ctx.fillText("ESC pause    M mute    secondary drops a mine    one shell in the air", VIEW_W / 2, VIEW_H - 18);
}

function drawPadIcon(ctx, x, y) {
  ctx.strokeStyle = "#9ee7ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 22, 14);
  ctx.fillStyle = "#9ee7ff";
  ctx.beginPath();
  ctx.arc(x + 7, y + 7, 2, 0, Math.PI * 2);
  ctx.arc(x + 15, y + 7, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCountdown(ctx, game) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6d8";
  ctx.font = `700 92px ${FONT}`;
  const label = game.phase === "countdown" ? String(Math.max(1, Math.ceil(game.countdown / 60))) : "GO";
  ctx.fillText(label, VIEW_W / 2, FIELD_Y + (ROWS * TILE) / 2);
}

function drawBanner(ctx, text, hint) {
  ctx.fillStyle = "rgba(6, 8, 12, 0.45)";
  ctx.fillRect(FIELD_X, FIELD_Y + 180, COLS * TILE, 120);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe08a";
  ctx.font = `700 36px ${FONT}`;
  ctx.fillText(text, VIEW_W / 2, FIELD_Y + 240);
  if (hint) {
    ctx.fillStyle = "#f4efe2";
    ctx.font = `16px ${FONT}`;
    ctx.fillText(hint, VIEW_W / 2, FIELD_Y + 274);
  }
}

function drawMatch(ctx, game) {
  const result = matchResult(game);
  ctx.fillStyle = "rgba(8, 10, 14, 0.78)";
  ctx.fillRect(0, FIELD_Y, VIEW_W, ROWS * TILE);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2c14e";
  ctx.font = `700 42px ${FONT}`;
  let headline = "DRAW";
  if (!result.tie && result.winner) {
    headline = result.winner.members ? `${result.winner.name} TAKES THE TURF` : `${result.winner.name} TAKES THE TURF`;
  }
  ctx.fillText(headline, VIEW_W / 2, FIELD_Y + 70);
  result.rows.forEach((row, index) => {
    const y = FIELD_Y + 130 + index * 48;
    ctx.fillStyle = row.color;
    ctx.fillRect(VIEW_W / 2 - 250, y - 18, 16, 16);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f4efe2";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${index + 1}  ${row.name}`, VIEW_W / 2 - 220, y);
    ctx.textAlign = "right";
    ctx.fillText(`${row.roundWins} WINS    ${row.score} KO`, VIEW_W / 2 + 250, y);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe08a";
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText("ENTER REMATCH     ESC TITLE", VIEW_W / 2, FIELD_Y + 360);
  ctx.fillStyle = "#8b93a0";
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`SEED ${game.seed}`, VIEW_W / 2, FIELD_Y + 392);
}

function drawPause(ctx, ui) {
  dim(ctx);
  panel(ctx, 300, 150, 360, 300);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2c14e";
  ctx.font = `700 36px ${FONT}`;
  ctx.fillText("PAUSED", VIEW_W / 2, 210);
  const items = ["Resume", "Settings", "Quit to title"];
  items.forEach((item, index) => {
    const y = 270 + index * 52;
    ctx.fillStyle = ui.menuIndex === index ? "#ffe08a" : "#d5d0c6";
    ctx.font = `${ui.menuIndex === index ? 700 : 500} 24px ${FONT}`;
    ctx.fillText(ui.menuIndex === index ? `> ${item}` : item, VIEW_W / 2, y);
  });
}

function drawSettings(ctx, ui) {
  dim(ctx);
  panel(ctx, 250, 130, 460, 360);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2c14e";
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText("SETTINGS", VIEW_W / 2, 190);
  const rows = [
    `Volume  ${ui.volume}`,
    `Rounds  ${ui.roundCount}`,
    "Controls",
    "Back",
  ];
  rows.forEach((row, index) => {
    const y = 250 + index * 52;
    ctx.fillStyle = ui.menuIndex === index ? "#ffe08a" : "#d5d0c6";
    ctx.font = `${ui.menuIndex === index ? 700 : 500} 24px ${FONT}`;
    ctx.fillText(ui.menuIndex === index ? `> ${row}` : row, VIEW_W / 2, y);
  });
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = "#9aa4b2";
  ctx.fillText("LEFT / RIGHT changes volume and rounds", VIEW_W / 2, 460);
}

function drawControls(ctx, ui) {
  dim(ctx);
  panel(ctx, 140, 40, 680, 560);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2c14e";
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText("CONTROLS", VIEW_W / 2, 84);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = "#9aa4b2";
  ctx.fillText("Enter a row, then press the new key. Esc cancels. Saved on this machine.", VIEW_W / 2, 112);

  const rows = controlRows(ui.binds);
  const windowStart = Math.max(0, Math.min(ui.menuIndex - 8, rows.length - 12));
  const visible = rows.slice(windowStart, windowStart + 12);
  visible.forEach((row, offset) => {
    const index = windowStart + offset;
    const y = 156 + offset * 32;
    ctx.textAlign = "left";
    ctx.font = `${ui.menuIndex === index ? 700 : 500} 16px ${FONT}`;
    ctx.fillStyle = ui.menuIndex === index ? "#ffe08a" : "#d5d0c6";
    const marker = ui.menuIndex === index ? ">" : " ";
    ctx.fillText(`${marker} ${row.label}`, 180, y);
    ctx.textAlign = "right";
    const listening = ui.rebinding && ui.rebinding.index === index;
    ctx.fillText(listening ? "PRESS A KEY" : row.value, 780, y);
  });
}

export function controlRows(binds) {
  const actions = [
    ["up", "Up"],
    ["down", "Down"],
    ["left", "Left"],
    ["right", "Right"],
    ["action", "Action"],
    ["secondary", "Secondary"],
  ];
  const rows = [];
  binds.forEach((bind, player) => {
    for (const [action, label] of actions) {
      rows.push({
        player,
        action,
        label: `P${player + 1} ${label}`,
        value: formatCode(bind[action]),
      });
    }
  });
  rows.push({ player: -1, action: "back", label: "Back", value: "" });
  return rows;
}

function drawNotice(ctx, game) {
  if (!game.notice) return;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe08a";
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText(game.notice, VIEW_W / 2, game.phase === "title" ? 520 : VIEW_H - 42);
}

function dim(ctx) {
  ctx.fillStyle = "rgba(6, 8, 12, 0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = "#1a1f27";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#f2c14e";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
}
