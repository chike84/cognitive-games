import { useState, useEffect, useRef } from "react";
import { BG, GOLD, LIGHT, page, center, goldBtn, card, StarRow, AudioButton, FeedbackScreen, postToAirtable, speakText, detectPlatform } from "./shared.jsx";

// ── TABLE / PHYSICS CONSTANTS ────────────────────────────────────────────────
const TABLE_W = 200, TABLE_H = 100;
const BALL_R = 4.6, POCKET_R_BASE = 7.5;
const FAR_SCALE = 0.8, NEAR_SCALE = 1.0;
const MAX_PULL = 55, MAX_SHOT_SPEED = 150, MIN_PULL_TO_FIRE = 4;
const FRICTION_BASE = 1.05, MIN_SPEED = 3;
const REST_CUSHION = 0.75, REST_BALL = 0.9;
// Spin (english/follow/draw) — a simplified, feel-tuned approximation, not textbook rigid-body mechanics.
// spinTop/spinSide are velocity-equivalent scalars (same units as vx/vy), not literal angular velocity.
const SLIDE_FRICTION = 90, ROLL_FRICTION = 16;
const SPIN_SIDE_DECAY = 0.65, CURVE_FACTOR = 0.011, CUSHION_SPIN_KICK = 0.06, THROW_FACTOR = 0.16;
const SPIN_TOP_FACTOR = 0.68, SPIN_SIDE_FACTOR = 0.42;
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

// AI opponent shot-selection is a geometric heuristic (best makable pocket for the target ball, with
// obstruction checks), not a learned/trained model. Difficulty is simulated with aim/power error and
// how often the AI picks its best option vs. a worse one — not by literally seeing less of the table.
const AI_DIFFICULTIES = {
  beginner:     { label: "Beginner",     aimErrorDeg: 11,  powerNoise: 0.30, bestShotChance: 0.45, desc: "Makes plenty of mistakes — a relaxed, forgiving match" },
  intermediate: { label: "Intermediate", aimErrorDeg: 5,   powerNoise: 0.15, bestShotChance: 0.75, desc: "Solid, fairly consistent shot-making" },
  hard:         { label: "Hard",         aimErrorDeg: 1.5, powerNoise: 0.06, bestShotChance: 0.95, desc: "Rarely misses a good shot — a real challenge" },
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

const POOL_TTS = `Welcome to Table Pool. Drag your finger anywhere on the table, pull back from the cue ball, and let go to take your shot — the further you pull back, the harder you'll hit. A thick line shows exactly where the ball will go, and a rising tone helps you line up a pocket by ear. If you'd rather play without that, there's an audio guide toggle below to turn it off any time. Once you're in a game, you'll also see spin buttons below the table — tap Follow or Draw to make the cue ball roll forward or pull back after it hits another ball, or Left or Right to curve its path. Leave them on Center for a plain, straightforward shot. Sink the balls in order, starting with number one. There's no clock, and no penalty for missing — take all the time you need. You can also play solo or against an opponent — if you choose an opponent, you'll take turns: sinking your ball keeps your turn, missing passes it over, and whoever sinks the very last ball wins. Choose your options below, then tap Start Game when you're ready.`;
const POOL_BYE = `Well played — the table's clear. That's real spatial thinking and planning, shot after shot. Come back whenever you'd like another game.`;
const POOL_BYE_WIN = `Great match — you win! That's real shot-making under pressure. Come back whenever you'd like a rematch.`;
const POOL_BYE_LOSE = `Good match — the opponent takes this one. Every game sharpens your eye. Come back whenever you're ready to try again.`;

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
      balls.push({ id: `b${n}`, isCue: false, num: n, x: cx + (i - row / 2) * spacing, y: rowY, vx: 0, vy: 0, spinTop: 0, spinSide: 0, r: BALL_R, color: style.color, stripe: style.stripe });
      n++;
    }
    row++;
  }
  return balls;
}
function makeCue() { return { id: "cue", isCue: true, num: 0, x: CUE_START.x, y: CUE_START.y, vx: 0, vy: 0, spinTop: 0, spinSide: 0, r: BALL_R }; }

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

// ── AI OPPONENT ────────────────────────────────────────────────────────────────
// Is the straight segment (x1,y1)-(x2,y2) clear of every ball not in excludeIds, within clearRadius?
function segmentClearOfBalls(x1, y1, x2, y2, balls, excludeIds, clearRadius) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  if (len < 0.001) return true;
  const ux = dx / len, uy = dy / len;
  for (const b of balls) {
    if (excludeIds.has(b.id)) continue;
    const px = b.x - x1, py = b.y - y1;
    const t = Math.max(0, Math.min(len, px * ux + py * uy));
    const cx = x1 + ux * t, cy = y1 + uy * t;
    if (Math.hypot(b.x - cx, b.y - cy) < clearRadius) return false;
  }
  return true;
}
// Geometric heuristic, not a trained model: for each pocket, compute the "ghost ball" aim point that
// would send the target ball there, skip pockets with too sharp a cut or a blocked path, then rank the
// rest by cut angle + distance. Difficulty controls aim/power error and how often the best option is used.
function computeAIShot(balls, targetNum, aiDiffKey) {
  const cfg = AI_DIFFICULTIES[aiDiffKey];
  const cue = balls.find(b => b.isCue);
  const target = balls.find(b => !b.isCue && b.num === targetNum);
  if (!cue || !target) return null;
  const candidates = [];
  for (const p of POCKETS) {
    const pdx = p.x - target.x, pdy = p.y - target.y, pdist = Math.hypot(pdx, pdy);
    if (pdist < 0.01) continue;
    const pux = pdx / pdist, puy = pdy / pdist;
    const ghostX = target.x - pux * (BALL_R * 2), ghostY = target.y - puy * (BALL_R * 2);
    const cdx = ghostX - cue.x, cdy = ghostY - cue.y, cdist = Math.hypot(cdx, cdy);
    if (cdist < 0.01) continue;
    const cux = cdx / cdist, cuy = cdy / cdist;
    const cutAngle = Math.acos(Math.max(-1, Math.min(1, cux * pux + cuy * puy)));
    if (cutAngle > Math.PI * 0.47) continue; // ~85°, near-impossible cut — skip
    if (!segmentClearOfBalls(cue.x, cue.y, ghostX, ghostY, balls, new Set([cue.id, target.id]), BALL_R * 1.8)) continue;
    if (!segmentClearOfBalls(target.x, target.y, p.x, p.y, balls, new Set([target.id, cue.id]), BALL_R * 1.6)) continue;
    candidates.push({ dirX: cux, dirY: cuy, cdist, pdist, score: -cutAngle * 2 - (cdist + pdist) * 0.01 });
  }
  candidates.sort((a, b) => b.score - a.score);
  let chosen;
  if (candidates.length === 0) {
    const dx = target.x - cue.x, dy = target.y - cue.y, dist = Math.hypot(dx, dy) || 1;
    chosen = { dirX: dx / dist, dirY: dy / dist, cdist: dist, pdist: 40 };
  } else if (candidates.length === 1 || Math.random() < cfg.bestShotChance) {
    chosen = candidates[0];
  } else {
    chosen = candidates[1 + Math.floor(Math.random() * (candidates.length - 1))];
  }
  const errRad = (Math.random() * 2 - 1) * cfg.aimErrorDeg * Math.PI / 180;
  const cosE = Math.cos(errRad), sinE = Math.sin(errRad);
  const dirX = chosen.dirX * cosE - chosen.dirY * sinE;
  const dirY = chosen.dirX * sinE + chosen.dirY * cosE;
  const totalDist = chosen.cdist + chosen.pdist;
  let power = Math.min(1, Math.max(0.35, totalDist / 140));
  power *= 1 + (Math.random() * 2 - 1) * cfg.powerNoise;
  power = Math.min(1, Math.max(0.25, power));
  return { dirX, dirY, power };
}

// ── PHYSICS STEP ──────────────────────────────────────────────────────────────
// Spin model: simplified/feel-tuned, not textbook rigid-body billiards. spinTop/spinSide are
// velocity-equivalent scalars. A struck ball starts "sliding" (fast friction converts speed<->spinTop
// toward each other); once they roughly match, it "rolls" (much gentler friction) — the classic
// skid-then-roll two-phase deceleration. spinSide gradually curves the path and decays via cloth friction.
function applySpinFriction(b, dt, frictionRate) {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed < 0.001 && Math.abs(b.spinTop) < 0.5 && Math.abs(b.spinSide) < 0.5) {
    b.vx = 0; b.vy = 0; b.spinTop = 0; b.spinSide = 0;
    return;
  }
  const dirX = speed > 0.001 ? b.vx / speed : 0;
  const dirY = speed > 0.001 ? b.vy / speed : 0;
  const slip = speed - b.spinTop;
  let newSpeed, newSpinTop;
  if (Math.abs(slip) > 1.2) {
    const rate = SLIDE_FRICTION * frictionRate * dt;
    newSpeed = Math.max(0, speed - Math.sign(slip) * Math.min(rate, Math.abs(slip)));
    newSpinTop = b.spinTop + Math.sign(slip) * Math.min(rate * 1.3, Math.abs(slip) * 0.9);
  } else {
    const rate = ROLL_FRICTION * frictionRate * dt;
    newSpeed = Math.max(0, speed - rate);
    const sign = Math.sign(b.spinTop) || 1;
    newSpinTop = sign * Math.max(0, Math.abs(b.spinTop) - rate);
  }
  let ndirX = dirX, ndirY = dirY;
  if (Math.abs(b.spinSide) > 0.5 && newSpeed > 0.5 && speed > 0.001) {
    const curveAmt = b.spinSide * CURVE_FACTOR * dt * 60;
    ndirX = dirX - dirY * curveAmt; ndirY = dirY + dirX * curveAmt;
    const nlen = Math.hypot(ndirX, ndirY) || 1;
    ndirX /= nlen; ndirY /= nlen;
  }
  b.vx = ndirX * newSpeed; b.vy = ndirY * newSpeed;
  b.spinTop = newSpinTop;
  b.spinSide *= Math.exp(-SPIN_SIDE_DECAY * dt);
  if (Math.abs(b.spinSide) < 0.05) b.spinSide = 0;
  if (newSpeed < MIN_SPEED && Math.abs(b.spinTop) < MIN_SPEED) { b.vx = 0; b.vy = 0; b.spinTop = 0; }
}
// A struck ball that ends a collision nearly stopped but still holding real spin visibly continues
// forward (follow, positive spinTop) or rolls back (draw, negative spinTop) — the dramatic case players
// expect from english. Deliberately only fires near a near-stop; normal shots are unaffected.
function applyDrawFollowKick(b, dirX, dirY) {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > 12 || Math.abs(b.spinTop) < 8) return;
  const kick = b.spinTop * 0.55;
  b.vx += dirX * kick; b.vy += dirY * kick;
  b.spinTop *= 0.35;
}
function stepPhysics(balls, dt, pocketR, frictionRate) {
  const events = [];
  for (const b of balls) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    applySpinFriction(b, dt, frictionRate);
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
    if (bounced) {
      const spd = Math.hypot(b.vx, b.vy);
      if (Math.abs(b.spinSide) > 1 && spd > 0.5) {
        const tx = -b.vy / spd, ty = b.vx / spd;
        b.vx += tx * b.spinSide * CUSHION_SPIN_KICK; b.vy += ty * b.spinSide * CUSHION_SPIN_KICK;
      }
      b.spinSide *= 0.75; b.spinTop *= 0.85;
      if (spd > 5) events.push({ type: "cushion", speed: spd });
    }
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
          const preASpeed = Math.hypot(a.vx, a.vy), preBSpeed = Math.hypot(b2.vx, b2.vy);
          const preADirX = preASpeed > 0.5 ? a.vx / preASpeed : nx, preADirY = preASpeed > 0.5 ? a.vy / preASpeed : ny;
          const preBDirX = preBSpeed > 0.5 ? b2.vx / preBSpeed : -nx, preBDirY = preBSpeed > 0.5 ? b2.vy / preBSpeed : -ny;
          const impulse = -(1 + REST_BALL) * relVel / 2;
          a.vx -= impulse * nx; a.vy -= impulse * ny; b2.vx += impulse * nx; b2.vy += impulse * ny;
          const tx = -ny, ty = nx;
          if (Math.abs(a.spinSide) > 1) { b2.vx += tx * a.spinSide * THROW_FACTOR; b2.vy += ty * a.spinSide * THROW_FACTOR; }
          if (Math.abs(b2.spinSide) > 1) { a.vx += tx * b2.spinSide * THROW_FACTOR; a.vy += ty * b2.spinSide * THROW_FACTOR; }
          applyDrawFollowKick(a, preADirX, preADirY);
          applyDrawFollowKick(b2, preBDirX, preBDirY);
          const impactSpeed = Math.abs(relVel);
          if (impactSpeed > 5) events.push({ type: "collision", num: a.isCue ? b2.num : a.num, impactSpeed });
        }
      }
    }
  }
  return { events, live };
}

// ── AUDIO (Web Audio synthesis — no navigator.vibrate on iOS Safari, so audio carries all "feel" cues) ──
// No external sample files are used (this environment's network policy blocks fetching third-party
// audio assets), so realism here comes from layered noise-based synthesis, a synthesized "room" reverb
// send, and per-hit random jitter (pitch/duration/gain) so repeated hits don't sound identical.
let audioCtx = null, humOsc = null, humGain = null, reverbSend = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function getReverbSend(ctx) {
  if (reverbSend) return reverbSend;
  const convolver = ctx.createConvolver();
  const dur = 0.9, decayPow = 3.2;
  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, decayPow);
  }
  convolver.buffer = ir;
  reverbSend = ctx.createGain(); reverbSend.gain.value = 0.16;
  reverbSend.connect(convolver).connect(ctx.destination);
  return reverbSend;
}
const jitter = (base, pct) => base * (1 + (Math.random() * 2 - 1) * pct);
function tone(freq, { duration = 0.15, type = "sine", peak = 0.25, attack = 0.005, glideTo = null } = {}) {
  try {
    const ctx = getCtx(), t0 = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t0 + duration);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain); gain.connect(ctx.destination); gain.connect(getReverbSend(ctx));
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
function noiseBurst(t0, dur, { filterType = "bandpass", freq = 1500, q = 0.85, peak = 0.2 } = {}) {
  try {
    const ctx = getCtx();
    const src = ctx.createBufferSource(); src.buffer = createNoiseBuffer(ctx, dur);
    const filt = ctx.createBiquadFilter(); filt.type = filterType; filt.frequency.value = freq; filt.Q.value = q;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(peak, t0); gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt).connect(gain); gain.connect(ctx.destination); gain.connect(getReverbSend(ctx));
    src.start(t0); src.stop(t0 + dur + 0.01);
  } catch (e) { /* ignore */ }
}
const ballFreq = n => 220 * Math.pow(2, ((n || 1) - 1) / 7);
function playCueStrike(power) {
  const ctx = getCtx(), t0 = ctx.currentTime;
  noiseBurst(t0, 0.045, { filterType: "bandpass", freq: jitter(1700 + power * 1600, 0.08), q: 0.85, peak: jitter(0.24 + power * 0.3, 0.1) });
  tone(jitter(95, 0.04), { duration: 0.07, type: "sine", peak: 0.1 + 0.14 * power, glideTo: 55 });
}
function playCollision(num, impactSpeed) {
  const ctx = getCtx(), t0 = ctx.currentTime;
  tone(jitter(ballFreq(num), 0.03), { duration: jitter(0.09, 0.15), type: "triangle", peak: Math.min(0.35, 0.12 + impactSpeed / 300) });
  noiseBurst(t0, 0.02, { filterType: "highpass", freq: jitter(3400, 0.15), q: 0.7, peak: Math.min(0.18, 0.05 + impactSpeed / 500) });
}
function playCushion(speed) {
  const ctx = getCtx(), t0 = ctx.currentTime;
  tone(jitter(130, 0.08), { duration: jitter(0.11, 0.15), type: "sine", peak: Math.min(0.25, 0.08 + speed / 400), glideTo: 95 });
  noiseBurst(t0, 0.06, { filterType: "lowpass", freq: 600, q: 0.6, peak: Math.min(0.16, 0.05 + speed / 500) });
}
function playPocketSink(num) {
  const ctx = getCtx(), t0 = ctx.currentTime, f = ballFreq(num);
  tone(f, { duration: 0.22, type: "sine", peak: 0.3, glideTo: f * 2 });
  noiseBurst(t0 + 0.05, 0.32, { filterType: "bandpass", freq: 480, q: 0.55, peak: 0.09 });
}
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

function SpinButton({ active, onClick, icon, label }) {
  return (<button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: 66, padding: "10px 4px", fontSize: 22, borderRadius: 12, background: active ? GOLD : "#1e293b", color: active ? BG : "#e2e8f0", border: `2px solid ${active ? GOLD : "#334155"}`, cursor: "pointer" }}>
    <span>{icon}</span>
    <span style={{ fontSize: 11, fontWeight: "bold" }}>{label}</span>
  </button>);
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
  const [strikeV, setStrikeV] = useState("center");
  const [strikeH, setStrikeH] = useState("center");
  const [mode, setMode] = useState("solo");
  const [aiDifficulty, setAiDifficulty] = useState("beginner");
  const [turn, setTurn] = useState("player");

  const canvasRef = useRef(null), hudRef = useRef(null), powerMeterRef = useRef(null);
  const ballsRef = useRef([]);
  const aimRef = useRef({ active: false, pointerId: null });
  const aimStateRef = useRef(null);
  const animatingRef = useRef(false), roundOverRef = useRef(false);
  const rafIdRef = useRef(null), lastTsRef = useRef(null);
  const shotEventsRef = useRef([]);
  const sunkNumbersRef = useRef([]), targetRef = useRef(1), shotsCountRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const turnRef = useRef("player"), lastSinkerRef = useRef(null);
  const aiTurnTimeoutsRef = useRef([]);

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

  function clearAITimeouts() {
    for (const id of aiTurnTimeoutsRef.current) clearTimeout(id);
    aiTurnTimeoutsRef.current = [];
  }

  function setupTable(diffKey) {
    clearAITimeouts();
    const diff = DIFFICULTIES[diffKey];
    ballsRef.current = [...makeRack(diff.count), makeCue()];
    sunkNumbersRef.current = []; setSunkNumbers([]);
    targetRef.current = 1; setTargetNum(1);
    shotsCountRef.current = 0; setShots(0);
    sessionStartRef.current = Date.now();
    roundOverRef.current = false;
    turnRef.current = "player"; setTurn("player");
    lastSinkerRef.current = null;
    setStrikeV("center"); setStrikeH("center");
    setStatusMsg(mode === "vsAI" ? `Your turn — sink the 1 ball first.` : `Sink the 1 ball first — drag anywhere on the table to aim.`);
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
    if (mode === "vsAI" && turnRef.current !== "player") return;
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
    const vOffset = strikeV === "top" ? 1 : strikeV === "bottom" ? -1 : 0;
    const hOffset = strikeH === "right" ? 1 : strikeH === "left" ? -1 : 0;
    cue.spinTop = vOffset * speed * SPIN_TOP_FACTOR;
    cue.spinSide = hOffset * speed * SPIN_SIDE_FACTOR;
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

  function scheduleAITurn() {
    setStatusMsg("Opponent's turn — lining up...");
    if (audioGuideOn) speakText("Opponent's turn.", null, null);
    const t1 = setTimeout(() => {
      const shot = computeAIShot(ballsRef.current, targetRef.current, aiDifficulty);
      if (!shot) return;
      aimStateRef.current = { dirX: shot.dirX, dirY: shot.dirY, power: shot.power, pullDist: MAX_PULL };
      draw();
      const t2 = setTimeout(() => fireAIShot(shot), 900);
      aiTurnTimeoutsRef.current.push(t2);
    }, 700);
    aiTurnTimeoutsRef.current.push(t1);
  }

  function fireAIShot(shot) {
    aimStateRef.current = null;
    const cue = ballsRef.current.find(b => b.isCue); if (!cue) return;
    const speed = shot.power * MAX_SHOT_SPEED;
    cue.vx = shot.dirX * speed; cue.vy = shot.dirY * speed;
    cue.spinTop = 0; cue.spinSide = 0;
    playCueStrike(shot.power);
    shotsCountRef.current += 1; setShots(shotsCountRef.current);
    shotEventsRef.current = [];
    startAnimation();
  }

  function finalizeShot(events) {
    const prevTarget = targetRef.current;
    const shooter = turnRef.current;
    const sunkEvents = events.filter(e => e.type === "pocket");
    const cueSunk = sunkEvents.some(e => e.isCue);
    const newlySunkNums = sunkEvents.filter(e => !e.isCue).map(e => e.num);
    let sunkList = sunkNumbersRef.current;
    if (newlySunkNums.length) {
      sunkList = [...sunkList, ...newlySunkNums]; sunkNumbersRef.current = sunkList; setSunkNumbers(sunkList);
      lastSinkerRef.current = shooter;
    }
    if (cueSunk) ballsRef.current = [...ballsRef.current, makeCue()];

    const remaining = [];
    for (let n = 1; n <= ballCount; n++) if (!sunkList.includes(n)) remaining.push(n);
    const newTarget = remaining.length ? Math.min(...remaining) : null;
    setTargetNum(newTarget); targetRef.current = newTarget;
    draw();

    const sunkTarget = newlySunkNums.includes(prevTarget);
    const continues = sunkTarget && !cueSunk;
    let msg;

    if (remaining.length === 0) {
      roundOverRef.current = true;
      if (mode === "vsAI") {
        const winner = lastSinkerRef.current;
        msg = winner === "player" ? "🏆 You win! You sank the last ball." : "Opponent wins this round — they sank the last ball.";
        setStatusMsg(msg);
        if (audioGuideOn) speakText(msg, null, null);
        finalizeSession(winner);
      } else {
        msg = "🎉 Table cleared — every ball is in!";
        setStatusMsg(msg);
        if (audioGuideOn) speakText(msg, null, null);
        finalizeSession(null);
      }
      return;
    }

    if (mode === "vsAI") {
      if (continues) {
        msg = shooter === "player"
          ? `Nice shot! The ${prevTarget} ball is in. Aim for the ${newTarget} ball next.`
          : `Opponent sinks the ${prevTarget} ball and keeps their turn — next up is the ${newTarget} ball.`;
        setStatusMsg(msg);
        if (audioGuideOn) speakText(msg, null, null);
        if (shooter === "ai") scheduleAITurn();
      } else {
        const nextTurn = shooter === "player" ? "ai" : "player";
        turnRef.current = nextTurn; setTurn(nextTurn);
        if (shooter === "player") {
          msg = cueSunk ? "Scratch — the cue ball went in. Opponent's turn." : newlySunkNums.length ? `That sinks the ${newlySunkNums[0]}, but not your target — opponent's turn.` : "Missed — opponent's turn.";
        } else {
          msg = cueSunk ? "Opponent scratched — the cue ball went in. Your turn!" : newlySunkNums.length ? "Opponent sank the wrong ball — your turn!" : "Opponent missed — your turn!";
        }
        setStatusMsg(msg);
        if (audioGuideOn) speakText(msg, null, null);
        if (nextTurn === "ai") scheduleAITurn();
      }
      return;
    }

    if (sunkTarget) msg = `Nice shot! The ${prevTarget} ball is in. Aim for the ${newTarget} ball next.`;
    else if (cueSunk) msg = "The cue ball went in — no penalty, it's back on the table. Aim when you're ready.";
    else if (newlySunkNums.length) msg = `That wasn't the ${prevTarget} ball, but no penalty — the ${prevTarget} ball is still what you're after.`;
    else msg = `Line up your next shot for the ${prevTarget} ball.`;
    setStatusMsg(msg);
    if (audioGuideOn) speakText(msg, null, null);
  }

  function finalizeSession(winner) {
    const dur = Date.now() - sessionStartRef.current;
    const shotsN = shotsCountRef.current;
    if (mode === "vsAI") {
      postToAirtable("Table Pool", {
        Date: new Date().toLocaleDateString(), Time: new Date().toLocaleTimeString(), Game: "Table Pool", Type: "session",
        Score: winner === "player" ? 1 : 0, Total: 1, "Duration (s)": Math.round(dur / 1000), Shots: shotsN, "Balls Sunk": ballCount,
        Difficulty: DIFFICULTIES[difficulty].label, Mode: "VS AI", "AI Difficulty": AI_DIFFICULTIES[aiDifficulty].label, Winner: winner,
        "Ease Rating": "—", "Enjoy Rating": "—", Platform: detectPlatform(),
      });
      setTimeout(() => speakText(winner === "player" ? POOL_BYE_WIN : POOL_BYE_LOSE, null, null), 1800);
    } else {
      const stars = shotsN <= ballCount + 2 ? 3 : shotsN <= ballCount + 5 ? 2 : 1;
      postToAirtable("Table Pool", {
        Date: new Date().toLocaleDateString(), Time: new Date().toLocaleTimeString(), Game: "Table Pool", Type: "session",
        Score: stars, Total: 3, "Duration (s)": Math.round(dur / 1000), Shots: shotsN, "Balls Sunk": ballCount,
        Difficulty: DIFFICULTIES[difficulty].label, Mode: "Solo", "Ease Rating": "—", "Enjoy Rating": "—", Platform: detectPlatform(),
      });
      setTimeout(() => speakText(POOL_BYE, null, null), 1800);
    }
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
    for (const id of aiTurnTimeoutsRef.current) clearTimeout(id);
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
        <p style={{ color: "#7dd3fc", fontSize: 17, fontWeight: "bold", marginBottom: 14 }}>GAME MODE</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => setMode("solo")} style={{ background: mode === "solo" ? GOLD : "#0f172a", color: mode === "solo" ? BG : "#e2e8f0", border: `2px solid ${mode === "solo" ? GOLD : "#334155"}`, borderRadius: 14, padding: "16px 18px", fontSize: 19, fontWeight: "bold", textAlign: "left", cursor: "pointer" }}>🎯 Solo — <span style={{ fontWeight: "normal" }}>Clear the table at your own pace</span></button>
          <button onClick={() => setMode("vsAI")} style={{ background: mode === "vsAI" ? GOLD : "#0f172a", color: mode === "vsAI" ? BG : "#e2e8f0", border: `2px solid ${mode === "vsAI" ? GOLD : "#334155"}`, borderRadius: 14, padding: "16px 18px", fontSize: 19, fontWeight: "bold", textAlign: "left", cursor: "pointer" }}>🤖 VS Opponent — <span style={{ fontWeight: "normal" }}>Take turns, sink the last ball to win</span></button>
        </div>
      </div>
      {mode === "vsAI" && (
        <div style={{ ...card, textAlign: "left", marginBottom: 20 }}>
          <p style={{ color: "#7dd3fc", fontSize: 17, fontWeight: "bold", marginBottom: 14 }}>OPPONENT DIFFICULTY</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(AI_DIFFICULTIES).map(([key, d]) => {
              const active = aiDifficulty === key;
              return (<button key={key} onClick={() => setAiDifficulty(key)} style={{ background: active ? GOLD : "#0f172a", color: active ? BG : "#e2e8f0", border: `2px solid ${active ? GOLD : "#334155"}`, borderRadius: 14, padding: "16px 18px", fontSize: 19, fontWeight: "bold", textAlign: "left", cursor: "pointer" }}>{d.label} — <span style={{ fontWeight: "normal" }}>{d.desc}</span></button>);
            })}
          </div>
        </div>
      )}
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
            <span style={{ color: GOLD, fontSize: 17, fontWeight: "bold" }}>
              {mode === "vsAI" ? (turn === "player" ? "🎯 Your Turn" : "🤖 Opponent's Turn") : DIFFICULTIES[difficulty].label} · Target: {targetNum ?? "—"}
            </span>
            <span style={{ color: LIGHT, fontSize: 16, fontWeight: "bold", display: "block" }}>
              {mode === "vsAI" ? `${DIFFICULTIES[difficulty].label} · vs ${AI_DIFFICULTIES[aiDifficulty].label} · ` : ""}Shots: {shots} · Sunk: {sunkNumbers.length}/{ballCount}
            </span>
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
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "#7dd3fc", fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 6, letterSpacing: 1 }}>SPIN — UP/DOWN</p>
            <div style={{ display: "flex", gap: 8 }}>
              <SpinButton active={strikeV === "top"} onClick={() => setStrikeV(strikeV === "top" ? "center" : "top")} icon="⬆️" label="Follow" />
              <SpinButton active={strikeV === "center"} onClick={() => setStrikeV("center")} icon="⏺" label="Center" />
              <SpinButton active={strikeV === "bottom"} onClick={() => setStrikeV(strikeV === "bottom" ? "center" : "bottom")} icon="⬇️" label="Draw" />
            </div>
          </div>
          <div>
            <p style={{ color: "#7dd3fc", fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 6, letterSpacing: 1 }}>SPIN — LEFT/RIGHT</p>
            <div style={{ display: "flex", gap: 8 }}>
              <SpinButton active={strikeH === "left"} onClick={() => setStrikeH(strikeH === "left" ? "center" : "left")} icon="⬅️" label="Left" />
              <SpinButton active={strikeH === "center"} onClick={() => setStrikeH("center")} icon="⏺" label="Center" />
              <SpinButton active={strikeH === "right"} onClick={() => setStrikeH(strikeH === "right" ? "center" : "right")} icon="➡️" label="Right" />
            </div>
          </div>
        </div>
        <p style={{ color: LIGHT, fontSize: 17, fontWeight: "bold", textAlign: "center" }}>Drag anywhere on the table, pull back from the cue ball, and release to shoot.</p>
      </div>
    </div>
  );
}
