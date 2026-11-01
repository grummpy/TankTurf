import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultBinds,
  formatCode,
  readPlayers,
  rebind,
} from "../src/core/input.js";

function down(keys) {
  const set = new Set(keys);
  return (code) => set.has(code);
}

describe("input mapping", () => {
  it("maps the default keyboard split for all four players", () => {
    const binds = defaultBinds();
    const reading = readPlayers(
      binds,
      down([
        "KeyW",
        "KeyF",
        "ArrowRight",
        "Period",
        "KeyJ",
        "Semicolon",
        "Numpad8",
        "NumpadEnter",
        "Escape",
      ]),
      [],
    );
    assert.deepEqual(reading.players[0], {
      up: true,
      down: false,
      left: false,
      right: false,
      action: true,
      secondary: false,
    });
    assert.deepEqual(reading.players[1], {
      up: false,
      down: false,
      left: false,
      right: true,
      action: false,
      secondary: true,
    });
    assert.deepEqual(reading.players[2], {
      up: false,
      down: false,
      left: true,
      right: false,
      action: true,
      secondary: false,
    });
    assert.deepEqual(reading.players[3], {
      up: true,
      down: false,
      left: false,
      right: false,
      action: false,
      secondary: true,
    });
    assert.equal(reading.pause, true);
  });

  it("maps the rest of the default action keys", () => {
    const binds = defaultBinds();
    const reading = readPlayers(
      binds,
      down(["KeyA", "KeyS", "KeyD", "KeyG", "ArrowUp", "ArrowDown", "ArrowLeft", "Slash", "KeyI", "KeyK", "KeyL", "Quote", "Numpad4", "Numpad5", "Numpad6", "Numpad0"]),
      [],
    );
    assert.equal(reading.players[0].left, true);
    assert.equal(reading.players[0].down, true);
    assert.equal(reading.players[0].right, true);
    assert.equal(reading.players[0].secondary, true);
    assert.equal(reading.players[1].up, true);
    assert.equal(reading.players[1].down, true);
    assert.equal(reading.players[1].left, true);
    assert.equal(reading.players[1].action, true);
    assert.equal(reading.players[2].up, true);
    assert.equal(reading.players[2].down, true);
    assert.equal(reading.players[2].right, true);
    assert.equal(reading.players[2].secondary, true);
    assert.equal(reading.players[3].left, true);
    assert.equal(reading.players[3].down, true);
    assert.equal(reading.players[3].right, true);
    assert.equal(reading.players[3].action, true);
  });

  it("lets a connected pad override that player's keyboard", () => {
    const binds = defaultBinds();
    const pads = [
      {
        connected: true,
        axes: [0, -1],
        buttons: { 0: { pressed: true }, 1: false, 9: { pressed: true } },
      },
      null,
      null,
      null,
    ];
    const reading = readPlayers(binds, down(["KeyS", "KeyF"]), pads);
    assert.equal(reading.players[0].up, true);
    assert.equal(reading.players[0].down, false);
    assert.equal(reading.players[0].action, true);
    assert.equal(reading.players[0].secondary, false);
    assert.equal(reading.pause, true);
    assert.equal(reading.players[1].down, false);
  });

  it("reads the D-pad and falls back to the keyboard when the pad is unplugged", () => {
    const binds = defaultBinds();
    const plugged = readPlayers(binds, down(["KeyW"]), [
      { connected: true, axes: [0, 0], buttons: { 14: { pressed: true }, 15: true } },
    ]);
    assert.equal(plugged.players[0].left, true);
    assert.equal(plugged.players[0].right, true);
    assert.equal(plugged.players[0].up, false);

    const loose = readPlayers(binds, down(["KeyW"]), [
      { connected: false, axes: [0, -1], buttons: { 0: { pressed: true } } },
    ]);
    assert.equal(loose.players[0].up, true);
    assert.equal(loose.players[0].action, false);
  });

  it("remaps a key and keeps it exclusive", () => {
    let binds = defaultBinds();
    binds = rebind(binds, 0, "up", "KeyZ");
    const reading = readPlayers(binds, down(["KeyZ", "KeyW"]), []);
    assert.equal(reading.players[0].up, true);
    assert.equal(binds[0].up, "KeyZ");
    binds = rebind(binds, 1, "action", "KeyZ");
    assert.equal(binds[0].up, null);
    assert.equal(binds[1].action, "KeyZ");
    assert.equal(formatCode("Slash"), "/");
    assert.equal(formatCode("NumpadEnter"), "Num Enter");
    assert.equal(formatCode("KeyG"), "G");
  });
});
