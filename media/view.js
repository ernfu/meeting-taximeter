// Runs inside the webview. The extension posts { type: "state", meeting, stats };
// everything on screen is derived from meeting.startedAt + Date.now() each frame.
(function () {
  "use strict";

  const vscode = acquireVsCodeApi();

  const MILESTONE_SECONDS = 5 * 60; // a score pop every 5 minutes
  const FX_PX = 4;                  // css px per art pixel for fire + sparks
  const ROAD_PX = 3;                // css px per art pixel for the road + taxi
  const ROAD_H = 18;                // road canvas height in art pixels

  const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

  const $ = (id) => document.getElementById(id);
  const app = $("app"), stage = $("stage"), hud = $("hud");
  const scoreEl = $("score"), statusEl = $("status"), actionBtn = $("action");
  const chipPeople = $("chipPeople"), chipRate = $("chipRate");
  const fillEl = $("fill"), clockEl = $("clock"), budgetEl = $("budget"), whoEl = $("who");
  const popsEl = $("pops"), monthEl = $("month"), quarterEl = $("quarter"), boardEl = $("board");
  const historyBtn = $("historyBtn"), backBtn = $("back"), wipeBtn = $("wipe");
  const recentEl = $("recent"), recentHead = $("recentHead");

  let meeting = null; // null when no meeting is running
  let stats = { month: 0, quarter: 0, leaderboard: [], recent: [] };
  let showHistory = false;
  let wipeTimer = 0;
  let lastMilestone = 0;
  let wasOver = false;
  let heat = 0;       // 0 = no fire, 1 = inferno

  // ---------------------------------------------------------------- messages

  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "state") applyState(e.data);
  });

  actionBtn.addEventListener("click", () => {
    vscode.postMessage({ type: meeting ? "stop" : "start" });
  });

  historyBtn.addEventListener("click", () => setHistory(true));
  backBtn.addEventListener("click", () => setHistory(false));

  // wiping can't be undone: first click arms, a second click within 3s wipes
  wipeBtn.addEventListener("click", () => {
    if (wipeBtn.classList.contains("armed")) {
      disarm();
      vscode.postMessage({ type: "clear" });
    } else {
      wipeBtn.classList.add("armed");
      wipeTimer = setTimeout(disarm, 3000);
    }
  });

  function disarm() {
    clearTimeout(wipeTimer);
    wipeBtn.classList.remove("armed");
  }

  function setHistory(on) {
    showHistory = on && !meeting;
    app.classList.toggle("show-history", showHistory);
    if (!showHistory) disarm();
  }

  function applyState(s) {
    const isNew = s.meeting && (!meeting || meeting.startedAt !== s.meeting.startedAt);

    meeting = s.meeting || null;
    stats = s.stats;

    if (isNew) {
      // don't replay milestones that happened before this panel saw the meeting
      const secs = elapsed();
      lastMilestone = Math.floor(secs / MILESTONE_SECONDS);
      wasOver = secs > meeting.durationSeconds;
    }

    app.classList.toggle("idle", !meeting);
    if (meeting) setHistory(false); // a meeting started from the palette takes over the screen
    actionBtn.textContent = meeting ? "STOP" : "START METER";

    if (meeting) {
      chipPeople.textContent = String(meeting.people.length);
      chipRate.textContent = money.format(meeting.costPerSecond * 60);
      budgetEl.textContent = "BUDGET " + money.format(meeting.costPerSecond * meeting.durationSeconds);
      whoEl.textContent = meeting.people.join(", ");
    } else {
      heat = 0;
      app.classList.remove("warn", "overtime");
      statusEl.textContent = "INSERT MEETING";
      scoreEl.textContent = money.format(0);
      renderTotals(0);
    }

    renderBoard();
  }

  // ---------------------------------------------------------------- meter

  function elapsed() {
    return Math.max(0, (Date.now() - meeting.startedAt) / 1000);
  }

  function updateMeter() {
    const secs = elapsed();
    const cost = secs * meeting.costPerSecond;
    const ratio = meeting.durationSeconds > 0 ? secs / meeting.durationSeconds : Infinity;
    const over = ratio > 1;

    setText(scoreEl, money.format(cost));
    setText(statusEl, over ? "OVERTIME!" : "METER RUNNING");
    setText(clockEl, over
      ? "+" + clock(secs - meeting.durationSeconds) + " OVER"
      : clock(secs) + " / " + clock(meeting.durationSeconds));
    fillEl.style.width = Math.min(ratio, 1) * 100 + "%";

    app.classList.toggle("warn", !over && ratio >= 0.8);
    app.classList.toggle("overtime", over);
    renderTotals(cost);

    heat = over ? Math.min(1, 0.35 + (ratio - 1) * 1.3) : 0;

    if (over && !wasOver) {
      wasOver = true;
      celebrate("OVERTIME!", "bad", -32);
    }

    const m = Math.floor(secs / MILESTONE_SECONDS);
    if (m > lastMilestone) {
      const chunk = (m - lastMilestone) * MILESTONE_SECONDS * meeting.costPerSecond;
      lastMilestone = m;
      celebrate("+" + money.format(chunk), over ? "bad" : "good", 0);
    }
  }

  // score pop + floating label + shake + sparks
  function celebrate(text, kind, dy) {
    restartAnimation(scoreEl, "pop");
    restartAnimation(hud, "shake");

    const s = stage.getBoundingClientRect();
    const r = scoreEl.getBoundingClientRect();
    const x = r.left + r.width / 2 - s.left;
    const y = r.top + r.height / 2 - s.top + dy;

    const el = document.createElement("div");
    el.className = "float " + kind;
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.addEventListener("animationend", () => el.remove());
    popsEl.appendChild(el);

    burst(x / FX_PX, y / FX_PX, kind === "bad" ? 90 : 60);
  }

  function restartAnimation(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // force a reflow so the animation starts over
    el.classList.add(cls);
    el.addEventListener("animationend", function done(e) {
      if (e.target !== el) return; // animationend bubbles up from children
      el.classList.remove(cls);
      el.removeEventListener("animationend", done);
    });
  }

  // ---------------------------------------------------------------- stats

  function renderTotals(liveCost) {
    // the running meeting counts towards this month/quarter while it's going
    setText(monthEl, money.format(stats.month + liveCost));
    setText(quarterEl, money.format(stats.quarter + liveCost));
  }

  function renderBoard() {
    fillList(boardEl, stats.leaderboard, true);
    fillList(recentEl, stats.recent, false);
    recentHead.hidden = recentEl.hidden = stats.recent.length === 0;
  }

  function fillList(list, meetings, ranked) {
    const rows = meetings.map((m, i) => {
      const li = document.createElement("li");
      if (ranked) li.append(span("rank", "#" + (i + 1)));
      li.append(
        span("cost", money.format(m.cost)),
        span("when", day(m.start)),
        span("names", names(m.who) + " / " + minutes(m.elapsedSeconds))
      );
      return li;
    });

    if (rows.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "NO MEETINGS YET. LUCKY YOU.";
      rows.push(li);
    }

    list.replaceChildren(...rows);
  }

  // ---------------------------------------------------------------- particles

  const FIRE_COLOURS = ["#fff4b0", "#ffd23f", "#ff8c1a", "#e0301e", "#5a1a14"];
  const SPARK_COLOURS = ["#ffd23f", "#0093ff", "#ff4c40", "#ffffff", "#4cd964"];

  const fire = layer("fire");
  const sparks = layer("sparks");
  let fireCarry = 0;

  function layer(id) {
    const canvas = $(id);
    return { canvas, ctx: canvas.getContext("2d"), parts: [] };
  }

  function stepFire(dt) {
    const { canvas, ctx, parts } = fire;
    const W = canvas.width, H = canvas.height;

    if (heat > 0) {
      fireCarry += W * 0.1 * heat * dt;
      const rise = H * (0.25 + 0.5 * heat); // how far a flame climbs before it dies
      while (fireCarry >= 1) {
        fireCarry -= 1;
        if (parts.length > 2000) continue;
        const decay = 0.012 + Math.random() * 0.02;
        parts.push({
          x: Math.random() * W,
          y: H + Math.random() * 2,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -rise * decay * (0.6 + Math.random() * 0.8),
          life: 1,
          decay
        });
      }
    }

    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.x += (p.vx + Math.sin((p.x + p.y) * 0.15) * 0.15) * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = FIRE_COLOURS[Math.min(4, Math.floor((1 - p.life) * 5))];
      const size = p.life > 0.7 ? 2 : 1;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 2.2;
      sparks.parts.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1.2,
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
        colour: SPARK_COLOURS[i % SPARK_COLOURS.length],
        size: Math.random() < 0.3 ? 2 : 1
      });
    }
  }

  function stepSparks(dt) {
    const { canvas, ctx, parts } = sparks;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.vy += 0.06 * dt; // gravity
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = p.colour;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }

  // ---------------------------------------------------------------- the taxi

  // facing right. K outline, Y body, W window, G hubcap, R tail light, H headlight, L roof sign
  const TAXI = [
    "........LLL.......",
    "......KKKKKKK.....",
    ".....KWWKWWWWK....",
    "....KWWWKWWWWWK...",
    "..KKYYYYYYYYYYYKK.",
    ".KYYYYYYYYYYYYYYYK",
    "RYKYKYKYKYKYKYKYYH",
    ".KYYKKKYYYYYKKKYK.",
    "....KGK.....KGK..."
  ];
  const TAXI_W = TAXI[0].length, TAXI_H = TAXI.length;
  const TAXI_TOP = ROAD_H - 3 - TAXI_H;
  const TAXI_COLOURS = { K: "#111111", Y: "#ffcc00", W: "#8fd3ff", G: "#9a9a9a", R: "#ff4c40", H: "#fffbe0" };
  const Z = ["###", ".#.", "###"];

  const road = { canvas: $("road"), ctx: $("road").getContext("2d") };
  const taxi = { x: 4, dir: 1, t: 0 };

  function drawRoad(dt, now) {
    const { canvas, ctx } = road;
    const W = canvas.width;
    const moving = meeting !== null;

    ctx.clearRect(0, 0, W, ROAD_H);
    ctx.fillStyle = "#161616";
    ctx.fillRect(0, ROAD_H - 3, W, 3);
    ctx.fillStyle = "#4a4a4a";
    for (let x = 2; x < W; x += 10) ctx.fillRect(x, ROAD_H - 2, 5, 1);

    if (moving) {
      taxi.t += dt;
      taxi.x += (0.25 + heat * 0.6) * taxi.dir * dt;
      if (taxi.x > W - TAXI_W - 2) { taxi.x = W - TAXI_W - 2; taxi.dir = -1; }
      if (taxi.x < 2) { taxi.x = 2; taxi.dir = 1; }
    }

    const x0 = Math.round(taxi.x);
    const wheelFrame = moving ? Math.floor(taxi.t / 6) % 2 : 0;

    for (let row = 0; row < TAXI_H; row++) {
      for (let col = 0; col < TAXI_W; col++) {
        let ch = TAXI[row][col];
        if (ch === ".") continue;
        if (row === TAXI_H - 1 && wheelFrame) ch = ch === "G" ? "K" : "G"; // spin the wheels
        ctx.fillStyle = ch === "L" ? (moving ? "#ffe066" : "#5c4d16") : TAXI_COLOURS[ch];
        ctx.fillRect(x0 + (taxi.dir < 0 ? TAXI_W - 1 - col : col), TAXI_TOP + row, 1, 1);
      }
    }

    if (heat > 0) { // the cab is on fire too
      for (let i = 0; i < 3 + heat * 6; i++) {
        ctx.fillStyle = FIRE_COLOURS[Math.floor(Math.random() * 3)];
        ctx.fillRect(x0 + 5 + Math.floor(Math.random() * 8), TAXI_TOP - Math.floor(Math.random() * (2 + heat * 3)), 1, 1);
      }
    }

    if (!moving) { // parked and asleep
      ctx.fillStyle = "#ffffffb0";
      for (let i = 0; i < 2; i++) {
        const phase = (now / 1400 + i * 0.5) % 1;
        const zx = x0 + TAXI_W - 1 + i * 4;
        const zy = TAXI_TOP - 3 - Math.floor(phase * 3);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          if (Z[r][c] === "#") ctx.fillRect(zx + c, zy + r, 1, 1);
        }
      }
    }
  }

  // ---------------------------------------------------------------- layout + loop

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const l of [fire, sparks]) {
      l.canvas.width = Math.ceil(w / FX_PX);
      l.canvas.height = Math.ceil(h / FX_PX);
      l.canvas.style.width = l.canvas.width * FX_PX + "px";   // exact multiples keep pixels square
      l.canvas.style.height = l.canvas.height * FX_PX + "px";
    }
    road.canvas.width = Math.ceil(w / ROAD_PX);
    road.canvas.height = ROAD_H;
    road.canvas.style.width = road.canvas.width * ROAD_PX + "px";
    taxi.x = Math.min(taxi.x, Math.max(2, road.canvas.width - TAXI_W - 2));
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(now - last, 50) / (1000 / 60); // 1 = one 60fps frame
    last = now;
    if (meeting) updateMeter();
    stepFire(dt);
    stepSparks(dt);
    drawRoad(dt, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- helpers

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  function span(cls, text) {
    const el = document.createElement("span");
    el.className = cls;
    el.textContent = text;
    return el;
  }

  function clock(s) {
    s = Math.floor(s);
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return h ? h + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function names(list) {
    return list.length <= 2 ? list.join(", ") : list.slice(0, 2).join(", ") + " +" + (list.length - 2);
  }

  function minutes(s) {
    return s < 60 ? "<1M" : Math.round(s / 60) + "M";
  }

  function day(ms) {
    return new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short" }).toUpperCase();
  }

  renderBoard();
  vscode.postMessage({ type: "ready" });
})();
