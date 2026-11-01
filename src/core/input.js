/** Pure keyboard and gamepad mapping. No DOM. */

export const ACTIONS = ["up", "down", "left", "right", "action", "secondary"];

export function defaultBinds() {
  return [
    { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", action: "KeyF", secondary: "KeyG" },
    { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", action: "Slash", secondary: "Period" },
    { up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL", action: "Semicolon", secondary: "Quote" },
    { up: "Numpad8", down: "Numpad5", left: "Numpad4", right: "Numpad6", action: "Numpad0", secondary: "NumpadEnter" },
  ];
}

export function emptyHeld() {
  return { up: false, down: false, left: false, right: false, action: false, secondary: false };
}

export function formatCode(code) {
  if (!code) return "—";
  const named = {
    Slash: "/",
    Period: ".",
    Semicolon: ";",
    Quote: "'",
    NumpadEnter: "Num Enter",
    ArrowUp: "Up Arrow",
    ArrowDown: "Down Arrow",
    ArrowLeft: "Left Arrow",
    ArrowRight: "Right Arrow",
    Space: "Space",
    Escape: "Esc",
    Enter: "Enter",
  };
  if (named[code]) return named[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

function buttonDown(pad, index) {
  const button = pad.buttons?.[index];
  if (button == null) return false;
  if (typeof button === "boolean") return button;
  if (typeof button === "number") return button > 0.5;
  return !!button.pressed || (typeof button.value === "number" && button.value > 0.5);
}

/** Standard pad: left stick / D-pad move, A action, B secondary, Start pause. */
export function actionsFromGamepad(pad) {
  if (!pad || !pad.connected) return null;
  const ax = pad.axes?.[0] ?? 0;
  const ay = pad.axes?.[1] ?? 0;
  return {
    up: ay < -0.5 || buttonDown(pad, 12),
    down: ay > 0.5 || buttonDown(pad, 13),
    left: ax < -0.5 || buttonDown(pad, 14),
    right: ax > 0.5 || buttonDown(pad, 15),
    action: buttonDown(pad, 0),
    secondary: buttonDown(pad, 1),
    pause: buttonDown(pad, 9),
  };
}

export function actionsFromKeys(bind, isDown) {
  const down = (code) => !!code && !!isDown(code);
  return {
    up: down(bind.up),
    down: down(bind.down),
    left: down(bind.left),
    right: down(bind.right),
    action: down(bind.action),
    secondary: down(bind.secondary),
  };
}

/**
 * Replace one binding. The code is taken away from every other action so a
 * single physical key never drives two commands.
 */
export function rebind(binds, playerIndex, action, code) {
  if (!ACTIONS.includes(action)) throw new Error(`unknown action ${action}`);
  const next = binds.map((bind) => ({ ...bind }));
  for (const bind of next) {
    for (const name of ACTIONS) {
      if (bind[name] === code) bind[name] = null;
    }
  }
  next[playerIndex][action] = code;
  return next;
}

/**
 * Build the four player action sets. A connected pad overrides that
 * player's keyboard bindings entirely.
 */
export function readPlayers(binds, isDown, pads) {
  const players = [];
  let pause = false;
  for (let i = 0; i < 4; i++) {
    const pad = pads?.[i];
    if (pad && pad.connected) {
      const actions = actionsFromGamepad(pad);
      if (actions.pause) pause = true;
      players.push({
        up: actions.up,
        down: actions.down,
        left: actions.left,
        right: actions.right,
        action: actions.action,
        secondary: actions.secondary,
      });
    } else {
      players.push(actionsFromKeys(binds[i], isDown));
    }
  }
  if (isDown("Escape")) pause = true;
  return { players, pause };
}
