import { useState, useEffect, useRef } from "react";
import { BG, GOLD, LIGHT, page, center, AudioButton, FeedbackScreen, postToAirtable, speakText, detectPlatform, PX_INK, PX_PAPER, PX_PALETTE, pixelBorder, pixelCard, pixelBtn, pixelBtnGhost, PixelLabel, PixelHeading } from "./shared.jsx";

// ── LANE / PHYSICS CONSTANTS ──────────────────────────────────────────────────
const LANE_W = 60, GUTTER_W = 12, LANE_LEN = 220;
const FAR_SCALE = 0.72, NEAR_SCALE = 1.0;
const BALL_R = 4.2, PIN_R = 2.4;
const FOUL_Y = LANE_LEN - 16;
const HEAD_PIN_Y = 46, ROW_SPACING = 8.6, PIN_SPACING = 5.6;
const MAX_PULL = 46, MAX_SHOT_SPEED = 210, MIN_PULL_TO_FIRE = 4;
const FRICTION = 34, MIN_SPEED = 2.5;
const PIN_FRICTION = 260;
const REST_PIN = 0.55;
const KNOCKDOWN_DIST = PIN_R * 2.1;
const BALL_START = { x: LANE_W / 2, y: FOUL_Y };

// Standard 10-pin triangle slots — numbered 1 (head pin, nearest bowler) through 10 (back row).
function pinSlots() {
  const rows = [
    { n: 1, y: HEAD_PIN_Y },
    { n: 2, y: HEAD_PIN_Y - ROW_SPACING },
    { n: 3, y: HEAD_PIN_Y - ROW_SPACING * 2 },
    { n: 4, y: HEAD_PIN_Y - ROW_SPACING * 3 },
  ];
  const nums = [[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]];
  const slots = [];
  rows.forEach((row, ri) => {
    const count = row.n;
    for (let i = 0; i < count; i++) {
      slots.push({ num: nums[ri][i], x: LANE_W / 2 + (i - (count - 1) / 2) * PIN_SPACING, y: row.y });
    }
  });
  return slots;
}
const PIN_SLOTS = pinSlots();

function freshPins() {
  return PIN_SLOTS.map(s => ({ id: `p${s.num}`, num: s.num, ox: s.x, oy: s.y, x: s.x, y: s.y, vx: 0, vy: 0, down: false }));
}
function makeBall() { return { x: BALL_START.x, y: BALL_START.y, vx: 0, vy: 0, inGutter: false, atRest: true }; }

// ── FRAME STATE MACHINE ───────────────────────────────────────────────────────
function needsFreshRack(frameRolls) {
  if (frameRolls.length === 0) return true;
  const sum = frameRolls.reduce((a, b) => a + b, 0);
  return sum % 10 === 0;
}
function isFrameOver(frameIdx, frameRolls) {
  const sum = frameRolls.reduce((a, b) => a + b, 0);
  if (frameIdx < 9) {
    if (frameRolls.length === 1 && frameRolls[0] === 10) return true;
    return frameRolls.length >= 2;
  }
  if (frameRolls.length === 2 && sum < 10) return true;
  return frameRolls.length >= 3;
}
function computeScores(frames) {
  const rolls = frames.flat();
  let rollIdx = 0, cumulative = 0;
  const out = [];
  for (let f = 0; f < 10; f++) {
    const fr = frames[f];
    if (!fr || fr.length === 0) { out.push(null); continue; }
    if (f === 9) {
      if (!isFrameOver(9, fr)) { out.push(null); continue; }
      const frameScore = fr.reduce((a, b) => a + b, 0);
      cumulative += frameScore;
      out.push({ frameScore, cumulative });
      continue;
    }
    if (fr[0] === 10) {
      if (rolls.length < rollIdx + 3) { out.push(null); continue; }
      const frameScore = 10 + rolls[rollIdx + 1] + rolls[rollIdx + 2];
      cumulative += frameScore; out.push({ frameScore, cumulative }); rollIdx += 1;
    } else if (fr.length >= 2 && fr[0] + fr[1] === 10) {
      if (rolls.length < rollIdx + 3) { out.push(null); continue; }
      const frameScore = 10 + rolls[rollIdx + 2];
      cumulative += frameScore; out.push({ frameScore, cumulative }); rollIdx += 2;
    } else if (fr.length >= 2) {
      const frameScore = fr[0] + fr[1];
      cumulative += frameScore; out.push({ frameScore, cumulative }); rollIdx += 2;
    } else {
      out.push(null);
    }
  }
  return out;
}
const rollSymbol = (roll, frameIdx, rollInFrame, frameRolls) => {
  if (roll === 10) return "X";
  if (rollInFrame > 0) {
    const prior = frameRolls.slice(0, rollInFrame).reduce((a, b) => a + b, 0);
    if (prior + roll === 10) return "/";
  }
  return roll === 0 ? "—" : String(roll);
};

const BOWL_TTS = `Welcome to Bowling. Drag your finger anywhere on the lane, pull back from the ball, and let go to roll — the further you pull back, the harder you'll throw. A dashed line shows exactly where the ball is heading. Knock down as many of the ten pins as you can. You get two rolls per frame, unless you strike all ten pins on your first roll. Ten frames make a full game, and the tenth frame gives you bonus rolls if you strike or spare. No clock, no penalty for a gutter ball — take all the time you need. Tap Start Game when you're ready.`;
const BOWL_BYE = `Great game — that's all ten frames. Reading the lane and lining up each roll takes real focus and patience. Come back whenever you'd like another game.`;

// ── PROJECTION (perspective lane view — mirrors the 3D feel of Table Pool) ────
function getProjection(w, h) {
  const marginX = w * 0.1, marginTop = h * 0.06, marginBottom = h * 0.06;
  const playableW = w - 2 * marginX, playableH = h - marginTop - marginBottom;
  const totalW = LANE_W + 2 * GUTTER_W;
  const unitScaleX = playableW / totalW / NEAR_SCALE;
  const scaleAt = y => FAR_SCALE + (NEAR_SCALE - FAR_SCALE) * (y / LANE_LEN);
  const tableToScreen = (x, y) => {
    const s = scaleAt(y);
    return { x: w / 2 + (x - totalW / 2) * unitScaleX * s, y: marginTop + (y / LANE_LEN) * playableH };
  };
  const screenToTable = (sx, sy) => {
    const t = (sy - marginTop) / playableH;
    const y = t * LANE_LEN;
    const s = scaleAt(y);
    const x = totalW / 2 + (sx - w / 2) / (unitScaleX * s);
    return { x: x - GUTTER_W, y };
  };
  return { tableToScreen: (x, y) => tableToScreen(x + GUTTER_W, y), screenToTable, scaleAt, unitScaleX };
}

// ── PHYSICS STEP ──────────────────────────────────────────────────────────────
function stepPhysics(ball, pins, dt) {
  const events = [];
  if (!ball.atRest) {
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < 0 || ball.x > LANE_W) ball.inGutter = true;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0) {
      const drop = Math.min(speed, FRICTION * dt);
      const scale = (speed - drop) / speed;
      ball.vx *= scale; ball.vy *= scale;
    }
    if (ball.y <= 6 || (Math.hypot(ball.vx, ball.vy) < MIN_SPEED)) { ball.vx = 0; ball.vy = 0; ball.atRest = true; }
  }
  const live = pins.filter(p => !p.down);
  for (const p of live) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 0) {
      const drop = Math.min(speed, PIN_FRICTION * dt);
      const scale = (speed - drop) / speed;
      p.vx *= scale; p.vy *= scale;
      if (speed - drop <= 0.01) { p.vx = 0; p.vy = 0; }
    }
  }
  if (!ball.inGutter && !ball.atRest) {
    for (const p of live) {
      const dx = p.x - ball.x, dy = p.y - ball.y, dist = Math.hypot(dx, dy), minD = BALL_R + PIN_R;
      if (dist > 0 && dist < minD) {
        const nx = dx / dist, ny = dy / dist, overlap = minD - dist;
        p.x += nx * overlap; p.y += ny * overlap;
        const relVel = (p.vx - ball.vx) * nx + (p.vy - ball.vy) * ny;
        if (relVel < 0) {
          const impulse = -(1 + REST_PIN) * relVel * 0.5;
          p.vx += impulse * nx * 1.4; p.vy += impulse * ny * 1.4;
          ball.vx -= impulse * nx * 0.15; ball.vy -= impulse * ny * 0.15;
          events.push({ type: "pin", num: p.num });
        }
      }
    }
  }
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), minD = PIN_R * 2;
      if (dist > 0 && dist < minD) {
        const nx = dx / dist, ny = dy / dist, overlap = minD - dist;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relVel < 0) {
          const impulse = -(1 + REST_PIN) * relVel * 0.5;
          a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny;
        }
      }
    }
  }
  return events;
}
function isSettled(ball, pins) {
  if (!ball.atRest) return false;
  return pins.filter(p => !p.down).every(p => Math.hypot(p.vx, p.vy) < 0.05);
}

// ── AUDIO (lightweight synthesis, no external samples) ────────────────────────
let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function createNoiseBuffer(ctx, duration) {
  const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
function noiseBurst(dur, { filterType = "bandpass", freq = 1200, q = 0.8, peak = 0.2 } = {}) {
  try {
    const ctx = getCtx(), t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = createNoiseBuffer(ctx, dur);
    const filt = ctx.createBiquadFilter(); filt.type = filterType; filt.frequency.value = freq; filt.Q.value = q;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(peak, t0); gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt).connect(gain); gain.connect(ctx.destination);
    src.start(t0); src.stop(t0 + dur + 0.01);
  } catch (e) { /* audio unavailable — game remains playable via visuals/TTS */ }
}
function tone(freq, { duration = 0.15, type = "sine", peak = 0.25, glideTo = null } = {}) {
  try {
    const ctx = getCtx(), t0 = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t0 + duration);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(t0 + duration + 0.02);
  } catch (e) { /* ignore */ }
}
function playRelease(power) { noiseBurst(0.09, { filterType: "lowpass", freq: 500 + power * 400, q: 0.6, peak: 0.12 + power * 0.1 }); }
function playPinHit() { noiseBurst(0.07, { filterType: "bandpass", freq: 1400 + Math.random() * 800, q: 1.1, peak: 0.22 }); tone(600 + Math.random() * 300, { duration: 0.05, type: "triangle", peak: 0.08 }); }
function playStrike() { tone(660, { duration: 0.3, type: "sine", peak: 0.28, glideTo: 990 }); noiseBurst(0.4, { filterType: "bandpass", freq: 1000, q: 0.5, peak: 0.14 }); }
function playGutter() { tone(120, { duration: 0.4, type: "sawtooth", peak: 0.1, glideTo: 60 }); }

// ── CANVAS DRAWING (procedural pixel-art sprites — flat colors, no gradients/blur) ──
const PIN_ROWS = [
  "....1....", "...111...", "...222...", "..11111..", "..11111..",
  ".1111111.", ".1111111.", ".1111111.", ".1111111.", ".1111111.",
  "..11111..", "..11111..", "..11111..", ".1111111.", ".1111111.", "..00000..",
];
const PIN_GRID = PIN_ROWS.map(row => row.split("").map(c => (c === "." ? null : +c)));
const BALL_PALETTE = [PX_INK, "#7dd3fc", "#3b6ea8", "#1e3a5f"];
function buildBallGrid(n) {
  const c0 = (n - 1) / 2, radius = n / 2;
  const grid = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const dist = Math.hypot(c - c0, r - c0);
      if (dist > radius - 0.4) { row.push(null); continue; }
      const ldist = Math.hypot(c - (c0 - 2.2), r - (c0 - 2.2));
      row.push(ldist < radius * 0.5 ? 1 : ldist < radius * 1.05 ? 2 : 3);
    }
    grid.push(row);
  }
  return grid;
}
const BALL_GRID = buildBallGrid(10);
function drawSprite(ctx, grid, palette, cx, cy, targetSize) {
  const rows = grid.length, cols = grid[0].length;
  const cell = Math.max(1, Math.round(targetSize / Math.max(rows, cols)));
  const originX = Math.round(cx - (cols * cell) / 2), originY = Math.round(cy - (rows * cell) / 2);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const idx = grid[r][c];
    if (idx === null) continue;
    ctx.fillStyle = palette[idx];
    ctx.fillRect(originX + c * cell, originY + r * cell, cell, cell);
  }
}
function drawPin(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = PX_INK;
  ctx.fillRect(Math.round(x - r), Math.round(y + r * 1.15), Math.round(r * 2), Math.max(1, Math.round(r * 0.35)));
  drawSprite(ctx, PIN_GRID, PX_PALETTE, x, y, r * 2.6);
  ctx.restore();
}
function drawBall(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = PX_INK;
  ctx.fillRect(Math.round(x - r * 0.9), Math.round(y + r * 0.8), Math.round(r * 1.8), Math.max(1, Math.round(r * 0.3)));
  drawSprite(ctx, BALL_GRID, BALL_PALETTE, x, y, r * 2.2);
  ctx.restore();
}

// ── SCOREBOARD ────────────────────────────────────────────────────────────────
function Scoreboard({ frames, scores, currentFrame }) {
  return (
    <div style={{ display: "flex", overflowX: "auto", gap: 3, marginBottom: 16, paddingBottom: 4 }}>
      {frames.map((fr, i) => {
        const sc = scores[i];
        const active = i === currentFrame;
        return (
          <div key={i} style={{ minWidth: i === 9 ? 66 : 48, background: active ? "#1e3a5f" : PX_PAPER, ...pixelBorder(active ? "#7dd3fc" : "#334155", 2), padding: "6px 4px", flexShrink: 0 }}>
            <p style={{ ...PixelLabel, color: LIGHT, fontSize: 11, textAlign: "center", margin: "0 0 4px" }}>{i + 1}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 4 }}>
              {(i === 9 ? [0, 1, 2] : [0, 1]).map(ri => {
                const roll = fr[ri];
                const sym = roll === undefined ? "" : rollSymbol(roll, i, ri, fr);
                return <span key={ri} style={{ ...PixelLabel, color: sym === "X" || sym === "/" ? GOLD : "#e2e8f0", fontSize: 16, minWidth: 12, textAlign: "center" }}>{sym}</span>;
              })}
            </div>
            <p style={{ ...PixelLabel, color: GOLD, fontSize: 15, textAlign: "center", margin: 0 }}>{sc ? sc.cumulative : "—"}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function BowlingGame({ onBack }) {
  const [screen, setScreen] = useState("home");
  const [frames, setFrames] = useState(() => Array.from({ length: 10 }, () => []));
  const [currentFrame, setCurrentFrame] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const canvasRef = useRef(null), hudRef = useRef(null), powerMeterRef = useRef(null);
  const ballRef = useRef(makeBall());
  const pinsRef = useRef(freshPins());
  const aimRef = useRef({ active: false, pointerId: null });
  const aimStateRef = useRef(null);
  const animatingRef = useRef(false), gameOverRef = useRef(false);
  const rafIdRef = useRef(null), lastTsRef = useRef(null);
  const rollEventsRef = useRef([]);
  const framesRef = useRef(frames);
  const currentFrameRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const rollCountRef = useRef(0);

  function draw() {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr), targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const proj = getProjection(w, h);
    const { tableToScreen, scaleAt, unitScaleX } = proj;

    const laneCorners = [[0, 0], [LANE_W, 0], [LANE_W, LANE_LEN], [0, LANE_LEN]].map(([x, y]) => tableToScreen(x, y));
    const gutterLCorners = [[-GUTTER_W, 0], [0, 0], [0, LANE_LEN], [-GUTTER_W, LANE_LEN]].map(([x, y]) => tableToScreen(x, y));
    const gutterRCorners = [[LANE_W, 0], [LANE_W + GUTTER_W, 0], [LANE_W + GUTTER_W, LANE_LEN], [LANE_W, LANE_LEN]].map(([x, y]) => tableToScreen(x, y));

    const drawPoly = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    drawPoly(gutterLCorners, PX_INK); drawPoly(gutterRCorners, PX_INK);
    const PLANKS = 20;
    for (let i = 0; i < PLANKS; i++) {
      const y0 = (i / PLANKS) * LANE_LEN, y1 = ((i + 1) / PLANKS) * LANE_LEN;
      const pts = [tableToScreen(0, y0), tableToScreen(LANE_W, y0), tableToScreen(LANE_W, y1), tableToScreen(0, y1)];
      drawPoly(pts, i % 2 === 0 ? "#c8956d" : "#b07d52");
    }
    ctx.lineWidth = Math.max(3, w * 0.008); ctx.strokeStyle = PX_INK;
    ctx.beginPath(); ctx.moveTo(laneCorners[0].x, laneCorners[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(laneCorners[i].x, laneCorners[i].y); ctx.closePath(); ctx.stroke();

    if (aimStateRef.current && !animatingRef.current) {
      const ball = ballRef.current;
      const { dirX, dirY } = aimStateRef.current;
      const t = dirY < -0.001 ? Math.min(ball.y / -dirY, 200) : 200;
      const dotSize = Math.max(3, Math.round(w * 0.008));
      const steps = 14;
      ctx.fillStyle = "#ffffff";
      for (let i = 1; i <= steps; i++) {
        const tt = (t * i) / steps;
        const sp = tableToScreen(ball.x + dirX * tt, ball.y + dirY * tt);
        ctx.fillRect(Math.round(sp.x - dotSize / 2), Math.round(sp.y - dotSize / 2), dotSize, dotSize);
      }
    }

    for (const p of pinsRef.current) {
      if (p.down) continue;
      const sp = tableToScreen(p.x, p.y);
      const r = PIN_R * unitScaleX * scaleAt(p.y);
      drawPin(ctx, sp.x, sp.y, r);
    }
    const ball = ballRef.current;
    const bsp = tableToScreen(ball.x, ball.y);
    const br = BALL_R * unitScaleX * scaleAt(Math.max(0, Math.min(LANE_LEN, ball.y)));
    drawBall(ctx, bsp.x, bsp.y, br);

    if (hudRef.current) {
      let top = bsp.y - br - 16, anchorBottom = true;
      if (top < 50) { top = bsp.y + br + 16; anchorBottom = false; }
      hudRef.current.style.left = `${Math.min(Math.max(bsp.x, 100), w - 100)}px`;
      hudRef.current.style.top = `${top}px`;
      hudRef.current.style.transform = anchorBottom ? "translate(-50%,-100%)" : "translate(-50%,0%)";
    }
    if (powerMeterRef.current) {
      if (aimStateRef.current && !animatingRef.current) {
        powerMeterRef.current.style.display = "flex";
        powerMeterRef.current.style.left = `${bsp.x}px`;
        powerMeterRef.current.style.top = `${bsp.y + br + 30}px`;
        const filled = Math.round(aimStateRef.current.power * 10);
        powerMeterRef.current.querySelectorAll(".seg").forEach((seg, i) => {
          seg.style.background = i < filled ? (i < 6 ? "#3ecf5b" : i < 8 ? GOLD : "#e2453c") : PX_INK;
        });
      } else {
        powerMeterRef.current.style.display = "none";
      }
    }
  }

  function setupFrame(frameIdx, frameRolls) {
    ballRef.current = makeBall();
    if (needsFreshRack(frameRolls)) pinsRef.current = freshPins();
    requestAnimationFrame(draw);
  }

  function resetGame() {
    framesRef.current = Array.from({ length: 10 }, () => []);
    setFrames(framesRef.current);
    currentFrameRef.current = 0; setCurrentFrame(0);
    rollCountRef.current = 0;
    gameOverRef.current = false;
    sessionStartRef.current = Date.now();
    setupFrame(0, []);
    setStatusMsg("Drag anywhere on the lane, pull back from the ball, and release to roll.");
  }

  function updatePointer(clientX, clientY) {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const proj = getProjection(rect.width, rect.height);
    const pt = proj.screenToTable(clientX - rect.left, clientY - rect.top);
    const ball = ballRef.current;
    const pullX = pt.x - ball.x, pullY = pt.y - ball.y, pullDist = Math.hypot(pullX, pullY);
    let dirX = 0, dirY = -1;
    if (pullDist > 0.001) { dirX = -pullX / pullDist; dirY = -pullY / pullDist; }
    if (dirY > -0.05) { dirY = -0.05; const len = Math.hypot(dirX, dirY) || 1; dirX /= len; dirY /= len; }
    const power = Math.min(pullDist, MAX_PULL) / MAX_PULL;
    aimStateRef.current = { dirX, dirY, power, pullDist };
    draw();
  }

  function pointerDown(e) {
    if (screen !== "game" || animatingRef.current || gameOverRef.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    aimRef.current = { active: true, pointerId: e.pointerId };
    updatePointer(e.clientX, e.clientY);
  }
  function pointerMove(e) {
    if (!aimRef.current.active || aimRef.current.pointerId !== e.pointerId) return;
    updatePointer(e.clientX, e.clientY);
  }
  function pointerUp(e) {
    if (!aimRef.current.active || aimRef.current.pointerId !== e.pointerId) return;
    aimRef.current.active = false;
    const aim = aimStateRef.current; aimStateRef.current = null;
    if (!aim || aim.pullDist < MIN_PULL_TO_FIRE) { draw(); return; }
    const ball = ballRef.current;
    const speed = aim.power * MAX_SHOT_SPEED;
    ball.vx = aim.dirX * speed; ball.vy = aim.dirY * speed; ball.atRest = false;
    playRelease(aim.power);
    rollEventsRef.current = [];
    startAnimation();
  }
  function pointerCancel(e) {
    if (!aimRef.current.active || aimRef.current.pointerId !== e.pointerId) return;
    aimRef.current.active = false; aimStateRef.current = null; draw();
  }

  function startAnimation() {
    if (animatingRef.current) return;
    animatingRef.current = true; lastTsRef.current = null;
    rafIdRef.current = requestAnimationFrame(loop);
  }
  function loop(ts) {
    if (lastTsRef.current == null) lastTsRef.current = ts;
    const dt = Math.min((ts - lastTsRef.current) / 1000, 0.032);
    lastTsRef.current = ts;
    const events = stepPhysics(ballRef.current, pinsRef.current, dt);
    rollEventsRef.current.push(...events);
    for (const ev of events) if (ev.type === "pin") playPinHit();
    draw();
    if (!isSettled(ballRef.current, pinsRef.current)) {
      rafIdRef.current = requestAnimationFrame(loop);
    } else {
      animatingRef.current = false;
      finalizeRoll();
    }
  }

  function finalizeRoll() {
    const wasGutter = ballRef.current.inGutter;
    let newlyDown = 0;
    for (const p of pinsRef.current) {
      if (p.down) continue;
      const disp = Math.hypot(p.x - p.ox, p.y - p.oy);
      if (disp > KNOCKDOWN_DIST) { p.down = true; newlyDown++; }
    }
    const pinsCount = wasGutter ? 0 : newlyDown;
    rollCountRef.current += 1;

    const fIdx = currentFrameRef.current;
    const newFrames = framesRef.current.map(f => [...f]);
    newFrames[fIdx] = [...newFrames[fIdx], pinsCount];
    framesRef.current = newFrames;
    setFrames(newFrames);

    const frameRolls = newFrames[fIdx];
    const over = isFrameOver(fIdx, frameRolls);

    if (pinsCount === 10) playStrike();
    else if (wasGutter) playGutter();

    let msg;
    if (wasGutter) msg = "Gutter ball — no pins this time. Line up your next roll.";
    else if (pinsCount === 10) msg = "Strike! All ten pins down! 🎉";
    else if (frameRolls.length === 2 && frameRolls[0] + frameRolls[1] === 10) msg = "Spare! You cleared the rest of the pins.";
    else msg = `${pinsCount} pin${pinsCount === 1 ? "" : "s"} down.`;
    setStatusMsg(msg);

    if (!over) {
      setupFrame(fIdx, frameRolls);
      return;
    }
    if (fIdx >= 9) {
      gameOverRef.current = true;
      const finalScores = computeScores(newFrames);
      finalizeSession(finalScores[9] ? finalScores[9].cumulative : 0);
      return;
    }
    const nextIdx = fIdx + 1;
    currentFrameRef.current = nextIdx; setCurrentFrame(nextIdx);
    setupFrame(nextIdx, []);
  }

  function finalizeSession(finalScore) {
    const dur = Date.now() - sessionStartRef.current;
    const stars = finalScore >= 120 ? 3 : finalScore >= 70 ? 2 : 1;
    postToAirtable("Bowling", {
      Date: new Date().toLocaleDateString(), Time: new Date().toLocaleTimeString(), Game: "Bowling", Type: "session",
      Score: stars, Total: 3, "Duration (s)": Math.round(dur / 1000), "Final Score": finalScore, Rolls: rollCountRef.current,
      "Ease Rating": "—", "Enjoy Rating": "—", Platform: detectPlatform(),
    });
    setStatusMsg(`Game over — final score: ${finalScore}`);
    setTimeout(() => speakText(BOWL_BYE, null, null), 1600);
    setTimeout(() => setScreen("done"), 2400);
  }

  useEffect(() => {
    if (screen !== "game") return;
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    draw();
    return () => window.removeEventListener("resize", handleResize);
  }, [screen]);

  useEffect(() => () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  const scores = computeScores(frames);

  // ── SCREENS ─────────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div style={center}><div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 12 }}>🎳</div>
      <PixelHeading size={36} style={{ marginBottom: 10 }}>Bowling</PixelHeading>
      <p style={{ fontSize: 22, color: LIGHT, fontWeight: "bold", marginBottom: 20, lineHeight: 1.5, marginTop: 16 }}>Drag to aim, pull back to power your throw, and knock down all ten pins — a classic game of aim and timing.</p>
      <div style={{ ...pixelCard, textAlign: "left" }}>
        <p style={{ ...PixelLabel, color: "#7dd3fc", fontSize: 17, marginBottom: 14 }}>HOW TO PLAY</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[["👆", "Drag anywhere on the lane, pull back from the ball"], ["🎯", "Release to roll — further pull-back means more power"], ["🎳", "Two rolls per frame, unless you strike on the first"], ["🏆", "Ten frames make a full game — strikes and spares earn bonus points"]].map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: BG, ...pixelBorder("#334155", 2), padding: "12px 16px" }}><span style={{ fontSize: 28 }}>{icon}</span><span style={{ color: "#e2e8f0", fontSize: 19, fontWeight: "bold" }}>{text}</span></div>
          ))}
        </div>
      </div>
      <AudioButton text={BOWL_TTS} large />
      <p style={{ color: LIGHT, fontSize: 19, fontWeight: "bold", marginBottom: 20 }}>We'll walk you through everything before you start.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={() => { resetGame(); setScreen("game"); }} style={pixelBtn}>Start Game →</button>
        <button onClick={onBack} style={pixelBtnGhost}>← Hub</button>
      </div>
      <p style={{ color: LIGHT, fontSize: 19, fontWeight: "bold" }}>No time limits · No penalties · 10 frames per game</p>
    </div></div>
  );

  if (screen === "done") return <FeedbackScreen onBack={onBack} gameName="Bowling" table="Bowling" />;

  return (
    <div style={{ ...page, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ maxWidth: 940, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button onClick={onBack} style={pixelBtnGhost}>← Hub</button>
          <div style={{ textAlign: "center" }}>
            <span style={{ ...PixelLabel, color: GOLD, fontSize: 17 }}>🎳 Frame {Math.min(currentFrame + 1, 10)} of 10</span>
            <span style={{ ...PixelLabel, color: LIGHT, fontSize: 16, display: "block" }}>Score: {(() => { const done = scores.filter(Boolean); return done.length ? done[done.length - 1].cumulative : 0; })()}</span>
          </div>
          <button onClick={resetGame} style={pixelBtnGhost}>🔄 Reset</button>
        </div>
        <Scoreboard frames={frames} scores={scores} currentFrame={currentFrame} />
        <div style={{ position: "relative", width: "100%", maxWidth: 620, aspectRatio: "3/4", margin: "0 auto 16px", touchAction: "none", background: "#000", imageRendering: "pixelated", ...pixelBorder(PX_INK, 5) }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none", imageRendering: "pixelated" }}
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel} onPointerLeave={pointerCancel} />
          <div ref={hudRef} style={{ position: "absolute", pointerEvents: "none", background: "rgba(15,23,42,0.92)", ...pixelBorder(GOLD, 3), padding: "8px 14px", color: "#fff", ...PixelLabel, fontSize: 16, whiteSpace: "nowrap", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{statusMsg}</div>
          <div ref={powerMeterRef} style={{ position: "absolute", display: "none", gap: 2, width: 130, height: 16, background: PX_PAPER, ...pixelBorder("#334155", 2), transform: "translate(-50%,0)", pointerEvents: "none" }}>
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="seg" style={{ flex: 1, height: "100%", background: PX_INK }} />)}
          </div>
        </div>
        <p style={{ color: LIGHT, fontSize: 17, fontWeight: "bold", textAlign: "center" }}>Drag anywhere on the lane, pull back from the ball, and release to roll.</p>
      </div>
    </div>
  );
}
