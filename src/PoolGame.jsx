import { useState, useEffect, useRef } from "react";
import { BG, GOLD, LIGHT, page, center, goldBtn, card, StarRow, AudioButton, FeedbackScreen, postToAirtable, speakText, detectPlatform } from "./shared.jsx";

// ── TABLE / PHYSICS CONSTANTS ────────────────────────────────────────────────
const TABLE_W = 200, TABLE_H = 100;
const BALL_R = 4.6, POCKET_R_BASE = 7.5;
const FAR_SCALE = 0.8, NEAR_SCALE = 1.0;
const MAX_PULL = 55, MAX_SHOT_SPEED = 150, MIN_PULL_TO_FIRE = 4;
const FRICTION_BASE = 1.05, MIN_SPEED = 3;
const REST_CUSHION = 0.75, REST_BALL = 0.9;
const CUE_START = { x: TABLE_W / 2, y: 78 };
const POCKETS = [
  { x: 0, y: 0 }, { x: TABLE_W, y: 0 }, { x: 0, y: TABLE_H }, { x: TABLE_W, y: TABLE_H },
  { x: TABLE_W / 2, y: 0 }, { x: TABLE_W / 2, y: TABLE_H },
];

const DIFFICULTIES = {
  easy:   { label: "Easy",   count: 3, pocketMult: 1.35, frictionMult: 1.25, desc: "3 balls · larger pockets · settles quickly" },
  medium: { label: "Medium", count: 6, pocketMult: 1.15, frictionMult: 1.1,  desc: "6 balls · a bit more challenge" },
  hard:   { label: "Hard",   count: 9, pocketMult: 1.0,  frictionMult: 1.0,  desc: "9 balls · full challenge" },
};

// Colorblind-safe, high-contrast "neon" ball styling — numeral + solid/stripe is the primary identifier, hue is secondary.
const BALL_STYLES = [
  { color: "#FF5A36", stripe: false }, // 1
  { color: "#00E5FF", stripe: true  }, // 2
  { color: "#FF2DD1", stripe: false }, // 3
  { color: "#F5E94A", stripe: true  }, // 4
  { color: "#39FF6A", stripe: false }, // 5
  { color: "#4DA6FF", stripe: true  }, // 6
  { color: "#FF9F1C", stripe: false }, // 7
  { color: GOLD,       stripe: true  }, // 8
  { color: "#E066B3", stripe: false }, // 9
];

const POOL_TTS = `Welcome to Table Pool. Drag your finger anywhere on the table, pull back from the cue ball, and let go to take your shot — the further you pull back, the harder you'll hit. A thick line shows exactly where the ball will go, and a rising tone helps you line up a pocket by ear. If you'd rather play without that, there's an audio guide toggle below to turn it off any time. Sink the balls in order, starting with number one. There's no clock, and no penalty for missing — take all the time you need. Choose your difficulty below, then tap Start Game when you're ready.`;
const POOL_BYE = `Well played — the table's clear. That's real spatial thinking and planning, shot after shot. Come back whenever you'd like another game.`;

// ── PROJECTION (elevated overhead view) ──────────────────────────────────────
function getProjection(w, h) {
  const marginX = w * 0.07, marginTop = h * 0.09, marginBottom = h * 0.09;
  const playableW = w - 2 * marginX, playableH = h - marginTop - marginBottom;
  const unitScaleX = playableW / TABLE_W / NEAR_SCALE;
  const scaleAt = y => FAR_SCALE + (NEAR_SCALE - FAR_SCALE) * (y / TABLE_H);
  const tableToScreen = (x, y) => {
    const s = scaleAt(y);
    return { x: w / 2 + (x - TABLE_W / 2) * unitScaleX * s, y: marginTop + (y / TABLE_H) * playableH };
  };
  const screenToTable = (sx, sy) => {
    const t = (sy - marginTop) / playableH;
    const y = t * TABLE_H;
    const s = scaleAt(y);
    const x = TABLE_W / 2 + (sx - w / 2) / (unitScaleX * s);
    return { x, y };
  };
  return { tableToScreen, screenToTable, scaleAt, unitScaleX };
}

// ── RACK / GEOMETRY ───────────────────────────────────────────────────────────
function makeRack(count) {
  const balls = []; const spacing = BALL_R * 2.05; const apexY = 26; const cx = TABLE_W / 2;
  let n = 1, row = 0;
  outer: while (n <= count) {
    const inRow = row + 1, rowY = apexY + row * spacing * 0.87;
    for (let i = 0; i < inRow; i++) {
      if (n > count) break outer;
      const style = BALL_STYLES[(n - 1) % BALL_STYLES.length];
      balls.push({ id: `b${n}`, isCue: false, num: n, x: cx + (i - row / 2) * spacing, y: rowY, vx: 0, vy: 0, r: BALL_R, color: style.color, stripe: style.stripe });
      n++;
    }
    row++;
  }
  return balls;
}
function makeCue() { return { id: "cue", isCue: true, num: 0, x: CUE_START.x, y: CUE_START.y, vx: 0, vy: 0, r: BALL_R }; }

function computeAimEndpoint(cueX, cueY, dirX, dirY, balls) {
  const margin = BALL_R;
  let tX = Infinity, tY = Infinity;
  if (dirX > 0) tX = (TABLE_W - margin - cueX) / dirX; else if (dirX < 0) tX = (margin - cueX) / dirX;
  if (dirY > 0) tY = (TABLE_H - margin - cueY) / dirY; else if (dirY < 0) tY = (margin - cueY) / dirY;
  let best = Math.min(tX, tY);
  for (const b of balls) {
    if (b.isCue) continue;
    const ox = cueX - b.x, oy = cueY - b.y;
    const bcoef = 2 * (dirX * ox + dirY * oy);
    const ccoef = ox * ox + oy * oy - (BALL_R + b.r) * (BALL_R + b.r);
    const disc = bcoef * bcoef - 4 * ccoef;
    if (disc >= 0) {
      const t = (-bcoef - Math.sqrt(disc)) / 2;
      if (t > 0.01 && t < best) best = t;
    }
  }
  if (!isFinite(best) || best < 0) best = 0;
  return { x: cueX + dirX * best, y: cueY + dirY * best };
}

// ── PHYSICS STEP ──────────────────────────────────────────────────────────────
function stepPhysics(balls, dt, pocketR, frictionRate) {
  const events = [];
  const decay = Math.exp(-frictionRate * dt);
  for (const b of balls) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.vx *= decay; b.vy *= decay;
    if (Math.hypot(b.vx, b.vy) < MIN_SPEED) { b.vx = 0; b.vy = 0; }
  }
  const sunk = [];
  for (const b of balls) {
    for (const p of POCKETS) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < pocketR) { sunk.push(b); events.push({ type: "pocket", num: b.num, isCue: b.isCue }); break; }
    }
  }
  const sunkIds = new Set(sunk.map(b => b.id));
  const live = balls.filter(b => !sunkIds.has(b.id));
  for (const b of live) {
    let bounced = false;
    if (b.x - b.r < 0) { b.x = b.r; b.vx = -b.vx * REST_CUSHION; bounced = true; }
    else if (b.x + b.r > TABLE_W) { b.x = TABLE_W - b.r; b.vx = -b.vx * REST_CUSHION; bounced = true; }
    if (b.y - b.r < 0) { b.y = b.r; b.vy = -b.vy * REST_CUSHION; bounced = true; }
    else if (b.y + b.r > TABLE_H) { b.y = TABLE_H - b.r; b.vy = -b.vy * REST_CUSHION; bounced = true; }
    if (bounced) { const spd = Math.hypot(b.vx, b.vy); if (spd > 5) events.push({ type: "cushion", speed: spd }); }
  }
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b2 = live[j];
      const dx = b2.x - a.x, dy = b2.y - a.y, dist = Math.hypot(dx, dy), minD = a.r + b2.r;
      if (dist > 0 && dist < minD) {
        const nx = dx / dist, ny = dy / dist, overlap = minD - dist;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b2.x += nx * overlap / 2; b2.y += ny * overlap / 2;
        const relVel = (b2.vx - a.vx) * nx + (b2.vy - a.vy) * ny;
        if (relVel < 0) {
          const impulse = -(1 + REST_BALL) * relVel / 2;
          a.vx -= impulse * nx; a.vy -= impulse * ny; b2.vx += impulse * nx; b2.vy += impulse * ny;
          const impactSpeed = Math.abs(relVel);
          if (impactSpeed > 5) events.push({ type: "collision", num: a.isCue ? b2.num : a.num, impactSpeed });
        }
      }
    }
  }
  return { events, live };
}

// ── AUDIO (Web Audio tones — no navigator.vibrate on iOS Safari, so audio carries all "feel" cues) ──
let audioCtx = null, humOsc = null, humGain = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(freq, { duration = 0.15, type = "sine", peak = 0.25, attack = 0.005, glideTo = null } = {}) {
  try {
    const ctx = getCtx(), t0 = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t0 + duration);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(t0 + duration + 0.02);
  } catch (e) { /* audio unavailable — game remains playable via visuals/TTS */ }
}
function createNoiseBuffer(ctx, duration) {
  const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
const ballFreq = n => 220 * Math.pow(2, ((n || 1) - 1) / 7);
function playCueStrike(power) {
  try {
    const ctx = getCtx(), t0 = ctx.currentTime;
    // bright noise "crack" — the cue tip's transient contact with the ball
    const crackDur = 0.045;
    const noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = createNoiseBuffer(ctx, crackDur);
    const bandpass = ctx.createBiquadFilter(); bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1700 + power * 1600, t0); bandpass.Q.value = 0.85;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.24 + power * 0.3, t0);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t0 + crackDur);
    noiseSrc.connect(bandpass).connect(crackGain).connect(ctx.destination);
    noiseSrc.start(t0); noiseSrc.stop(t0 + crackDur + 0.01);
  } catch (e) { /* ignore */ }
  // low body "thump" underneath so it doesn't sound thin
  tone(95, { duration: 0.07, type: "sine", peak: 0.1 + 0.14 * power, glideTo: 55 });
}
const playCollision = (num, impactSpeed) => tone(ballFreq(num), { duration: 0.09, type: "triangle", peak: Math.min(0.35, 0.12 + impactSpeed / 300) });
const playCushion = speed => tone(140, { duration: 0.11, type: "sine", peak: Math.min(0.25, 0.08 + speed / 400), glideTo: 100 });
const playPocketSink = num => tone(ballFreq(num), { duration: 0.22, type: "sine", peak: 0.3, glideTo: ballFreq(num) * 2 });
function startHum() {
  try {
    const ctx = getCtx();
    humOsc = ctx.createOscillator(); humOsc.type = "sine";
    humGain = ctx.createGain(); humGain.gain.setValueAtTime(0, ctx.currentTime);
    humGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
    humOsc.frequency.setValueAtTime(260, ctx.currentTime);
    humOsc.connect(humGain).connect(ctx.destination);
    humOsc.start();
  } catch (e) { /* ignore */ }
}
function updateHum(freq) { if (!humOsc) return; try { humOsc.frequency.setTargetAtTime(freq, getCtx().currentTime, 0.05); } catch (e) {} }
function stopHum() {
  if (!humOsc) return;
  try { const ctx = getCtx(); humGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08); humOsc.stop(ctx.currentTime + 0.1); } catch (e) {}
  humOsc = null; humGain = null;
}
function humFreqForAim(cueX, cueY, dirX, dirY) {
  let minDist = Infinity;
  for (const p of POCKETS) {
    const wx = p.x - cueX, wy = p.y - cueY, t = wx * dirX + wy * dirY;
    if (t <= 0) continue;
    const cx = cueX + dirX * t, cy = cueY + dirY * t, d = Math.hypot(p.x - cx, p.y - cy);
    if (d < minDist) minDist = d;
  }
  const threshold = 26, prox = Math.max(0, 1 - Math.min(minDist, threshold) / threshold);
  return 260 + prox * 500;
}

// ── CANVAS DRAWING ────────────────────────────────────────────────────────────
function drawBall(ctx, x, y, r, b) {
  ctx.save();
  ctx.shadowColor = b.isCue ? "#ffffff" : b.color; ctx.shadowBlur = r * 0.9;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = b.isCue ? "#f5faff" : b.color; ctx.fill();
  ctx.shadowBlur = 0;
  if (!b.isCue && b.stripe) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x - r, y - r * 0.34, r * 2, r * 0.68);
    ctx.restore();
  }
  ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = "#0b0f14"; ctx.stroke();
  if (!b.isCue) {
    ctx.beginPath(); ctx.arc(x, y, r * 0.48, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.06); ctx.strokeStyle = "#0b0f14"; ctx.stroke();
    ctx.fillStyle = "#0b0f14"; ctx.font = `bold ${Math.max(9, r * 0.75)}px Georgia, serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(b.num), x, y + r * 0.02);
  }
  ctx.restore();
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function PoolGame({ onBack }) {
  const [screen, setScreen] = useState("home");
  const [difficulty, setDifficulty] = useState("easy");
  const [targetNum, setTargetNum] = useState(1);
  const [sunkNumbers, setSunkNumbers] = useState([]);
  const [shots, setShots] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [audioGuideOn, setAudioGuideOn] = useState(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("poolAudioGuide") : null;
    return saved === null ? true : saved === "true";
  });

  const canvasRef = useRef(null), hudRef = useRef(null), powerMeterRef = useRef(null);
  const ballsRef = useRef([]);
  const aimRef = useRef({ active: false, pointerId: null });
  const aimStateRef = useRef(null);
  const animatingRef = useRef(false), roundOverRef = useRef(false);
  const rafIdRef = useRef(null), lastTsRef = useRef(null);
  const shotEventsRef = useRef([]);
  const sunkNumbersRef = useRef([]), targetRef = useRef(1), shotsCountRef = useRef(0);
  const sessionStartRef = useRef(Date.now());

  const ballCount = DIFFICULTIES[difficulty].count;

  function draw() {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr), targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const proj = getProjection(w, h);
    const { tableToScreen, scaleAt, unitScaleX } = proj;

    const corners = [[0, 0], [TABLE_W, 0], [TABLE_W, TABLE_H], [0, TABLE_H]].map(([x, y]) => tableToScreen(x, y));
    ctx.beginPath(); ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath(); ctx.fillStyle = "#000000"; ctx.fill();
    ctx.lineWidth = Math.max(3, w * 0.006); ctx.strokeStyle = "#e2e8f0"; ctx.stroke();

    for (const p of POCKETS) {
      const sp = tableToScreen(p.x, p.y);
      const r = POCKET_R_BASE * DIFFICULTIES[difficulty].pocketMult * unitScaleX * scaleAt(p.y);
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#050505"; ctx.fill();
      ctx.lineWidth = Math.max(2, r * 0.18); ctx.strokeStyle = GOLD; ctx.stroke();
    }

    if (aimStateRef.current && !animatingRef.current) {
      const cue = ballsRef.current.find(b => b.isCue);
      if (cue) {
        const { dirX, dirY } = aimStateRef.current;
        const end = computeAimEndpoint(cue.x, cue.y, dirX, dirY, ballsRef.current);
        const p1 = tableToScreen(cue.x, cue.y), p2 = tableToScreen(end.x, end.y);
        ctx.save();
        ctx.setLineDash([w * 0.018, w * 0.012]);
        ctx.lineWidth = Math.max(3, w * 0.008);
        ctx.strokeStyle = "#ffffff"; ctx.shadowColor = GOLD; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.restore();
      }
    }

    for (const b of ballsRef.current) {
      const sp = tableToScreen(b.x, b.y);
      const r = b.r * unitScaleX * scaleAt(b.y);
      drawBall(ctx, sp.x, sp.y, r, b);
    }

    const cue = ballsRef.current.find(b => b.isCue);
    if (cue) {
      const sp = tableToScreen(cue.x, cue.y);
      const r = cue.r * unitScaleX * scaleAt(cue.y);
      if (hudRef.current) {
        let top = sp.y - r - 14, anchorBottom = true;
        if (top < 60) { top = sp.y + r + 14; anchorBottom = false; }
        hudRef.current.style.left = `${Math.min(Math.max(sp.x, 100), w - 100)}px`;
        hudRef.current.style.top = `${top}px`;
        hudRef.current.style.transform = anchorBottom ? "translate(-50%,-100%)" : "translate(-50%,0%)";
      }
      if (powerMeterRef.current) {
        if (aimStateRef.current && !animatingRef.current) {
          powerMeterRef.current.style.display = "block";
          powerMeterRef.current.style.left = `${sp.x}px`;
          powerMeterRef.current.style.top = `${sp.y + r + 34}px`;
          powerMeterRef.current.querySelector(".fill").style.width = `${Math.round(aimStateRef.current.power * 100)}%`;
        } else {
          powerMeterRef.current.style.display = "none";
        }
      }
    }
  }

  function setupTable(diffKey) {
    const diff = DIFFICULTIES[diffKey];
    ballsRef.current = [...makeRack(diff.count), makeCue()];
    sunkNumbersRef.current = []; setSunkNumbers([]);
    targetRef.current = 1; setTargetNum(1);
    shotsCountRef.current = 0; setShots(0);
    sessionStartRef.current = Date.now();
    roundOverRef.current = false;
    setStatusMsg(`Sink the 1 ball first — drag anywhere on the table to aim.`);
    requestAnimationFrame(draw);
  }

  function updatePointer(clientX, clientY) {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const proj = getProjection(rect.width, rect.height);
    const pt = proj.screenToTable(clientX - rect.left, clientY - rect.top);
    const cue = ballsRef.current.find(b => b.isCue); if (!cue) return;
    const pullX = pt.x - cue.x, pullY = pt.y - cue.y, pullDist = Math.hypot(pullX, pullY);
    let dirX = 0, dirY = -1;
    if (pullDist > 0.001) { dirX = -pullX / pullDist; dirY = -pullY / pullDist; }
    const power = Math.min(pullDist, MAX_PULL) / MAX_PULL;
    aimStateRef.current = { dirX, dirY, power, pullDist };
    if (audioGuideOn) updateHum(humFreqForAim(cue.x, cue.y, dirX, dirY));
    draw();
  }

  function pointerDown(e) {
    if (screen !== "game" || animatingRef.current || roundOverRef.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    aimRef.current = { active: true, pointerId: e.pointerId };
    if (audioGuideOn) startHum();
    updatePointer(e.clientX, e.clientY);
  }
  function pointerMove(e) {
    if (!aimRef.current.active || aimRef.current.pointerId !== e.pointerId) return;
    updatePointer(e.clientX, e.clientY);
  }
  function pointerUp(e) {
    if (!aimRef.current.active || aimRef.current.pointerId !== e.pointerId) return;
    aimRef.current.active = false;
    stopHum();
    const aim = aimStateRef.current; aimStateRef.current = null;
    if (!aim || aim.pullDist < MIN_PULL_TO_FIRE) { draw(); return; }
    const cue = ballsRef.current.find(b => b.isCue); if (!cue) return;
    const speed = aim.power * MAX_SHOT_SPEED;
    cue.vx = aim.dirX * speed; cue.vy = aim.dirY * speed;
    playCueStrike(aim.power);
    shotsCountRef.current += 1; setShots(shotsCountRef.current);
    shotEventsRef.current = [];
    startAnimation();
  }
  function pointerCancel(e) {
    if (!aimRef.current.active || aimRef.current.pointerId !== e.pointerId) return;
    aimRef.current.active = false; stopHum(); aimStateRef.current = null; draw();
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
    const diff = DIFFICULTIES[difficulty];
    const pocketR = POCKET_R_BASE * diff.pocketMult;
    const frictionRate = FRICTION_BASE * diff.frictionMult;
    const { events, live } = stepPhysics(ballsRef.current, dt, pocketR, frictionRate);
    ballsRef.current = live;
    shotEventsRef.current.push(...events);
    for (const ev of events) {
      if (ev.type === "collision") playCollision(ev.num, ev.impactSpeed);
      else if (ev.type === "cushion") playCushion(ev.speed);
      else if (ev.type === "pocket") playPocketSink(ev.num);
    }
    draw();
    const moving = live.some(b => b.vx !== 0 || b.vy !== 0);
    if (moving) { rafIdRef.current = requestAnimationFrame(loop); }
    else { animatingRef.current = false; finalizeShot(shotEventsRef.current); shotEventsRef.current = []; }
  }

  function finalizeShot(events) {
    const prevTarget = targetRef.current;
    const sunkEvents = events.filter(e => e.type === "pocket");
    const cueSunk = sunkEvents.some(e => e.isCue);
    const newlySunkNums = sunkEvents.filter(e => !e.isCue).map(e => e.num);
    let sunkList = sunkNumbersRef.current;
    if (newlySunkNums.length) { sunkList = [...sunkList, ...newlySunkNums]; sunkNumbersRef.current = sunkList; setSunkNumbers(sunkList); }
    if (cueSunk) ballsRef.current = [...ballsRef.current, makeCue()];

    const remaining = [];
    for (let n = 1; n <= ballCount; n++) if (!sunkList.includes(n)) remaining.push(n);
    const newTarget = remaining.length ? Math.min(...remaining) : null;
    setTargetNum(newTarget); targetRef.current = newTarget;
    draw();

    let msg;
    if (remaining.length === 0) {
      msg = "🎉 Table cleared — every ball is in!";
      setStatusMsg(msg); roundOverRef.current = true;
      if (audioGuideOn) speakText(msg, null, null);
      finalizeSession();
      return;
    }
    if (newlySunkNums.includes(prevTarget)) msg = `Nice shot! The ${prevTarget} ball is in. Aim for the ${newTarget} ball next.`;
    else if (cueSunk) msg = "The cue ball went in — no penalty, it's back on the table. Aim when you're ready.";
    else if (newlySunkNums.length) msg = `That wasn't the ${prevTarget} ball, but no penalty — the ${prevTarget} ball is still what you're after.`;
    else msg = `Line up your next shot for the ${prevTarget} ball.`;
    setStatusMsg(msg);
    if (audioGuideOn) speakText(msg, null, null);
  }

  function finalizeSession() {
    const dur = Date.now() - sessionStartRef.current;
    const shotsN = shotsCountRef.current;
    const stars = shotsN <= ballCount + 2 ? 3 : shotsN <= ballCount + 5 ? 2 : 1;
    postToAirtable("Table Pool", {
      Date: new Date().toLocaleDateString(), Time: new Date().toLocaleTimeString(), Game: "Table Pool", Type: "session",
      Score: stars, Total: 3, "Duration (s)": Math.round(dur / 1000), Shots: shotsN, "Balls Sunk": ballCount,
      Difficulty: DIFFICULTIES[difficulty].label, "Ease Rating": "—", "Enjoy Rating": "—", Platform: detectPlatform(),
    });
    setTimeout(() => speakText(POOL_BYE, null, null), 1800);
    setTimeout(() => setScreen("done"), 2600);
  }

  useEffect(() => {
    if (screen !== "game") return;
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    draw();
    return () => window.removeEventListener("resize", handleResize);
  }, [screen, difficulty]);

  useEffect(() => () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    stopHum();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    try { localStorage.setItem("poolAudioGuide", String(audioGuideOn)); } catch (e) {}
    if (!audioGuideOn) stopHum();
  }, [audioGuideOn]);

  // ── SCREENS ─────────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div style={center}><div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 12 }}>🎱</div>
      <h1 style={{ fontSize: 36, fontWeight: "bold", color: GOLD, marginBottom: 10 }}>Table Pool</h1>
      <p style={{ fontSize: 22, color: LIGHT, fontWeight: "bold", marginBottom: 20, lineHeight: 1.5 }}>Drag to aim, plan your shot, and clear the table — a game of spatial reasoning and patience.</p>
      <div style={{ ...card, textAlign: "left", marginBottom: 20 }}>
        <p style={{ color: "#7dd3fc", fontSize: 17, fontWeight: "bold", marginBottom: 14 }}>CHOOSE YOUR DIFFICULTY</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(DIFFICULTIES).map(([key, d]) => {
            const active = difficulty === key;
            return (<button key={key} onClick={() => setDifficulty(key)} style={{ background: active ? GOLD : "#0f172a", color: active ? BG : "#e2e8f0", border: `2px solid ${active ? GOLD : "#334155"}`, borderRadius: 14, padding: "16px 18px", fontSize: 19, fontWeight: "bold", textAlign: "left", cursor: "pointer" }}>{d.label} — <span style={{ fontWeight: "normal" }}>{d.desc}</span></button>);
          })}
        </div>
      </div>
      <div style={{ ...card, textAlign: "left", marginBottom: 20 }}>
        <p style={{ color: "#7dd3fc", fontSize: 17, fontWeight: "bold", marginBottom: 8 }}>AUDIO GUIDE</p>
        <p style={{ color: LIGHT, fontSize: 17, fontWeight: "bold", marginBottom: 12 }}>A rising tone while you aim, plus spoken updates after each shot. You can turn this off any time — the ball, cue, and pocket sounds stay on either way.</p>
        <button onClick={() => setAudioGuideOn(v => !v)} style={{ background: audioGuideOn ? GOLD : "#0f172a", color: audioGuideOn ? BG : "#e2e8f0", border: `2px solid ${audioGuideOn ? GOLD : "#334155"}`, borderRadius: 14, padding: "16px 18px", fontSize: 19, fontWeight: "bold", cursor: "pointer", width: "100%" }}>{audioGuideOn ? "🔊 Audio Guide: On — tap to turn off" : "🔇 Audio Guide: Off — tap to turn on"}</button>
      </div>
      <AudioButton text={POOL_TTS} large />
      <p style={{ color: LIGHT, fontSize: 19, fontWeight: "bold", marginBottom: 20 }}>We'll walk you through everything before you start.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={() => { setupTable(difficulty); setScreen("game"); }} style={goldBtn}>Start Game →</button>
        <button onClick={onBack} style={{ background: "#1e293b", color: "#7dd3fc", fontSize: 18, fontWeight: "bold", padding: "18px 28px", borderRadius: 16, border: "2px solid #334155", cursor: "pointer" }}>← Hub</button>
      </div>
      <p style={{ color: LIGHT, fontSize: 19, fontWeight: "bold" }}>No time limits · No penalties · Drag anywhere to aim</p>
    </div></div>
  );

  if (screen === "done") return <FeedbackScreen onBack={onBack} gameName="Table Pool" table="Table Pool" />;

  return (
    <div style={{ ...page, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ maxWidth: 940, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: "transparent", color: "#64748b", border: "1px solid #334155", borderRadius: 10, padding: "10px 18px", fontSize: 16, cursor: "pointer" }}>← Hub</button>
          <div style={{ textAlign: "center" }}>
            <span style={{ color: GOLD, fontSize: 17, fontWeight: "bold" }}>{DIFFICULTIES[difficulty].label} · 🎯 Target: {targetNum ?? "—"}</span>
            <span style={{ color: LIGHT, fontSize: 16, fontWeight: "bold", display: "block" }}>Shots: {shots} · Sunk: {sunkNumbers.length}/{ballCount}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setAudioGuideOn(v => !v)} aria-label="Toggle audio guide" style={{ background: "#1e293b", color: LIGHT, border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>{audioGuideOn ? "🔊" : "🔇"}</button>
            <button onClick={() => setupTable(difficulty)} style={{ background: "#1e293b", color: LIGHT, border: "1px solid #334155", borderRadius: 10, padding: "10px 18px", fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>🔄 Reset</button>
          </div>
        </div>
        <div style={{ position: "relative", width: "100%", maxWidth: 900, aspectRatio: "2/1", margin: "0 auto 16px", borderRadius: 20, overflow: "hidden", touchAction: "none", background: "#000", border: "2px solid #334155" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel} onPointerLeave={pointerCancel} />
          <div ref={hudRef} style={{ position: "absolute", pointerEvents: "none", background: "rgba(15,23,42,0.9)", border: `2px solid ${GOLD}`, borderRadius: 12, padding: "8px 14px", color: "#fff", fontSize: 16, fontWeight: "bold", whiteSpace: "nowrap", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{statusMsg}</div>
          <div ref={powerMeterRef} style={{ position: "absolute", display: "none", width: 120, height: 14, background: "#1e293b", border: "2px solid #334155", borderRadius: 8, transform: "translate(-50%,0)", overflow: "hidden", pointerEvents: "none" }}>
            <div className="fill" style={{ height: "100%", width: "0%", background: `linear-gradient(90deg,#22c55e,${GOLD},#ef4444)` }} />
          </div>
        </div>
        <p style={{ color: LIGHT, fontSize: 17, fontWeight: "bold", textAlign: "center" }}>Drag anywhere on the table, pull back from the cue ball, and release to shoot.</p>
      </div>
    </div>
  );
}
