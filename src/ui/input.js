/** DOM keyboard and Gamepad API polling. Mapping itself lives in src/core/input.js. */

export function createInput(target) {
  const down = new Set();
  const edges = [];

  function onKeyDown(event) {
    if (!down.has(event.code)) edges.push(event.code);
    down.add(event.code);
    if (shouldBlock(event.code)) event.preventDefault();
  }

  function onKeyUp(event) {
    down.delete(event.code);
    if (shouldBlock(event.code)) event.preventDefault();
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => down.clear());

  return {
    isDown(code) {
      return down.has(code);
    },
    takeEdges() {
      return edges.splice(0, edges.length);
    },
    pollPads() {
      const pads = [null, null, null, null];
      let list = [];
      try {
        list = navigator.getGamepads ? navigator.getGamepads() : [];
      } catch {
        list = [];
      }
      if (!list) return pads;
      for (let i = 0; i < 4; i++) {
        const pad = list[i];
        if (pad && pad.connected) pads[i] = pad;
      }
      return pads;
    },
  };
}

function shouldBlock(code) {
  return (
    code.startsWith("Arrow") ||
    code.startsWith("Numpad") ||
    code === "Space" ||
    code === "Tab" ||
    code === "Slash" ||
    code === "Quote" ||
    code === "Semicolon"
  );
}
