/**
 * Mulberry32 seeded RNG. Same seed always yields the same sequence,
 * which keeps tests and replays deterministic.
 */
export function makeRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) {
      if (n <= 0) return 0;
      return Math.floor(this.next() * n);
    },
    get state() {
      return state;
    },
  };
}
