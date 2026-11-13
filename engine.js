// Dr. Mario (NES) pill reserve model, after the Nostaljipi disassembly:
// at level start generatePillsReserve fills pillsReserve[127..0] with
// pillId = (pillId + (rng0 & 15)) mod 9, pillId starting at 0, stepping the
// RNG once per pill. Pills are then dealt from index 0 upwards, wrapping at 128,
// but level init deals two and action_sendPill a third before the first one
// falls, so the first pill played is index 1 (index 0 only comes after the wrap).
// Pill index = left * 3 + right, colors 0 yellow, 1 red, 2 blue.
const DrMario = (() => {
  const RESERVE = 128;
  const SEEDS = 1 << 15;
  const FIRST_PLAYED = 1;
  const COLORS = ["yellow", "red", "blue"];
  const LEFT = [0, 0, 0, 1, 1, 1, 2, 2, 2];
  const RIGHT = [0, 1, 2, 0, 1, 2, 0, 1, 2];

  // State = rng0 << 8 | rng1 ($17, $18). ror rng0 then ror rng1.
  function step(s) {
    const feedback = ((s >> 9) ^ (s >> 1)) & 1;
    return (feedback << 15) | (s >> 1);
  }

  function fillReserve(state, out, offset) {
    let pill = 0;
    for (let n = RESERVE; n > 0; n--) {
      state = step(state);
      pill += (state >> 8) & 0x0f;
      while (pill >= 9) pill -= 9;
      out[offset + n - 1] = pill;
    }
  }

  // Bit 0 of the state is shifted out before anything reads it, so the
  // 2^15 values of bits 1-15 cover every possible reserve.
  const reserves = new Uint8Array(SEEDS * RESERVE);
  for (let k = 0; k < SEEDS; k++) fillReserve(k << 1, reserves, k * RESERVE);

  const ALL_POSITIONS = Array.from({ length: RESERVE }, (_, i) => i);
  let matchBuf = new Int32Array(1 << 16);

  function pushMatch(count, value) {
    if (count === matchBuf.length) {
      const bigger = new Int32Array(matchBuf.length * 2);
      bigger.set(matchBuf);
      matchBuf = bigger;
    }
    matchBuf[count] = value;
    return count + 1;
  }

  // tokens: {t: "pill", v: 0..8} | {t: "wild"} (unknown number of pills) |
  // {t: "adv"} (exactly one pill of unknown color).
  // Returns every (seed, position of the next pill) consistent with the tokens,
  // encoded as seed * 128 + position.
  function solve(tokens) {
    let count = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      const base = seed * RESERVE;
      let set = [FIRST_PLAYED];
      for (const tok of tokens) {
        if (tok.t === "wild") {
          set = ALL_POSITIONS;
        } else if (tok.t === "adv") {
          set = set.map((p) => (p + 1) & (RESERVE - 1));
        } else {
          const next = [];
          for (const p of set) {
            if (reserves[base + p] === tok.v) next.push((p + 1) & (RESERVE - 1));
          }
          set = next;
          if (set.length === 0) break;
        }
      }
      for (const p of set) count = pushMatch(count, base + p);
    }
    return matchBuf.subarray(0, count);
  }

  // For each of the next `length` pills: the pill if every match agrees, else -1.
  function predict(matches, length) {
    const out = new Array(length).fill(-1);
    if (matches.length === 0) return out;
    const first = matches[0];
    const seedBase = (m) => m & ~(RESERVE - 1);
    for (let i = 0; i < length; i++) {
      out[i] = reserves[seedBase(first) + ((first + i) & (RESERVE - 1))];
    }
    let open = length;
    for (let j = 1; j < matches.length && open > 0; j++) {
      const m = matches[j];
      for (let i = 0; i < length; i++) {
        if (out[i] >= 0 && reserves[seedBase(m) + ((m + i) & (RESERVE - 1))] !== out[i]) {
          out[i] = -1;
          open--;
        }
      }
    }
    return out;
  }

  function countSeeds(matches) {
    let seeds = 0;
    let last = -1;
    for (const m of matches) {
      const s = m >> 7;
      if (s !== last) seeds++;
      last = s;
    }
    return seeds;
  }

  return { RESERVE, SEEDS, COLORS, LEFT, RIGHT, step, reserves, solve, predict, countSeeds };
})();

if (typeof module !== "undefined") module.exports = DrMario;
