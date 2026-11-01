/** Live Web Audio chiptune and effects. No audio files. */

const MELODY = [146.83, 174.61, 196.0, 220.0, 196.0, 174.61, 164.81, 146.83];
const BASS = [73.42, 73.42, 98.0, 87.31, 73.42, 82.41, 98.0, 73.42];

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let volume = 0.7;
  let themeOn = false;
  let step = 0;
  let timer = null;

  function context() {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume * 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain) {
    const audio = context();
    if (!audio || muted || !master) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const now = audio.currentTime;
    amp.gain.setValueAtTime(Math.max(0.0001, gain), now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, gain) {
    const audio = context();
    if (!audio || muted || !master) return;
    const length = Math.max(1, Math.floor(audio.sampleRate * dur));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const amp = audio.createGain();
    amp.gain.value = gain;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    source.start();
  }

  function loop() {
    if (!themeOn) return;
    tone(MELODY[step % MELODY.length], 0.16, "square", 0.08);
    tone(BASS[step % BASS.length], 0.18, "triangle", 0.07);
    step = (step + 1) % MELODY.length;
  }

  return {
    unlock() {
      context();
      if (themeOn) return;
      themeOn = true;
      loop();
      timer = setInterval(loop, 220);
    },
    stop() {
      themeOn = false;
      if (timer) clearInterval(timer);
      timer = null;
    },
    setMuted(value) {
      muted = !!value;
      if (master) master.gain.value = muted ? 0 : volume * 0.22;
    },
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
      if (master && !muted) master.gain.value = volume * 0.22;
    },
    play(event) {
      switch (event.type) {
        case "shoot":
          tone(520, 0.08, "square", 0.07);
          break;
        case "brick":
          noise(0.07, 0.18);
          break;
        case "bounce":
          tone(190, 0.06, "square", 0.06);
          break;
        case "steel":
          tone(90, 0.05, "square", 0.06);
          break;
        case "down":
          tone(150, 0.12, "sawtooth", 0.07);
          break;
        case "ko":
          noise(0.22, 0.28);
          tone(80, 0.22, "square", 0.08);
          break;
        case "pickup":
          tone(660, 0.07, "square", 0.07);
          tone(880, 0.12, "square", 0.06);
          break;
        case "countdown":
          tone(440, 0.1, "square", 0.08);
          break;
        case "go":
          tone(660, 0.14, "square", 0.09);
          break;
        case "round":
          tone(523, 0.12, "square", 0.08);
          tone(659, 0.14, "square", 0.08);
          tone(784, 0.24, "square", 0.08);
          break;
        case "match":
          tone(392, 0.14, "square", 0.08);
          tone(523, 0.18, "square", 0.08);
          tone(784, 0.32, "square", 0.08);
          break;
        default:
          break;
      }
    },
  };
}
