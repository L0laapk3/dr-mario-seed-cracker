(() => {
  const D = DrMario;
  const COLOR_VARS = ["var(--yellow)", "var(--red)", "var(--blue)"];
  const COLOR_NAMES = ["Y", "R", "B"];

  const tokens = [];
  let matches = D.solve(tokens);
  let queueLength = Number(localStorage.getItem("queueLength")) || 10;

  const $ = (id) => document.getElementById(id);
  const queueInput = $("queue-length");
  queueInput.value = queueLength;

  function pillSvg(pill, width = 64) {
    const l = COLOR_VARS[D.LEFT[pill]];
    const r = COLOR_VARS[D.RIGHT[pill]];
    return `<svg width="${width}" height="${width / 2}" viewBox="0 0 64 32" aria-label="${pillName(pill)}">
      <path d="M32 2H16a14 14 0 0 0 0 28h16z" fill="${l}"/>
      <path d="M32 2h16a14 14 0 0 1 0 28H32z" fill="${r}"/>
      <rect x="2" y="2" width="60" height="28" rx="14" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="2"/>
      <line x1="32" y1="2" x2="32" y2="30" stroke="#000" stroke-opacity=".55" stroke-width="2"/>
      <rect x="10" y="7" width="44" height="4" rx="2" fill="#fff" fill-opacity=".35"/>
    </svg>`;
  }

  function pillName(pill) {
    return COLOR_NAMES[D.LEFT[pill]] + COLOR_NAMES[D.RIGHT[pill]];
  }

  // Numpad layout: [code, grid classes, cap label, name, pill or null]
  const KEYS = [
    ["NumLock", "", "Num", "", null],
    ["NumpadDivide", "", "/", "", null],
    ["NumpadMultiply", "", "*", "", null],
    ["NumpadSubtract", "", "\u2212", "Reset", null],
    ["Numpad7", "", "7", "", 6],
    ["Numpad8", "", "8", "", 7],
    ["Numpad9", "", "9", "", 8],
    ["NumpadAdd", "tall", "+", "", null],
    ["Numpad4", "", "4", "", 3],
    ["Numpad5", "", "5", "", 4],
    ["Numpad6", "", "6", "", 5],
    ["Numpad1", "", "1", "", 0],
    ["Numpad2", "", "2", "", 1],
    ["Numpad3", "", "3", "", 2],
    ["NumpadEnter", "tall", "Enter", "Wildcard", null],
    ["Numpad0", "wide", "0", "Advance", null],
    ["NumpadDecimal", "", ".", "Undo", null],
  ];
  const ACTIVE = new Set(["NumpadSubtract", "NumpadEnter", "Numpad0", "NumpadDecimal"]);
  const keyEls = {};

  function buildNumpad() {
    const pad = $("numpad");
    for (const [code, cls, cap, name, pill] of KEYS) {
      const el = document.createElement("button");
      el.className = `key ${cls}`;
      el.disabled = pill === null && !ACTIVE.has(code);
      el.innerHTML = `<span class="cap">${cap}</span>` +
        (pill !== null ? pillSvg(pill, 52) : `<span class="name">${name}</span>`);
      el.tabIndex = -1;
      el.addEventListener("mousedown", (e) => e.preventDefault());
      el.addEventListener("click", () => handle(code));
      pad.appendChild(el);
      keyEls[code] = el;
    }
  }

  function prediction() {
    return D.predict(matches, queueLength);
  }

  function isCracked(pred) {
    return matches.length > 0 && pred.every((p) => p >= 0);
  }

  function push(token) {
    tokens.push(token);
    matches = D.solve(tokens);
  }

  function handle(code) {
    const digit = /^(?:Numpad|Digit)([0-9])$/.exec(code);
    if (digit) {
      const n = Number(digit[1]);
      if (n === 0) {
        push({ t: "adv" });
      } else {
        const pred = prediction();
        if (isCracked(pred)) {
          if (pred[0] !== n - 1) flashBad();
          push({ t: "adv" });
        } else {
          push({ t: "pill", v: n - 1 });
        }
      }
    } else if (code === "NumpadEnter") {
      push({ t: "wild" });
    } else if (code === "NumpadSubtract" || code === "Minus") {
      tokens.length = 0;
      matches = D.solve(tokens);
    } else if (code === "NumpadDecimal" || code === "Backspace") {
      tokens.pop();
      matches = D.solve(tokens);
    } else {
      return false;
    }
    render();
    return true;
  }

  function flashBad() {
    const q = $("queue");
    q.classList.remove("flash-bad");
    void q.offsetWidth;
    q.classList.add("flash-bad");
  }

  function render() {
    const status = $("status");
    const detail = $("detail");
    const pred = prediction();
    const cracked = isCracked(pred);
    const seeds = D.countSeeds(matches);

    status.className = "status";
    if (tokens.length === 0) {
      status.textContent = "Enter the first pills of the level";
      detail.textContent = `${D.SEEDS} possible seeds`;
    } else if (matches.length === 0) {
      status.textContent = "No seed matches";
      status.classList.add("bad");
      detail.textContent = "Check the input: . to undo, \u2212 to reset";
    } else if (cracked) {
      status.textContent = "Cracked";
      status.classList.add("cracked");
      if (matches.length === 1) {
        const m = matches[0];
        const rng = ((m >> 7) << 1).toString(16).toUpperCase().padStart(4, "0");
        detail.textContent = `RNG $${rng}, next pill is #${m & 127} of the 128-pill reserve`;
      } else {
        detail.textContent = `${matches.length} candidates (${seeds} seeds) agree on the next ${queueLength}`;
      }
    } else {
      status.textContent = `${matches.length} candidates`;
      detail.textContent = `${seeds} seed${seeds > 1 ? "s" : ""}, usually about 11 pills from level start`;
    }

    const queue = $("queue");
    queue.innerHTML = "";
    if (tokens.length > 0 && matches.length > 0) {
      const unique = matches.length === 1 ? matches[0] : -1;
      pred.forEach((p, i) => {
        const slot = document.createElement("div");
        slot.className = "slot" + (i === 0 ? " first" : "");
        const label = i === 0 ? "next" : `+${i}`;
        const index = unique >= 0 ? ` \u00b7 #${(unique + i) & 127}` : "";
        slot.innerHTML = (p >= 0 ? pillSvg(p) : `<div class="unknown">?</div>`) +
          `<span class="label">${label}${index}</span>`;
        queue.appendChild(slot);
      });
    }

    const history = $("history");
    history.innerHTML = "";
    if (tokens.length === 0) {
      history.innerHTML = `<span class="empty">nothing yet</span>`;
    }
    for (const tok of tokens) {
      if (tok.t === "pill") {
        history.insertAdjacentHTML("beforeend", pillSvg(tok.v, 36));
      } else {
        const el = document.createElement("span");
        el.className = "token";
        el.textContent = tok.t === "wild" ? "* wildcard" : "+1";
        history.appendChild(el);
      }
    }

    for (const [code, el] of Object.entries(keyEls)) {
      if (/^Numpad[1-9]$/.test(code)) el.title = cracked ? "Advance" : pillName(Number(code.slice(6)) - 1);
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.target === queueInput) {
      if (e.key === "Enter" || e.key === "Escape") queueInput.blur();
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (handle(e.code)) {
      e.preventDefault();
      keyEls[e.code]?.classList.add("pressed");
    }
  });
  document.addEventListener("keyup", (e) => keyEls[e.code]?.classList.remove("pressed"));
  window.addEventListener("blur", () => Object.values(keyEls).forEach((el) => el.classList.remove("pressed")));

  queueInput.addEventListener("input", () => {
    const n = Math.round(Number(queueInput.value));
    if (n >= 1 && n <= D.RESERVE) {
      queueLength = n;
      localStorage.setItem("queueLength", n);
      render();
    }
  });

  buildNumpad();
  render();
})();
