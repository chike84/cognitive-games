import { useState, useEffect, useRef } from "react";

// ── Airtable ──────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

async function postToAirtable(table, fields) {
  try {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ fields }] }),
    });
  } catch (e) { console.error("Airtable error:", e); }
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "windows";
  return "other";
}

function getPreferredVoice(voices) {
  const p = detectPlatform();
  if (p === "ios") {
    return voices.find(v => /daniel/i.test(v.name) && /en/i.test(v.lang))
        || voices.find(v => /karen|samantha|moira/i.test(v.name))
        || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang === "en-US") || voices[0];
  }
  return voices.find(v => /gordon/i.test(v.name) && /en/i.test(v.lang))
      || voices.find(v => /gordon/i.test(v.name))
      || voices.find(v => /daniel|oliver|arthur/i.test(v.name))
      || voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang === "en-US") || voices[0];
}

function speakText(text, onStart, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.78; utt.pitch = 0.85; utt.volume = 1.0;
  const preferred = getPreferredVoice(voices);
  if (preferred) utt.voice = preferred;
  utt.onstart = onStart || (() => {});
  utt.onend   = onEnd   || (() => {});
  utt.onerror = onEnd   || (() => {});
  window.speechSynthesis.speak(utt);
}

// ── TTS Audio Button Component ────────────────────────────────────────────────
function AudioButton({ text, label = "Hear how to play", stopLabel = "Tap to stop", large = false }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const handle = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    speakText(text, () => setSpeaking(true), () => setSpeaking(false));
  };
  return (
    <button onClick={handle} style={{
      display:"flex", alignItems:"center", justifyContent:"center", gap:14,
      background: speaking ? "#1e3a5f" : "#fbbf24",
      color: speaking ? "#7dd3fc" : "#0f172a",
      border: `3px solid ${speaking ? "#7dd3fc" : "#f59e0b"}`,
      borderRadius:18, padding: large ? "24px 32px" : "18px 24px",
      fontSize: large ? 24 : 20, fontWeight:"bold", cursor:"pointer",
      width:"100%", boxShadow: speaking ? "none" : "0 4px 24px rgba(251,191,36,0.35)",
      transition:"all 0.2s", marginBottom:12,
    }}>
      <span style={{ fontSize: large ? 44 : 32 }}>{speaking ? "⏹️" : "🔊"}</span>
      <span style={{ textAlign:"left", lineHeight:1.4 }}>
        {speaking ? stopLabel : large
          ? <><span style={{ fontSize:24, fontWeight:"bold" }}>TAP HERE FIRST</span><br/><span style={{ fontSize:20, fontWeight:"bold" }}>{label}</span></>
          : label}
      </span>
    </button>
  );
}

function ReadAloudButton({ text }) {
  const [speaking, setSpeaking] = useState(false);
  const handle = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    speakText(text, () => setSpeaking(true), () => setSpeaking(false));
  };
  return (
    <button onClick={handle} style={{
      display:"flex", alignItems:"center", justifyContent:"center", gap:14,
      width:"100%", padding:"22px 20px",
      background: speaking ? "#1e3a5f" : "#0f172a",
      color: speaking ? "#7dd3fc" : "#e2e8f0",
      border: `3px solid ${speaking ? "#7dd3fc" : "#94a3b8"}`,
      borderRadius:14, fontSize:22, fontWeight:"bold",
      cursor:"pointer", transition:"all 0.2s", marginTop:12,
    }}>
      <span style={{ fontSize:36 }}>{speaking ? "⏹️" : "🔊"}</span>
      {speaking ? "Tap to stop" : "Read this to me"}
    </button>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const BG   = "#0f172a";
const GOLD = "#fbbf24";
const LIGHT = "#cbd5e1";
const page  = { background:BG, minHeight:"100vh", fontFamily:"Georgia,serif", color:"#e2e8f0", padding:"24px 16px" };
const center = { background:BG, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", fontFamily:"Georgia,serif" };
const goldBtn = { background:GOLD, color:BG, fontSize:22, fontWeight:"bold", padding:"20px 48px", borderRadius:16, border:"none", cursor:"pointer" };
const card = { background:"#1e293b", borderRadius:16, padding:"20px 24px", border:"1px solid #334155", marginBottom:16 };

// ── HUB ───────────────────────────────────────────────────────────────────────
const HUB_WELCOME = `Welcome to Cognitive Games. This is a suite of brain training games designed for sharp, curious minds. There are three games to choose from. The Animal Diagnosis Challenge — a clinical reasoning game using real veterinary cases. Pattern Completion — a visual logic puzzle across three difficulty levels. And Veterinary Word Association — where you find the clinical term that doesn't belong. Take your time, tap any game to get started, and enjoy.`;

function Hub({ onSelect }) {
  const games = [
    { id:"diagnosis", icon:"🐾", title:"Animal Diagnosis Challenge", desc:"Clinical reasoning across Dogs, Cats & Chickens", color:"#7dd3fc" },
    { id:"pattern",   icon:"🧩", title:"Pattern Completion",          desc:"Visual logic puzzles across 3 difficulty levels",  color:"#c084fc" },
    { id:"word",      icon:"🔤", title:"Veterinary Word Association",  desc:"Find the clinical term that doesn't belong",       color:"#86efac" },
  ];
  return (
    <div style={center}>
      <div style={{ maxWidth:660, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:72, marginBottom:16 }}>🧠</div>
        <h1 style={{ fontSize:38, fontWeight:"bold", color:GOLD, marginBottom:12, lineHeight:1.2 }}>Cognitive Games</h1>
        <p style={{ fontSize:22, color:LIGHT, fontWeight:"bold", marginBottom:28, lineHeight:1.6 }}>
          A suite of brain training games for sharp, curious minds — designed with care for players of all ages and abilities.
        </p>

        <AudioButton text={HUB_WELCOME} label="Hear how to play" large />
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold", marginBottom:28, textAlign:"center" }}>
          We'll walk you through everything before you start.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
          {games.map(g => (
            <button key={g.id} onClick={() => onSelect(g.id)} style={{
              background:"#1e293b", border:`2px solid ${g.color}44`, borderRadius:18,
              padding:"24px 28px", cursor:"pointer", textAlign:"left",
              display:"flex", alignItems:"center", gap:20,
            }}>
              <span style={{ fontSize:48 }}>{g.icon}</span>
              <div>
                <p style={{ color:g.color, fontSize:22, fontWeight:"bold", margin:"0 0 6px" }}>{g.title}</p>
                <p style={{ color:LIGHT, fontSize:18, margin:0, fontWeight:"bold" }}>{g.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold" }}>No time limits · Large text · 2 attempts per game</p>
      </div>
    </div>
  );
}

// ── ANIMAL DIAGNOSIS ──────────────────────────────────────────────────────────
const DIAG_WELCOME = `Hey, welcome. This is the Animal Diagnosis Challenge — and it's built for someone with real clinical experience. Each round gives you a patient — an animal — with a name, an age, and a set of presenting symptoms. Your job is to pick the right diagnosis from three options. You get two attempts per case, and after each one we'll walk through exactly what the diagnosis was and why. No time pressure at all. Take as long as you need. When you're ready, tap Begin Rounds.`;
const DIAG_THANKYOU = `Well done, Doctor. You've made it through all the cases. That kind of clinical recall doesn't just disappear — it stays with you. Come back whenever you're ready for another round.`;

const DIAG_CASES = [
  { species:"canine", animal:"🐕 Golden Retriever",  name:"Max",     age:"8 years",  sex:"Male (neutered)",   symptoms:["Excessive thirst and urination","Pot-bellied appearance","Symmetrical hair loss on flanks","Lethargy and muscle weakness"],        options:["Hypothyroidism","Hyperadrenocorticism (Cushing's Disease)","Diabetes Mellitus"],           correct:1, explanation:"Cushing's Disease classically presents with PU/PD, pot-belly from muscle wasting, and bilateral flank alopecia due to excess cortisol. A hallmark in older dogs." },
  { species:"canine", animal:"🐕 Dachshund",          name:"Fritz",   age:"6 years",  sex:"Male (neutered)",   symptoms:["Sudden onset paralysis of hind limbs","Crying out when back is touched","History of jumping off furniture","Inability to urinate"],  options:["Hip Dysplasia","Intervertebral Disc Disease (IVDD)","Degenerative Myelopathy"],             correct:1, explanation:"IVDD is the classic chondrodystrophic breed emergency. Rapid-onset paralysis, pain, and bladder dysfunction are the giveaways." },
  { species:"canine", animal:"🐕 Boxer",              name:"Rocky",   age:"7 years",  sex:"Male (intact)",     symptoms:["Rapid abdominal distension","Unproductive retching","Restlessness and hypersalivation","Pale gums and rapid heart rate"],          options:["Acute Pancreatitis","Gastric Dilatation-Volvulus (GDV)","Splenic Mass Rupture"],            correct:1, explanation:"GDV is a life-threatening emergency in deep-chested breeds. Gastric twisting traps gas and cuts off blood supply — cardiovascular collapse follows quickly without intervention." },
  { species:"canine", animal:"🐕 Labrador Retriever", name:"Bailey",  age:"9 years",  sex:"Female (spayed)",   symptoms:["Progressive hindlimb weakness","Difficulty rising from rest","Painful on lumbar palpation","Normal forelimb strength"],             options:["Degenerative Myelopathy","Lumbosacral Stenosis","Fibrocartilaginous Embolism"],             correct:1, explanation:"Lumbosacral stenosis is common in large breeds. Pelvic limb weakness and lumbosacral pain are key — often misattributed to hip dysplasia until a careful neuro exam is done." },
  { species:"canine", animal:"🐕 Cocker Spaniel",     name:"Buddy",   age:"5 years",  sex:"Male (neutered)",   symptoms:["Recurrent ear infections","Head shaking and scratching at ears","Brown waxy discharge from ear canal","Yeasty odour on skin"],       options:["Hypothyroidism","Atopic Dermatitis with Otitis Externa","Primary Seborrhoea"],             correct:1, explanation:"Atopic dermatitis in Cocker Spaniels frequently drives secondary otitis externa. Recurrent waxy discharge and yeasty odour point to allergic skin disease with Malassezia overgrowth." },
  { species:"canine", animal:"🐕 Border Collie",      name:"Finn",    age:"3 years",  sex:"Male (intact)",     symptoms:["Seizure lasting 90 seconds","Paddling limbs and jaw chomping","Disoriented for 20 minutes after","No prior illness or trauma"],     options:["Portosystemic Shunt","Idiopathic Epilepsy","Hypoglycaemia"],                               correct:1, explanation:"Idiopathic epilepsy is the most common cause of seizures in young to middle-aged dogs. Classic tonic-clonic episode with post-ictal confusion and no metabolic history." },
  { species:"canine", animal:"🐕 German Shepherd",    name:"Rex",     age:"11 years", sex:"Male (neutered)",   symptoms:["Gradual hindlimb ataxia over 12 months","Knuckling of rear paws","No spinal pain on palpation","Normal bladder and bowel"],         options:["Lumbosacral Stenosis","Degenerative Myelopathy","Fibrocartilaginous Embolism"],             correct:1, explanation:"Degenerative myelopathy — slow, painless progressive ataxia in hindlimbs with knuckling. No pain differentiates it from disc disease." },
  { species:"canine", animal:"🐕 Poodle",             name:"Coco",    age:"10 years", sex:"Female (spayed)",   symptoms:["Weight gain despite reduced appetite","Lethargy and cold intolerance","Facial hair thinning and skin thickening","Bradycardia on auscultation"], options:["Hyperadrenocorticism","Hypothyroidism","Chronic Kidney Disease"], correct:1, explanation:"Hypothyroidism presents with weight gain, cold intolerance, lethargy, and skin changes. Bradycardia is a helpful distinguishing feature from Cushing's." },
  { species:"feline", animal:"🐈 Domestic Shorthair", name:"Luna",    age:"12 years", sex:"Female (spayed)",   symptoms:["Weight loss despite increased appetite","Increased vocalization","Heart rate of 240 bpm","Fine muscle tremors"],                      options:["Hyperthyroidism","Chronic Kidney Disease","Inflammatory Bowel Disease"],                   correct:0, explanation:"Hyperthyroidism is the most common endocrine disorder in cats over 10. Weight loss with ravenous appetite and tachycardia — the contrast between eating well and losing weight is the giveaway." },
  { species:"feline", animal:"🐈 Maine Coon",          name:"Thor",    age:"5 years",  sex:"Male (neutered)",   symptoms:["Sudden hind limb paralysis","Cold and painful hind limbs","Absent femoral pulses bilaterally","Crying out in severe pain"],          options:["Spinal Cord Injury","Aortic Thromboembolism (Saddle Thrombus)","Feline Infectious Peritonitis"], correct:1, explanation:"Aortic thromboembolism — thrombus lodges at the aortic bifurcation. Bilateral cold limbs and absent pulses are unmistakable." },
  { species:"feline", animal:"🐈 Persian",             name:"Bella",   age:"8 years",  sex:"Female (spayed)",   symptoms:["Increased water intake and urination","Weight loss over several months","Unkempt coat and lethargy","Vomiting 2–3 times per week"],    options:["Hyperthyroidism","Chronic Kidney Disease","Diabetes Mellitus"],                           correct:1, explanation:"Chronic kidney disease in middle-aged to older cats — PU/PD, weight loss, vomiting, and a dull coat are the hallmarks." },
  { species:"feline", animal:"🐈 Siamese",             name:"Mochi",   age:"6 years",  sex:"Male (neutered)",   symptoms:["Straining in litter box with little output","Crying when urinating","Blood-tinged urine","Restlessness and frequent box visits"],    options:["Constipation","Feline Idiopathic Cystitis (FIC)","Urinary Tract Infection"],              correct:1, explanation:"FIC is the most common cause of lower urinary tract signs in young male cats. Straining, haematuria, and frequent attempts with little output — classic FIC." },
  { species:"chicken", animal:"🐔 Rhode Island Red",   name:"Rosie",   age:"2 years",  sex:"Female (hen)",      symptoms:["Egg-laying stopped suddenly","Distended abdomen with fluid wave","Lethargy and tail drooping","Laboured breathing when handled"],   options:["Egg Binding","Ascites (Water Belly)","Egg Yolk Peritonitis"],                              correct:2, explanation:"Egg Yolk Peritonitis — yolk enters the abdomen triggering inflammation. Fluid accumulation, cessation of laying, and dyspnoea are key signs." },
  { species:"chicken", animal:"🐔 Buff Orpington",     name:"Goldie",  age:"3 years",  sex:"Female (hen)",      symptoms:["Egg stuck visible at vent","Straining without passing egg","Hunched posture","Vent area swollen and reddened"],                      options:["Cloacal Prolapse","Egg Binding","Vent Gleet"],                                             correct:1, explanation:"Egg binding — visible egg at vent with straining and hunched posture. Warm soaking, lubrication, and calcium supplementation are first-line." },
  { species:"chicken", animal:"🐔 Leghorn",            name:"Pearl",   age:"1 year",   sex:"Female (hen)",      symptoms:["Sudden flock-wide respiratory distress","Gasping and tracheal rales","Nasal discharge and conjunctivitis","40% mortality in 48h"],   options:["Infectious Laryngotracheitis (ILT)","Newcastle Disease","Avian Influenza"],               correct:0, explanation:"ILT — herpesvirus causing acute severe respiratory distress. Gasping, bloody tracheal mucus, and rapid flock spread are hallmarks." },
  { species:"chicken", animal:"🐔 Sussex",             name:"Hazel",   age:"18 months",sex:"Female (hen)",      symptoms:["Pale comb and wattles","Watery green diarrhoea","Sudden drop in egg production","High fever — 110°F"],                              options:["Fowl Cholera","Coccidiosis","Infectious Bursal Disease"],                                   correct:0, explanation:"Fowl Cholera (Pasteurella multocida) — high fever, green diarrhoea, pale comb, and rapid flock spread. Prompt bacteriology is essential." },
  { species:"chicken", animal:"🐔 Silkie",             name:"Flossy",  age:"1 year",   sex:"Female (hen)",      symptoms:["Thickened crusty leg scales","Legs lifted repeatedly when walking","Scaly debris lifting from shanks","Bird pecks at own legs"],      options:["Bumblefoot","Scaly Leg Mite (Knemidocoptes mutans)","Dermatitis"],                         correct:1, explanation:"Scaly Leg Mite burrows under scales causing crusting and thickening. Silkies are especially prone. Treat with petroleum jelly or ivermectin." },
];

const DIAG_SC = {
  canine:  { banner:"#1e3a5f", accent:"#7dd3fc", label:"CANINE",  bg:"#080f1c" },
  feline:  { banner:"#3b0764", accent:"#c084fc", label:"FELINE",  bg:"#0e0718" },
  chicken: { banner:"#92400e", accent:"#fbbf24", label:"POULTRY", bg:"#1c1008" },
};
const DIAG_RANKS = [
  {title:"Veterinary Intern",minScore:0,icon:"🩺"},{title:"Junior Practitioner",minScore:4,icon:"📋"},
  {title:"General Practitioner",minScore:8,icon:"🔬"},{title:"Senior Clinician",minScore:13,icon:"🧬"},
  {title:"Clinical Specialist",minScore:18,icon:"🏅"},{title:"Consulting Veterinarian",minScore:23,icon:"🎖️"},
  {title:"Chief of Veterinary Medicine",minScore:28,icon:"🏆"},
];
const DIAG_BADGES = [
  { key:"canine",  label:"Canine Expert",     icon:"🐕", color:"#1e3a5f" },
  { key:"feline",  label:"Feline Expert",     icon:"🐈", color:"#4a1d96" },
  { key:"chicken", label:"Poultry Specialist",icon:"🐔", color:"#854d0e" },
];
const getDiagRank = s => { let r=DIAG_RANKS[0]; for(const x of DIAG_RANKS) if(s>=x.minScore) r=x; return r; };
const getBadges = hist => {
  const c={}; for(const {species,correct} of hist){if(!c[species])c[species]={ok:0,n:0};c[species].n++;if(correct)c[species].ok++;}
  return DIAG_BADGES.filter(b=>c[b.key]&&c[b.key].ok>=2);
};

function FeedbackScreen({ onDone, onBack, gameName, table }) {
  const [ease, setEase]   = useState(0);
  const [enjoy, setEnjoy] = useState(0);
  const [done, setDone]   = useState(false);
  const easeLabels  = ["Very Hard","Hard","OK","Easy","Very Easy"];
  const enjoyEmojis = ["😞","😐","🙂","😄","🤩"];
  const canSubmit = ease > 0 && enjoy > 0;
  const submit = () => {
    postToAirtable(table, { Date:new Date().toLocaleDateString(), Time:new Date().toLocaleTimeString(), Game:gameName, Type:"feedback", "Ease Rating":String(ease), "Enjoy Rating":String(enjoy) });
    setDone(true);
  };
  if (done) return (
    <div style={center}>
      <div style={{ maxWidth:580, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🙏</div>
        <h2 style={{ color:GOLD, fontSize:30, fontWeight:"bold", marginBottom:12 }}>Thank You!</h2>
        <p style={{ color:LIGHT, fontSize:20, fontWeight:"bold", marginBottom:28 }}>Your feedback has been saved.</p>
        <button onClick={onBack} style={goldBtn}>← Back to Hub</button>
      </div>
    </div>
  );
  return (
    <div style={center}>
      <div style={{ maxWidth:620, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:12 }}>📋</div>
        <h2 style={{ color:GOLD, fontSize:30, fontWeight:"bold", marginBottom:8 }}>Quick Feedback</h2>
        <p style={{ color:LIGHT, fontSize:20, fontWeight:"bold", marginBottom:28 }}>Two quick questions — tap your answer below.</p>
        <div style={card}>
          <p style={{ color:"#7dd3fc", fontSize:18, fontWeight:"bold", letterSpacing:1, marginBottom:8 }}>HOW EASY WAS THIS TO USE?</p>
          <p style={{ color:LIGHT, fontSize:18, fontWeight:"bold", marginBottom:16 }}>Tap a rating below</p>
          <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
            {easeLabels.map((label,i) => { const a=ease===i+1; return (
              <button key={i} onClick={()=>setEase(i+1)} style={{ background:a?GOLD:"#0f172a", color:a?BG:"#e2e8f0", border:`2px solid ${a?GOLD:"#334155"}`, borderRadius:14, padding:"16px 10px", fontSize:16, fontWeight:"bold", cursor:"pointer", minWidth:76 }}>
                {"⭐".repeat(i+1)}<br/><span style={{ fontSize:14, marginTop:4, display:"block" }}>{label}</span>
              </button>
            ); })}
          </div>
        </div>
        <div style={card}>
          <p style={{ color:"#7dd3fc", fontSize:18, fontWeight:"bold", letterSpacing:1, marginBottom:8 }}>HOW DID YOU ENJOY THIS GAME?</p>
          <p style={{ color:LIGHT, fontSize:18, fontWeight:"bold", marginBottom:16 }}>Tap an emoji below</p>
          <div style={{ display:"flex", justifyContent:"center", gap:14, flexWrap:"wrap" }}>
            {enjoyEmojis.map((emoji,i) => { const a=enjoy===i+1; return (
              <button key={i} onClick={()=>setEnjoy(i+1)} style={{ background:a?"#1e3a5f":"#0f172a", border:`3px solid ${a?"#7dd3fc":"#334155"}`, borderRadius:16, padding:"16px", fontSize:38, cursor:"pointer", minWidth:68, transform:a?"scale(1.18)":"scale(1)" }}>{emoji}</button>
            ); })}
          </div>
        </div>
        <button onClick={submit} disabled={!canSubmit} style={{ ...goldBtn, opacity:canSubmit?1:0.4, marginBottom:12 }}>Submit Feedback</button><br/>
        <button onClick={onBack} style={{ background:"transparent", color:"#64748b", border:"none", fontSize:17, cursor:"pointer", marginTop:8 }}>Skip →</button>
      </div>
    </div>
  );
}

function DiagnosisGame({ onBack }) {
  const [cases]    = useState(()=>[...DIAG_CASES].sort(()=>Math.random()-0.5));
  const [idx, setIdx]           = useState(0);
  const [tries, setTries]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore]       = useState(0);
  const [history, setHistory]   = useState([]);
  const [screen, setScreen]     = useState("game");
  const sessionStart = useRef(Date.now());
  const qTimes       = useRef([]);
  const qStart       = useRef(Date.now());

  const c = cases[idx], total = cases.length;
  const rank = getDiagRank(score);
  const sc = DIAG_SC[c?.species] || DIAG_SC.canine;
  const isLocked = selected !== null;

  const handleAnswer = i => {
    if (isLocked || tries.includes(i)) return;
    const nt = [...tries, i]; setTries(nt);
    const ok = i === c.correct;
    if (ok || nt.length >= 2) {
      setSelected(i);
      qTimes.current.push({ animal:c.animal, elapsed:Date.now()-qStart.current, correct:ok, tries:nt.length });
      const nh = [...history, { species:c.species, correct:ok }]; setHistory(nh);
      if (ok && nt.length === 1) setScore(s=>s+1);
    }
  };

  const handleNext = () => {
    qStart.current = Date.now();
    if (idx+1 >= total) { finalize(); setScreen("done"); return; }
    setIdx(i=>i+1); setTries([]); setSelected(null);
  };

  const finalize = () => {
    const dur = Date.now() - sessionStart.current;
    for (const q of qTimes.current) {
      postToAirtable("Animal Diagnosis", { Date:new Date().toLocaleDateString(), Time:new Date().toLocaleTimeString(), Game:"Animal Diagnosis", Type:"question", Label:q.animal, Correct:q.correct?"Yes":"No", Tries:q.tries, "Elapsed (s)":Math.round(q.elapsed/1000) });
    }
    postToAirtable("Animal Diagnosis", { Date:new Date().toLocaleDateString(), Time:new Date().toLocaleTimeString(), Game:"Animal Diagnosis", Type:"session", Score:score, Total:total, "Duration (s)":Math.round(dur/1000), Answered:qTimes.current.length, "Drop-Off":"No", "Drop-Off At":"—", "Ease Rating":"—", "Enjoy Rating":"—", Platform:detectPlatform() });
    setTimeout(() => speakText(DIAG_THANKYOU, null, null), 700);
  };

  const fb = () => {
    if (!isLocked && tries.length===1) return {bg:"#78350f",border:"#f59e0b",tc:"#fde68a",title:"⚠️ Not quite — one more try!",body:null};
    if (isLocked && tries.includes(c.correct)) return {bg:"#14532d",border:"#22c55e",tc:"#bbf7d0",title:tries.length===1?"✅ Correct Diagnosis!":"✅ Correct on second try!",body:c.explanation};
    if (isLocked) return {bg:"#7f1d1d",border:"#ef4444",tc:"#fecaca",title:`❌ Correct: ${c.options[c.correct]}`,body:c.explanation};
    return null;
  };
  const f = fb();

  if (screen==="done") return <FeedbackScreen onBack={onBack} gameName="Animal Diagnosis" table="Animal Diagnosis"/>;

  const btnCol = i => {
    if (isLocked && i===c.correct) return {bg:"#14532d",text:"#bbf7d0",border:"#22c55e"};
    if (tries.includes(i)&&i!==c.correct) return {bg:"#7f1d1d",text:"#fecaca",border:"#ef4444"};
    if (isLocked) return {bg:"#1e293b",text:"#64748b",border:"#334155"};
    return {bg:"#1e3a5f",text:"#e2e8f0",border:"#3b82f6"};
  };

  return (
    <div style={{...page, display:"flex", flexDirection:"column", alignItems:"center"}}>
      <div style={{ maxWidth:700, width:"100%" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <button onClick={onBack} style={{ background:"transparent", color:"#64748b", border:"1px solid #334155", borderRadius:10, padding:"10px 18px", fontSize:16, cursor:"pointer" }}>← Hub</button>
          <div style={{ textAlign:"right" }}>
            <span style={{ color:GOLD, fontSize:18, fontWeight:"bold" }}>{rank.icon} {rank.title}</span>
            <span style={{ color:LIGHT, fontSize:18, fontWeight:"bold", display:"block" }}>Score: {score}</span>
          </div>
        </div>
        <div style={{ background:"#1e293b", borderRadius:8, height:10, marginBottom:24 }}>
          <div style={{ background:GOLD, height:10, borderRadius:8, width:`${(idx/total)*100}%`, transition:"width 0.4s" }}/>
        </div>

        {/* Patient card */}
        <div style={{ borderRadius:22, overflow:"hidden", marginBottom:20, border:`2px solid ${sc.accent}44` }}>
          <div style={{ background:sc.banner, padding:"10px 20px", display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:sc.accent, fontSize:15, fontWeight:"bold", letterSpacing:2 }}>{sc.label}</span>
            <span style={{ color:sc.accent, fontSize:15 }}>Case {idx+1} of {total}</span>
          </div>
          <div style={{ background:`radial-gradient(ellipse at center,${sc.banner}99 0%,${sc.bg} 70%)`, padding:"28px 20px 20px", textAlign:"center" }}>
            <div style={{ fontSize:88, marginBottom:8 }}>{c.animal.split(" ")[0]}</div>
            <h2 style={{ fontSize:28, color:sc.accent, fontWeight:"bold", margin:"0 0 12px" }}>{c.animal.split(" ").slice(1).join(" ")}</h2>
            <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
              {[`👤 ${c.name}`,`🎂 ${c.age}`,`⚕ ${c.sex}`].map((t,i)=>(
                <span key={i} style={{ background:`${sc.accent}22`, color:sc.accent, borderRadius:20, padding:"8px 18px", fontSize:18, fontWeight:"bold" }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ background:"#111827", padding:"18px 22px 20px" }}>
            <p style={{ color:sc.accent, fontSize:15, fontWeight:"bold", letterSpacing:2, marginBottom:14 }}>PRESENTING SYMPTOMS</p>
            {c.symptoms.map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"flex-start", marginBottom:12, background:"#1e293b", borderRadius:10, padding:"12px 14px", border:`1px solid ${sc.accent}22` }}>
                <span style={{ color:sc.accent, fontSize:18, marginRight:12, flexShrink:0 }}>▸</span>
                <span style={{ color:"#e2e8f0", fontSize:20, lineHeight:1.5, fontWeight:"bold" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Question */}
        <p style={{ color:"#7dd3fc", fontSize:21, fontWeight:"bold", textAlign:"center", marginBottom:10 }}>WHAT IS YOUR DIAGNOSIS?</p>
        {!isLocked && tries.length===0 && <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold", textAlign:"center", marginBottom:14 }}>You have 2 attempts per case</p>}
        {!isLocked && tries.length===1  && <p style={{ color:GOLD, fontSize:19, fontWeight:"bold", textAlign:"center", marginBottom:14 }}>⚠️ 1 attempt remaining — choose carefully</p>}

        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
          {c.options.map((opt,i)=>{ const col=btnCol(i); return (
            <button key={i} onClick={()=>handleAnswer(i)} style={{ background:col.bg, color:col.text, border:`2px solid ${col.border}`, borderRadius:14, padding:"20px 22px", fontSize:21, fontWeight:"bold", textAlign:"left", cursor:!isLocked&&!tries.includes(i)?"pointer":"default", lineHeight:1.4, opacity:isLocked&&!tries.includes(i)&&i!==c.correct?0.5:1 }}>
              {String.fromCharCode(65+i)}. &nbsp;{opt}
            </button>
          ); })}
        </div>

        {f && (
          <div style={{ background:f.bg, border:`2px solid ${f.border}`, borderRadius:16, padding:"20px 22px", marginBottom:20 }}>
            <p style={{ color:f.tc, fontSize:20, fontWeight:"bold", marginBottom:f.body?12:0 }}>{f.title}</p>
            {f.body && (<>
              <p style={{ color:"#e2e8f0", fontSize:20, lineHeight:1.8, fontWeight:"bold", marginBottom:4 }}>{f.body}</p>
              <ReadAloudButton text={f.body}/>
            </>)}
          </div>
        )}
        {isLocked && <button onClick={handleNext} style={{ ...goldBtn, width:"100%", padding:"20px" }}>{idx+1>=total?"See Final Score 🏁":"Next Case →"}</button>}
      </div>
    </div>
  );
}

// ── PATTERN COMPLETION ────────────────────────────────────────────────────────
const PAT_WELCOME = `Hey, welcome. So here's what we're doing. You'll see four shapes laid out in a row, and your job is to figure out what comes fifth. Simple as that. Each puzzle has a pattern hiding in it — could be the colours, could be the shapes, could be both. You get two tries per puzzle, no rush, no timer. And after each one, we'll walk through exactly what the pattern was. Whenever you're ready, tap Start Puzzles.`;
const PAT_THANKYOU = `And that's a wrap. You made it through all ten puzzles — that's no small thing. Every one of those patterns took real focus to work through. Come back whenever you're ready for another round.`;

const COLORS = { red:{fill:"#ef4444",stroke:"#991b1b",label:"Red"}, blue:{fill:"#3b82f6",stroke:"#1d4ed8",label:"Blue"}, yellow:{fill:"#fbbf24",stroke:"#b45309",label:"Yellow"}, green:{fill:"#22c55e",stroke:"#15803d",label:"Green"}, purple:{fill:"#a855f7",stroke:"#7e22ce",label:"Purple"}, orange:{fill:"#f97316",stroke:"#c2410c",label:"Orange"} };
const CK=Object.keys(COLORS), SHAPES=["circle","square","triangle","diamond","star","hexagon"], SIZES=["small","medium","large"], SPX={small:42,medium:82,large:130};

function ShapeEl({shape,color,dim=80}) {
  const sz=dim,c=COLORS[color],cx=sz/2,cy=sz/2,r=sz*0.42,sw=Math.max(3,sz*0.06);
  const poly=n=>{const p=[];for(let i=0;i<n;i++){const a=(i*2*Math.PI)/n-Math.PI/2;p.push(`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`);}return p.join(" ");};
  const star=()=>{const p=[],or=r,ir=r*0.42,n=5;for(let i=0;i<n*2;i++){const a=(i*Math.PI)/n-Math.PI/2,rr=i%2===0?or:ir;p.push(`${cx+rr*Math.cos(a)},${cy+rr*Math.sin(a)}`);}return p.join(" ");};
  const cm={fill:c.fill,stroke:c.stroke,strokeWidth:sw,strokeLinejoin:"round"};
  return(<svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{display:"block"}}>
    {shape==="circle"&&<circle cx={cx} cy={cy} r={r} {...cm}/>}
    {shape==="square"&&<rect x={sz*.08} y={sz*.08} width={sz*.84} height={sz*.84} rx={sz*.08} {...cm}/>}
    {shape==="triangle"&&<polygon points={poly(3)} {...cm}/>}
    {shape==="diamond"&&<polygon points={poly(4)} {...cm}/>}
    {shape==="star"&&<polygon points={star()} {...cm}/>}
    {shape==="hexagon"&&<polygon points={poly(6)} {...cm}/>}
  </svg>);
}

const sh=a=>[...a].sort(()=>Math.random()-0.5),pk=(a,n)=>sh(a).slice(0,n),rnd=a=>a[Math.floor(Math.random()*a.length)],cyc=(a,i)=>a[i%a.length];

function genL1(){const shape=rnd(SHAPES),[c1,c2]=pk(CK,2),C1=COLORS[c1].label,C2=COLORS[c2].label;const pats=[{seq:[c1,c1,c2,c2,c1],ex:`So the colours here are moving in pairs. Two ${C1}s, then two ${C2}s, then back to ${C1} again. Once you see that rhythm, the fifth one is a pretty easy call — ${C1}.`},{seq:[c1,c2,c1,c2,c1],ex:`This one's a straight swap back and forth. ${C1}, ${C2}, ${C1}, ${C2} — just keeps alternating. So the fifth has to be ${C1}.`},{seq:[c1,c2,c2,c1,c2],ex:`The repeating block here is ${C1}, ${C2}, ${C2}. When that loops around, position four goes back to ${C1}, and position five follows as ${C2}.`},{seq:[c1,c1,c1,c2,c1],ex:`Three ${C1}s in a row, then one ${C2} as a kind of break, then it resets. The fifth shape comes back to ${C1}.`}];const ch=rnd(pats);const tiles=ch.seq.map(color=>({shape,color,size:"medium"}));return{label:`Color Seq — ${shape}`,shown:tiles.slice(0,4),answer:tiles[4],wrongs:pk(CK.filter(c=>c!==tiles[4].color),2).map(color=>({shape,color,size:"medium"})),rule:"What color completes the pattern?",explanation:ch.ex};}
function genL2(){const[s1,s2]=pk(SHAPES,2),[c1,c2]=pk(CK,2);const S1=s1[0].toUpperCase()+s1.slice(1),S2=s2[0].toUpperCase()+s2.slice(1),C1=COLORS[c1].label,C2=COLORS[c2].label;const seq=[{shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1}].map(t=>({...t,size:"medium"}));return{label:`Shape+Color — ${S1}`,shown:seq.slice(0,4),answer:seq[4],wrongs:sh([{shape:s1,color:c2,size:"medium"},{shape:s2,color:c1,size:"medium"}]).slice(0,2),rule:"Which shape and color comes next?",explanation:`Both things are moving together here — the shape and the colour swap as a pair. ${S1} with ${C1}, then ${S2} with ${C2}, then back again. The fifth slot follows that same pair, so you're looking for a ${C1} ${S1}.`};}
function genL3(){const shape=rnd(SHAPES),S=shape[0].toUpperCase()+shape.slice(1),colors=pk(CK,3),seq=[0,1,2,3,4].map(i=>({shape,color:cyc(colors,i),size:cyc(SIZES,i)}));const ans=seq[4];const[C0,C1,C2]=colors.map(c=>COLORS[c].label);return{label:`Multi-Rule — ${S}`,shown:seq.slice(0,4),answer:ans,wrongs:[{shape,color:cyc(colors,4),size:SIZES[(SIZES.indexOf(ans.size)+1)%3]},{shape,color:colors[(colors.indexOf(ans.color)+1)%3],size:ans.size}],rule:"Shape, colour AND size follow a pattern — what's next?",explanation:`Three things going on at once here. The shape stays the same throughout — always a ${S}, so that's not what you're tracking. The colour cycles through ${C0}, then ${C1}, then ${C2}, then starts over. And the size does the same — small, medium, large, then repeat. Put those together for position five, and you land on a ${ans.size}, ${COLORS[ans.color].label} ${S}.`};}

const PGENS=[genL1,genL1,genL2,genL2,genL3,genL3,genL1,genL2,genL3,genL2];
const PRANKS=[{title:"Pattern Novice",icon:"🔍",min:0},{title:"Shape Spotter",icon:"👁️",min:4},{title:"Sequence Thinker",icon:"🧠",min:8},{title:"Logic Analyst",icon:"📐",min:13},{title:"Pattern Strategist",icon:"🎯",min:18},{title:"Visual Mastermind",icon:"🏅",min:23},{title:"Grand Pattern Master",icon:"🏆",min:28}];
const getPRank=s=>{let r=PRANKS[0];for(const x of PRANKS)if(s>=x.min)r=x;return r;};
const PLV=i=>i<2?{label:"Level 1 — Colour Pattern",color:"#22c55e"}:i<6?{label:"Level 2 — Shape & Colour",color:GOLD}:{label:"Level 3 — Multi-Rule",color:"#f97316"};
const StarRow=({count,size=24})=><div style={{display:"flex",gap:3}}>{[1,2,3].map(i=><span key={i} style={{fontSize:size,filter:i<=count?"none":"grayscale(1) opacity(0.2)"}}>⭐</span>)}</div>;

function PatternGame({ onBack }) {
  const [puzzles] = useState(()=>PGENS.map(g=>g()));
  const [opts]    = useState(()=>puzzles.map(p=>sh([p.answer,...p.wrongs])));
  const [idx,setIdx]       = useState(0);
  const [tries,setTries]   = useState([]);
  const [locked,setLocked] = useState(false);
  const [score,setScore]   = useState(0);
  const [stars,setStars]   = useState([]);
  const [screen,setScreen] = useState("game");
  const sessionStart = useRef(Date.now());
  const qTimes = useRef([]);
  const qStart = useRef(Date.now());
  const total=puzzles.length,puz=puzzles[idx],rank=getPRank(score);

  const isCorrect=opt=>JSON.stringify(opt)===JSON.stringify(puz.answer);
  const wasWrong=opt=>tries.some(t=>JSON.stringify(t)===JSON.stringify(opt)&&!isCorrect(opt));

  const handlePick=opt=>{
    if(locked||tries.some(t=>JSON.stringify(t)===JSON.stringify(opt)))return;
    const nt=[...tries,opt];setTries(nt);
    const ok=isCorrect(opt);
    if(ok||nt.length>=2){
      setLocked(true);
      qTimes.current.push({label:puz.label,elapsed:Date.now()-qStart.current,correct:ok,tries:nt.length});
      if(ok&&nt.length===1){setStars(s=>[...s,3]);setScore(s=>s+1);}
      else if(ok){setStars(s=>[...s,2]);}
      else{setStars(s=>[...s,0]);}
    }
  };

  const handleNext=()=>{
    qStart.current=Date.now();
    if(idx+1>=total){finalize();setScreen("done");return;}
    setIdx(i=>i+1);setTries([]);setLocked(false);
  };

  const finalize=()=>{
    const dur=Date.now()-sessionStart.current;
    for(const q of qTimes.current)postToAirtable("Pattern Completion",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Pattern Completion",Type:"question",Label:q.label,Correct:q.correct?"Yes":"No",Tries:q.tries,"Elapsed (s)":Math.round(q.elapsed/1000)});
    postToAirtable("Pattern Completion",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Pattern Completion",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qTimes.current.length,"Drop-Off":"No","Drop-Off At":"—","Ease Rating":"—","Enjoy Rating":"—",Platform:detectPlatform()});
    setTimeout(()=>speakText(PAT_THANKYOU,null,null),600);
  };

  const lv=PLV(idx);
  if(screen==="done") return <FeedbackScreen onBack={onBack} gameName="Pattern Completion" table="Pattern Completion"/>;

  return(
    <div style={{...page,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{maxWidth:680,width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:16,cursor:"pointer"}}>← Hub</button>
          <div style={{textAlign:"right"}}>
            <span style={{color:GOLD,fontSize:17,fontWeight:"bold"}}>{rank.icon} {rank.title}</span>
            <span style={{color:LIGHT,fontSize:17,fontWeight:"bold",display:"block"}}>Score: {score}</span>
          </div>
        </div>
        <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:8}}>
          <div style={{background:GOLD,height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/>
        </div>
        <p style={{color:lv.color,fontSize:16,fontWeight:"bold",letterSpacing:1,marginBottom:14,textAlign:"center"}}>{lv.label.toUpperCase()}</p>
        {stars.length>0&&<div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>{stars.map((s,i)=><StarRow key={i} count={s} size={17}/>)}</div>}

        <div style={{background:"#1e293b",borderRadius:20,padding:"24px 12px",marginBottom:20,border:"2px solid #334155"}}>
          <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",letterSpacing:2,textAlign:"center",marginBottom:18}}>FIND THE MISSING PIECE</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
            {puz.shown.map((tile,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{background:"#0f172a",borderRadius:14,padding:10,border:"2px solid #334155",display:"flex",alignItems:"center",justifyContent:"center",width:150,height:150}}>
                  <ShapeEl shape={tile.shape} color={tile.color} dim={SPX[tile.size]}/>
                </div>
                <span style={{color:"#94a3b8",fontSize:14,fontWeight:"bold",fontStyle:"italic",textTransform:"capitalize"}}>{tile.size}</span>
                <span style={{color:"#64748b",fontSize:14,fontWeight:"bold"}}>{i+1}</span>
              </div>
            ))}
            <span style={{color:GOLD,fontSize:28,fontWeight:"bold"}}>→</span>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:150,height:150,borderRadius:14,border:`3px dashed ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a"}}>
                <span style={{fontSize:36,color:GOLD}}>?</span>
              </div>
              <span style={{color:GOLD,fontSize:14,fontWeight:"bold"}}>5</span>
            </div>
          </div>
        </div>

        <p style={{color:"#7dd3fc",fontSize:20,fontWeight:"bold",textAlign:"center",marginBottom:8}}>{puz.rule}</p>
        {!locked&&tries.length===0&&<p style={{color:LIGHT,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>You have 2 attempts</p>}
        {!locked&&tries.length===1&&<p style={{color:GOLD,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>⚠️ Last attempt — look carefully</p>}

        <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:20,flexWrap:"wrap"}}>
          {opts[idx].map((opt,i)=>{
            const wrong=wasWrong(opt),correct=isCorrect(opt)&&locked,clickable=!locked&&!wasWrong(opt);
            return(
              <div key={i} onClick={()=>clickable&&handlePick(opt)} style={{background:correct?"#14532d44":wrong?"#7f1d1d44":"#1e293b",border:`3px solid ${correct?"#22c55e":wrong?"#ef4444":"#334155"}`,borderRadius:18,padding:14,display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:clickable?"pointer":"default",opacity:locked&&!correct&&!wrong?0.45:1,width:150,height:190,justifyContent:"center"}}>
                <ShapeEl shape={opt.shape} color={opt.color} dim={SPX[opt.size]}/>
                <span style={{color:correct?"#22c55e":wrong?"#ef4444":"#e2e8f0",fontSize:18,fontWeight:"bold",textAlign:"center"}}>{correct?"✅ Correct":wrong?"❌ Wrong":`Option ${String.fromCharCode(65+i)}`}</span>
              </div>
            );
          })}
        </div>

        {locked&&(()=>{
          const gotIt=tries.some(t=>JSON.stringify(t)===JSON.stringify(puz.answer)),first=gotIt&&tries.length===1;
          return(
            <div style={{background:gotIt?"#14532d":"#7f1d1d",border:`2px solid ${gotIt?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"18px 20px",marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><StarRow count={first?3:gotIt?2:0} size={26}/></div>
              <p style={{color:gotIt?"#bbf7d0":"#fecaca",fontSize:19,fontWeight:"bold",marginBottom:10,textAlign:"center"}}>{first?"🎉 Perfect — first attempt!":gotIt?"✅ Correct on second try!":`❌ Answer: Option ${String.fromCharCode(65+opts[idx].findIndex(o=>JSON.stringify(o)===JSON.stringify(puz.answer)))}`}</p>
              <div style={{borderTop:`1px solid ${gotIt?"#22c55e44":"#ef444444"}`,paddingTop:12}}>
                <p style={{color:gotIt?"#86efac":"#fca5a5",fontSize:15,fontWeight:"bold",letterSpacing:1,marginBottom:8}}>💡 PATTERN EXPLANATION</p>
                <p style={{color:"#e2e8f0",fontSize:20,lineHeight:1.8,fontWeight:"bold"}}>{puz.explanation}</p>
                <ReadAloudButton text={puz.explanation}/>
              </div>
            </div>
          );
        })()}
        {locked&&<button onClick={handleNext} style={{...goldBtn,width:"100%",padding:"20px"}}>{idx+1>=total?"See Final Score 🏁":"Next Puzzle →"}</button>}
      </div>
    </div>
  );
}

// ── WORD ASSOCIATION ──────────────────────────────────────────────────────────
const WORD_WELCOME = `Hey, welcome. This one is called Veterinary Word Association. Each round shows you a theme word at the top. Below it you'll see three options. Two of them belong with the theme — one of them doesn't. Your job is to find the odd one out. You get two attempts per round, no time pressure, and after each answer we'll explain exactly why the odd one is the odd one. Whenever you're ready, tap Start Rounds.`;
const WORD_THANKYOU = `That's all the rounds — well done. Every one of those took real clinical reasoning to work through. Come back whenever you'd like another session.`;

const WORD_QS = [
  {cat:"digestive",diff:"easy",theme:"RUMINANT STOMACH CHAMBERS",options:["Rumen","Omasum","Cecum"],odd:2,explanation:"So the rumen and omasum are both true chambers of the ruminant stomach — part of that four-chamber system. The cecum is a completely separate organ sitting at the junction of the small and large intestine. It's not a stomach chamber at all."},
  {cat:"digestive",diff:"easy",theme:"DIGESTIVE ENZYMES",options:["Lipase","Amylase","Insulin"],odd:2,explanation:"Lipase and amylase are both digestive enzymes — lipase breaks down fats, amylase handles starches. Insulin is a pancreatic hormone that regulates blood glucose. It's made by the pancreas, yes, but it plays no role in digestion itself."},
  {cat:"digestive",diff:"medium",theme:"AVIAN DIGESTION",options:["Proventriculus","Gizzard","Duodenum"],odd:2,explanation:"The proventriculus and gizzard are the two-part stomach unique to birds. The duodenum is the first section of the small intestine — it's present across most vertebrates and has nothing specifically avian about it."},
  {cat:"digestive",diff:"medium",theme:"LIVER FUNCTIONS",options:["Bile Production","Glycogen Storage","Erythropoiesis"],odd:2,explanation:"Bile production and glycogen storage are both well-established hepatic functions. Erythropoiesis — red blood cell production — happens in bone marrow in adult mammals. The liver does it during fetal development, but not after."},
  {cat:"pharmacology",diff:"easy",theme:"NSAIDs IN VETERINARY MEDICINE",options:["Meloxicam","Carprofen","Metronidazole"],odd:2,explanation:"Meloxicam and carprofen are both NSAIDs — widely used in dogs and cats for pain and inflammation. Metronidazole is an antibiotic and antiprotozoal. It treats infections, not inflammation."},
  {cat:"pharmacology",diff:"easy",theme:"ANTIPARASITIC DRUGS",options:["Ivermectin","Fenbendazole","Dexamethasone"],odd:2,explanation:"Ivermectin and fenbendazole are both antiparasitic agents. Dexamethasone is a corticosteroid — it's used for inflammation and immune suppression, not parasites."},
  {cat:"pharmacology",diff:"medium",theme:"HEPATOTOXIC IN CATS",options:["Acetaminophen","Diazepam","Penicillin"],odd:2,explanation:"Acetaminophen is severely toxic to cats due to their deficiency in glucuronidation enzymes. Oral diazepam has been documented to cause acute hepatic necrosis in cats. Penicillin is generally safe at therapeutic doses and is not hepatotoxic."},
  {cat:"pharmacology",diff:"medium",theme:"OPIOID ANALGESICS",options:["Buprenorphine","Butorphanol","Tramadol"],odd:2,explanation:"Buprenorphine and butorphanol are true opioids acting directly on mu and kappa receptors. Tramadol is often grouped with opioids, but its opioid effect in dogs is minimal — poor conversion to its active metabolite means it behaves differently."},
  {cat:"reproduction",diff:"easy",theme:"HORMONES IN PARTURITION",options:["Oxytocin","Relaxin","Testosterone"],odd:2,explanation:"Oxytocin drives uterine contractions during labour, and relaxin relaxes pelvic ligaments and softens the cervix — both are central to parturition. Testosterone is an androgen involved in male reproductive development. It has no role in birth."},
  {cat:"reproduction",diff:"medium",theme:"CAUSES OF DYSTOCIA",options:["Fetal Malpresentation","Uterine Inertia","Cryptorchidism"],odd:2,explanation:"Fetal malpresentation and uterine inertia are both direct causes of difficult birth. Cryptorchidism is the failure of one or both testes to descend — a male reproductive condition completely unrelated to parturition."},
  {cat:"hematology",diff:"easy",theme:"COMPONENTS OF A CBC",options:["PCV","WBC Count","ALT"],odd:2,explanation:"PCV — packed cell volume — and WBC count are both standard CBC components. ALT is a liver enzyme measured on a chemistry panel, not a complete blood count."},
  {cat:"hematology",diff:"easy",theme:"WHITE BLOOD CELL TYPES",options:["Neutrophil","Eosinophil","Erythrocyte"],odd:2,explanation:"Neutrophils and eosinophils are both leukocytes — white blood cells involved in immune defence. Erythrocytes are red blood cells, responsible for oxygen transport. Completely different category."},
  {cat:"hematology",diff:"medium",theme:"CAUSES OF ANEMIA IN DOGS",options:["Immune-Mediated Hemolysis","Ehrlichiosis","Polycythemia"],odd:2,explanation:"Immune-mediated hemolytic anaemia and ehrlichiosis — a tick-borne rickettsial disease — are both recognised causes of anaemia in dogs. Polycythemia is the opposite — an abnormal increase in red blood cell mass, not a cause of anaemia."},
  {cat:"neurology",diff:"easy",theme:"SIGNS OF VESTIBULAR DISEASE",options:["Head Tilt","Nystagmus","Paraplegia"],odd:2,explanation:"Head tilt and nystagmus are both hallmark signs of vestibular disease — reflecting dysfunction of the balance system. Paraplegia is a sign of spinal cord disease. Different system entirely."},
  {cat:"neurology",diff:"medium",theme:"CAUSES OF SEIZURES IN DOGS",options:["Idiopathic Epilepsy","Hypoglycemia","Hyperkalemia"],odd:2,explanation:"Idiopathic epilepsy is the most common cause of seizures in young dogs, and hypoglycemia is a well-documented metabolic seizure trigger. Hyperkalemia — elevated blood potassium — primarily causes cardiac arrhythmias and muscle weakness. Not seizures."},
  {cat:"dermatology",diff:"easy",theme:"CAUSES OF PRURITUS IN DOGS",options:["Atopic Dermatitis","Flea Allergy","Hypothyroidism"],odd:2,explanation:"Atopic dermatitis and flea allergy dermatitis are both primary causes of pruritus. Hypothyroidism causes skin changes like alopecia and scaling — but affected dogs typically don't scratch excessively. It's not a pruritic disease."},
  {cat:"dermatology",diff:"easy",theme:"ENDOCRINE DISORDERS IN CATS",options:["Hyperthyroidism","Diabetes Mellitus","Addison's Disease"],odd:2,explanation:"Hyperthyroidism and diabetes mellitus are both very common endocrine disorders in cats. Addison's disease is extremely rare in cats — though it's common in dogs, it almost never shows up in feline patients."},
  {cat:"dermatology",diff:"medium",theme:"CLINICAL SIGNS OF CUSHING'S",options:["Polydipsia","Pot-Belly","Hypoglycemia"],odd:2,explanation:"Polydipsia and pot-bellied appearance are classic signs of hyperadrenocorticism — excess cortisol causes PU/PD and abdominal muscle wasting. Hypoglycemia is associated with Addison's disease or insulinoma. Cushing's typically causes hyperglycemia, not hypoglycemia."},
];

const WCATS=[{key:"digestive",label:"Digestive System",icon:"🫁",color:"#14532d"},{key:"pharmacology",label:"Pharmacology",icon:"💊",color:"#1e3a5f"},{key:"reproduction",label:"Reproduction",icon:"🔬",color:"#4a1d96"},{key:"hematology",label:"Hematology & Immunity",icon:"🩸",color:"#7f1d1d"},{key:"neurology",label:"Neurology & MSK",icon:"🧠",color:"#134e4a"},{key:"dermatology",label:"Dermatology & Endocrine",icon:"🩺",color:"#854d0e"}];
const WRANKS=[{title:"Clinical Intern",icon:"🩺",min:0},{title:"Junior Clinician",icon:"📋",min:4},{title:"General Practitioner",icon:"🔬",min:8},{title:"Senior Clinician",icon:"💊",min:13},{title:"Clinical Specialist",icon:"🧬",min:18},{title:"Consulting Veterinarian",icon:"🎖️",min:22},{title:"Chief of Medicine",icon:"🏆",min:25}];
const getWRank=s=>{let r=WRANKS[0];for(const x of WRANKS)if(s>=x.min)r=x;return r;};

function WordGame({ onBack }) {
  const [questions]=useState(()=>[...WORD_QS].sort(()=>Math.random()-0.5));
  const [idx,setIdx]=useState(0);
  const [tries,setTries]=useState([]);
  const [locked,setLocked]=useState(false);
  const [score,setScore]=useState(0);
  const [stars,setStars]=useState([]);
  const [screen,setScreen]=useState("game");
  const sessionStart=useRef(Date.now());
  const qTimes=useRef([]);
  const qStart=useRef(Date.now());
  const total=questions.length,q=questions[idx],rank=getWRank(score);
  const catInfo=WCATS.find(c=>c.key===q?.cat)||WCATS[0];

  const handlePick=i=>{
    if(locked||tries.includes(i))return;
    const nt=[...tries,i];setTries(nt);
    const ok=i===q.odd;
    if(ok||nt.length>=2){
      setLocked(true);
      qTimes.current.push({theme:q.theme,elapsed:Date.now()-qStart.current,correct:ok,tries:nt.length});
      if(ok&&nt.length===1){setStars(s=>[...s,3]);setScore(s=>s+1);}
      else if(ok){setStars(s=>[...s,2]);}
      else{setStars(s=>[...s,0]);}
    }
  };

  const handleNext=()=>{
    qStart.current=Date.now();
    if(idx+1>=total){finalize();setScreen("done");return;}
    setIdx(i=>i+1);setTries([]);setLocked(false);
  };

  const finalize=()=>{
    const dur=Date.now()-sessionStart.current;
    for(const qt of qTimes.current)postToAirtable("Word Association",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Word Association",Type:"question",Label:qt.theme,Correct:qt.correct?"Yes":"No",Tries:qt.tries,"Elapsed (s)":Math.round(qt.elapsed/1000)});
    postToAirtable("Word Association",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Word Association",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qTimes.current.length,"Drop-Off":"No","Drop-Off At":"—","Ease Rating":"—","Enjoy Rating":"—",Platform:detectPlatform()});
    setTimeout(()=>speakText(WORD_THANKYOU,null,null),600);
  };

  if(screen==="done") return <FeedbackScreen onBack={onBack} gameName="Word Association" table="Word Association"/>;

  return(
    <div style={{...page,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{maxWidth:660,width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:16,cursor:"pointer"}}>← Hub</button>
          <div style={{textAlign:"right"}}>
            <span style={{color:GOLD,fontSize:17,fontWeight:"bold"}}>{rank.icon} {rank.title}</span>
            <span style={{color:"#64748b",fontSize:16,fontWeight:"bold",display:"block"}}>Score: {score}</span>
          </div>
        </div>
        <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:8}}>
          <div style={{background:GOLD,height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{background:catInfo.color,color:"#fff",fontSize:15,fontWeight:"bold",padding:"6px 16px",borderRadius:20}}>{catInfo.icon} {catInfo.label}</span>
          <span style={{color:q.diff==="easy"?"#22c55e":GOLD,fontSize:14,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1}}>{q.diff}</span>
        </div>
        {stars.length>0&&<div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>{stars.map((s,i)=><StarRow key={i} count={s} size={17}/>)}</div>}

        <div style={{background:"#1e293b",borderRadius:20,padding:"28px 24px",marginBottom:22,border:"2px solid #334155",textAlign:"center"}}>
          <p style={{color:"#7dd3fc",fontSize:15,fontWeight:"bold",letterSpacing:2,marginBottom:12}}>THEME WORD</p>
          <div style={{background:"#0f172a",borderRadius:14,padding:"20px 24px",display:"inline-block",marginBottom:18}}>
            <span style={{fontSize:36,fontWeight:"bold",color:GOLD,letterSpacing:2}}>{q.theme}</span>
          </div>
          <p style={{color:LIGHT,fontSize:20,fontWeight:"bold"}}>Which word does <strong style={{color:GOLD}}>NOT</strong> belong?</p>
        </div>

        {!locked&&tries.length===0&&<p style={{color:LIGHT,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>You have 2 attempts</p>}
        {!locked&&tries.length===1&&<p style={{color:GOLD,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>⚠️ Last attempt — think carefully</p>}

        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
          {q.options.map((word,i)=>{
            const ww=tries.includes(i)&&i!==q.odd,ic=locked&&i===q.odd;
            return(<button key={i} onClick={()=>!locked&&!tries.includes(i)&&handlePick(i)} style={{background:ic?"#14532d":ww?"#7f1d1d":"#1e293b",border:`2px solid ${ic?"#22c55e":ww?"#ef4444":"#334155"}`,borderRadius:16,padding:"22px 28px",fontSize:24,fontWeight:"bold",color:ic?"#bbf7d0":ww?"#fecaca":"#e2e8f0",textAlign:"center",cursor:!locked&&!tries.includes(i)?"pointer":"default",opacity:locked&&!ic&&!ww?0.45:1}}>
              {word}{ic&&<span style={{fontSize:17,marginLeft:12}}>← Odd one out ✅</span>}{ww&&<span style={{fontSize:17,marginLeft:12}}>❌</span>}
            </button>);
          })}
        </div>

        {locked&&(()=>{const gotIt=tries.includes(q.odd),first=gotIt&&tries.length===1;return(
          <div style={{background:gotIt?"#14532d":"#7f1d1d",border:`2px solid ${gotIt?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"18px 22px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><StarRow count={first?3:gotIt?2:0} size={24}/></div>
            <p style={{color:gotIt?"#bbf7d0":"#fecaca",fontSize:19,fontWeight:"bold",marginBottom:10,textAlign:"center"}}>{first?"🎉 Correct on first try!":gotIt?"✅ Correct on second try!":`❌ Odd one out: "${q.options[q.odd]}"`}</p>
            <p style={{color:"#e2e8f0",fontSize:20,lineHeight:1.8,fontWeight:"bold",marginBottom:4}}>{q.explanation}</p>
            <ReadAloudButton text={q.explanation}/>
          </div>
        );})()}
        {locked&&<button onClick={handleNext} style={{...goldBtn,width:"100%",padding:"20px"}}>{idx+1>=total?"See Final Score 🏁":"Next Round →"}</button>}
      </div>
    </div>
  );
}

// ── LANDING / HOME ────────────────────────────────────────────────────────────
function DiagnosisHome({ onStart, onBack }) {
  return (
    <div style={center}>
      <div style={{ maxWidth:660, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:72, marginBottom:16 }}>🐾</div>
        <h1 style={{ fontSize:36, fontWeight:"bold", color:GOLD, marginBottom:12, lineHeight:1.2 }}>Animal Diagnosis Challenge</h1>
        <p style={{ fontSize:22, color:LIGHT, fontWeight:"bold", marginBottom:24, lineHeight:1.5 }}>A clinical reasoning game for the experienced veterinary mind.</p>
        <AudioButton text={DIAG_WELCOME} label="Hear how to play" large />
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold", marginBottom:24 }}>We'll walk you through everything before you start.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:20 }}>
          <button onClick={onStart} style={goldBtn}>Begin Rounds →</button>
          <button onClick={onBack} style={{ background:"#1e293b", color:"#7dd3fc", fontSize:18, fontWeight:"bold", padding:"18px 28px", borderRadius:16, border:"2px solid #334155", cursor:"pointer" }}>← Hub</button>
        </div>
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold" }}>No time limits · Large text · 2 attempts per case</p>
      </div>
    </div>
  );
}

function PatternHome({ onStart, onBack }) {
  return (
    <div style={center}>
      <div style={{ maxWidth:620, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:12 }}>🧩</div>
        <h1 style={{ fontSize:36, fontWeight:"bold", color:GOLD, marginBottom:10, lineHeight:1.2 }}>Pattern Completion</h1>
        <p style={{ fontSize:22, color:LIGHT, fontWeight:"bold", marginBottom:24, lineHeight:1.5 }}>A visual logic puzzle for the sharp, reasoning mind.</p>
        <div style={{ background:"#1e293b", borderRadius:14, padding:"18px 24px", marginBottom:20, border:"1px solid #334155", textAlign:"left" }}>
          <p style={{ color:"#7dd3fc", fontSize:17, fontWeight:"bold", marginBottom:14 }}>DIFFICULTY LEVELS</p>
          {[
            { label:"Level 1", desc:"Colour sequences",    detail:"Spot how colours repeat or alternate and predict what comes next.",  color:"#22c55e" },
            { label:"Level 2", desc:"Shape & colour rules", detail:"Two things change at once — track both shape and colour together.", color:GOLD },
            { label:"Level 3", desc:"Multi-rule patterns",  detail:"Shape, colour and size all follow separate rules simultaneously.",  color:"#f97316" },
          ].map(l => (
            <div key={l.label} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:l.color, fontWeight:"bold", fontSize:20 }}>{l.label}</span>
                <span style={{ color:"#e2e8f0", fontSize:19, fontWeight:"bold" }}>{l.desc}</span>
              </div>
              <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold", lineHeight:1.6, margin:0 }}>{l.detail}</p>
            </div>
          ))}
        </div>
        <AudioButton text={PAT_WELCOME} label="Hear how to play" large />
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold", marginBottom:20 }}>We'll walk you through everything before you start.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:20 }}>
          <button onClick={onStart} style={goldBtn}>Start Puzzles →</button>
          <button onClick={onBack} style={{ background:"#1e293b", color:"#7dd3fc", fontSize:18, fontWeight:"bold", padding:"18px 28px", borderRadius:16, border:"2px solid #334155", cursor:"pointer" }}>← Hub</button>
        </div>
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold" }}>No time limits · 2 attempts · Earn ⭐⭐⭐ per puzzle</p>
      </div>
    </div>
  );
}

function WordHome({ onStart, onBack }) {
  return (
    <div style={center}>
      <div style={{ maxWidth:620, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:12 }}>🔤</div>
        <h1 style={{ fontSize:36, fontWeight:"bold", color:GOLD, marginBottom:10, lineHeight:1.2 }}>Veterinary Word Association</h1>
        <p style={{ fontSize:22, color:LIGHT, fontWeight:"bold", marginBottom:24, lineHeight:1.5 }}>Find the clinical term that doesn't belong.</p>
        <AudioButton text={WORD_WELCOME} label="Hear how to play" large />
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold", marginBottom:24 }}>We'll walk you through everything before you start.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:20 }}>
          <button onClick={onStart} style={goldBtn}>Start Rounds →</button>
          <button onClick={onBack} style={{ background:"#1e293b", color:"#7dd3fc", fontSize:18, fontWeight:"bold", padding:"18px 28px", borderRadius:16, border:"2px solid #334155", cursor:"pointer" }}>← Hub</button>
        </div>
        <p style={{ color:LIGHT, fontSize:19, fontWeight:"bold" }}>No time limits · 2 attempts · Earn ⭐⭐⭐ per round</p>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("hub"); // hub | diag-home | diag-game | pat-home | pat-game | word-home | word-game
  if (view==="diag-home") return <DiagnosisHome onStart={()=>setView("diag-game")} onBack={()=>setView("hub")}/>;
  if (view==="diag-game") return <DiagnosisGame onBack={()=>setView("hub")}/>;
  if (view==="pat-home")  return <PatternHome   onStart={()=>setView("pat-game")}  onBack={()=>setView("hub")}/>;
  if (view==="pat-game")  return <PatternGame   onBack={()=>setView("hub")}/>;
  if (view==="word-home") return <WordHome      onStart={()=>setView("word-game")} onBack={()=>setView("hub")}/>;
  if (view==="word-game") return <WordGame      onBack={()=>setView("hub")}/>;
  return <Hub onSelect={id=>setView(`${id}-home`)}/>;
}