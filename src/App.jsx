// ── Cognitive Games Hub ───────────────────────────────────────────────────────
// Paste this as src/App.jsx in a new Replit React project.
// Install nothing extra — uses only React (already included).

import { useState } from "react";

// ── Airtable ──────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

async function postToAirtable(table, fields) {
  try {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });
  } catch (e) { console.error("Airtable error:", e); }
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  page:    { background:"#0f172a", minHeight:"100vh", fontFamily:"Georgia,serif", color:"#e2e8f0", padding:"24px 16px" },
  center:  { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"32px 24px" },
  card:    { background:"#1e293b", borderRadius:16, padding:"20px 24px", border:"1px solid #334155", marginBottom:16 },
  goldBtn: { background:"#fbbf24", color:"#0f172a", fontSize:22, fontWeight:"bold", padding:"18px 48px", borderRadius:16, border:"none", cursor:"pointer" },
  darkBtn: { background:"#1e293b", color:"#7dd3fc", fontSize:18, fontWeight:"bold", padding:"16px 28px", borderRadius:14, border:"2px solid #334155", cursor:"pointer" },
  h1:      { fontSize:36, fontWeight:"bold", color:"#fbbf24", marginBottom:10, lineHeight:1.2, textAlign:"center" },
  sub:     { fontSize:20, color:"#cbd5e1", marginBottom:20, textAlign:"center", lineHeight:1.5 },
};

// ── HUB ───────────────────────────────────────────────────────────────────────
function Hub({ onSelect }) {
  const games = [
    { id:"diagnosis", icon:"🐾", title:"Animal Diagnosis Challenge", desc:"Clinical reasoning across Dogs, Cats & Chickens", color:"#7dd3fc" },
    { id:"pattern",   icon:"🧩", title:"Pattern Completion",          desc:"Visual logic puzzles across 3 difficulty levels",  color:"#c084fc" },
    { id:"word",      icon:"🔤", title:"Veterinary Word Association",  desc:"Find the clinical term that doesn't belong",       color:"#86efac" },
  ];
  return (
    <div style={{ ...S.center, background:"#0f172a" }}>
      <div style={{ maxWidth:640, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:12 }}>🧠</div>
        <h1 style={S.h1}>Cognitive Games</h1>
        <p style={S.sub}>A suite of brain training games designed for the experienced veterinary mind.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:14, marginTop:8 }}>
          {games.map(g => (
            <button key={g.id} onClick={() => onSelect(g.id)}
              style={{ background:"#1e293b", border:`2px solid ${g.color}44`, borderRadius:18, padding:"22px 28px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:20, transition:"all 0.2s" }}>
              <span style={{ fontSize:44 }}>{g.icon}</span>
              <div>
                <p style={{ color:g.color, fontSize:20, fontWeight:"bold", margin:"0 0 4px" }}>{g.title}</p>
                <p style={{ color:"#94a3b8", fontSize:16, margin:0 }}>{g.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <p style={{ color:"#475569", fontSize:15, marginTop:24 }}>No time limits · Large text · Accessibility first</p>
      </div>
    </div>
  );
}

// ── ANIMAL DIAGNOSIS ──────────────────────────────────────────────────────────
const DIAG_CASES = [
  { species:"canine", animal:"🐕 Golden Retriever",  name:"Max",     age:"8 years",  sex:"Male (neutered)",   symptoms:["Excessive thirst and urination","Pot-bellied appearance","Symmetrical hair loss on flanks","Lethargy and muscle weakness"],        options:["Hypothyroidism","Hyperadrenocorticism (Cushing's Disease)","Diabetes Mellitus"],           correct:1, explanation:"Cushing's Disease classically presents with PU/PD, pot-belly from muscle wasting, and bilateral flank alopecia due to excess cortisol." },
  { species:"canine", animal:"🐕 Dachshund",          name:"Fritz",   age:"6 years",  sex:"Male (neutered)",   symptoms:["Sudden onset paralysis of hind limbs","Crying out when back is touched","History of jumping off furniture","Inability to urinate"],  options:["Hip Dysplasia","Intervertebral Disc Disease (IVDD)","Degenerative Myelopathy"],             correct:1, explanation:"IVDD is the classic chondrodystrophic breed emergency. Rapid-onset paralysis, pain, and bladder dysfunction are the giveaways." },
  { species:"canine", animal:"🐕 Boxer",              name:"Rocky",   age:"7 years",  sex:"Male (intact)",     symptoms:["Rapid abdominal distension","Unproductive retching","Restlessness and hypersalivation","Pale gums and rapid heart rate"],          options:["Acute Pancreatitis","Gastric Dilatation-Volvulus (GDV)","Splenic Mass Rupture"],            correct:1, explanation:"GDV is a life-threatening emergency in deep-chested breeds. Gastric twisting traps gas and cuts off blood supply." },
  { species:"canine", animal:"🐕 Labrador Retriever", name:"Bailey",  age:"9 years",  sex:"Female (spayed)",   symptoms:["Progressive hindlimb weakness","Difficulty rising from rest","Painful on lumbar palpation","Normal forelimb strength"],             options:["Degenerative Myelopathy","Lumbosacral Stenosis","Fibrocartilaginous Embolism"],             correct:1, explanation:"Lumbosacral stenosis is common in large breeds — pelvic limb weakness and lumbosacral pain are key." },
  { species:"canine", animal:"🐕 Border Collie",      name:"Finn",    age:"3 years",  sex:"Male (intact)",     symptoms:["Seizure lasting 90 seconds","Paddling limbs and jaw chomping","Disoriented for 20 minutes after","No prior illness or trauma"],     options:["Portosystemic Shunt","Idiopathic Epilepsy","Hypoglycaemia"],                               correct:1, explanation:"Idiopathic epilepsy is the most common cause of seizures in young to middle-aged dogs. Classic tonic-clonic episode with post-ictal confusion." },
  { species:"canine", animal:"🐕 German Shepherd",    name:"Rex",     age:"11 years", sex:"Male (neutered)",   symptoms:["Gradual hindlimb ataxia over 12 months","Knuckling of rear paws","No spinal pain on palpation","Normal bladder and bowel"],         options:["Lumbosacral Stenosis","Degenerative Myelopathy","Fibrocartilaginous Embolism"],             correct:1, explanation:"Degenerative myelopathy — slow, painless progressive ataxia in hindlimbs with knuckling. No pain differentiates it from disc disease." },
  { species:"feline", animal:"🐈 Domestic Shorthair", name:"Luna",    age:"12 years", sex:"Female (spayed)",   symptoms:["Weight loss despite increased appetite","Increased vocalization","Heart rate of 240 bpm","Fine muscle tremors"],                      options:["Hyperthyroidism","Chronic Kidney Disease","Inflammatory Bowel Disease"],                   correct:0, explanation:"Hyperthyroidism is the most common endocrine disorder in cats over 10. Weight loss with ravenous appetite and tachycardia are classic." },
  { species:"feline", animal:"🐈 Maine Coon",          name:"Thor",    age:"5 years",  sex:"Male (neutered)",   symptoms:["Sudden hind limb paralysis","Cold and painful hind limbs","Absent femoral pulses bilaterally","Crying out in severe pain"],          options:["Spinal Cord Injury","Aortic Thromboembolism (Saddle Thrombus)","Feline Infectious Peritonitis"], correct:1, explanation:"Aortic thromboembolism — thrombus lodges at aortic bifurcation. Bilateral cold limbs and absent pulses are unmistakable." },
  { species:"feline", animal:"🐈 Persian",             name:"Bella",   age:"8 years",  sex:"Female (spayed)",   symptoms:["Increased water intake and urination","Weight loss over several months","Unkempt coat and lethargy","Vomiting 2–3 times per week"],    options:["Hyperthyroidism","Chronic Kidney Disease","Diabetes Mellitus"],                           correct:1, explanation:"Chronic kidney disease in middle-aged to older cats — PU/PD, weight loss, vomiting, and dull coat are the hallmarks." },
  { species:"feline", animal:"🐈 Siamese",             name:"Mochi",   age:"6 years",  sex:"Male (neutered)",   symptoms:["Straining in litter box with little output","Crying when urinating","Blood-tinged urine","Restlessness and frequent box visits"],    options:["Constipation","Feline Idiopathic Cystitis (FIC)","Urinary Tract Infection"],              correct:1, explanation:"FIC is the most common cause of lower urinary tract signs in young male cats. Straining, haematuria, and frequent attempts are classic." },
  { species:"chicken", animal:"🐔 Rhode Island Red",   name:"Rosie",   age:"2 years",  sex:"Female (hen)",      symptoms:["Egg-laying stopped suddenly","Distended abdomen with fluid wave","Lethargy and tail drooping","Laboured breathing when handled"],   options:["Egg Binding","Ascites (Water Belly)","Egg Yolk Peritonitis"],                              correct:2, explanation:"Egg Yolk Peritonitis — yolk enters the abdomen triggering inflammation. Fluid, cessation of laying, and dyspnoea are key signs." },
  { species:"chicken", animal:"🐔 Buff Orpington",     name:"Goldie",  age:"3 years",  sex:"Female (hen)",      symptoms:["Egg stuck visible at vent","Straining without passing egg","Hunched posture","Vent area swollen and reddened"],                      options:["Cloacal Prolapse","Egg Binding","Vent Gleet"],                                             correct:1, explanation:"Egg binding — visible egg at vent with straining and hunched posture. Warm soaking, lubrication, and calcium are first-line." },
  { species:"chicken", animal:"🐔 Leghorn",            name:"Pearl",   age:"1 year",   sex:"Female (hen)",      symptoms:["Sudden flock-wide respiratory distress","Gasping and tracheal rales","Nasal discharge and conjunctivitis","40% mortality in 48h"],   options:["Infectious Laryngotracheitis (ILT)","Newcastle Disease","Avian Influenza"],               correct:0, explanation:"ILT — herpesvirus causing acute severe respiratory distress. Gasping, bloody tracheal mucus, and rapid flock spread are hallmarks." },
  { species:"chicken", animal:"🐔 Sussex",             name:"Hazel",   age:"18 months",sex:"Female (hen)",      symptoms:["Pale comb and wattles","Watery green diarrhoea","Sudden drop in egg production","High fever — 110°F"],                              options:["Fowl Cholera","Coccidiosis","Infectious Bursal Disease"],                                   correct:0, explanation:"Fowl Cholera (Pasteurella multocida) — high fever, green diarrhoea, pale comb, and rapid flock spread. Prompt bacteriology is essential." },
  { species:"chicken", animal:"🐔 Silkie",             name:"Flossy",  age:"1 year",   sex:"Female (hen)",      symptoms:["Thickened crusty leg scales","Legs lifted repeatedly when walking","Scaly debris lifting from shanks","Bird pecks at own legs"],      options:["Bumblefoot","Scaly Leg Mite (Knemidocoptes mutans)","Dermatitis"],                         correct:1, explanation:"Scaly Leg Mite burrows under scales causing crusting and thickening. Silkies are especially prone. Treat with petroleum jelly or ivermectin." },
];

const DIAG_BADGES = [
  { key:"canine",  label:"Canine Expert",     icon:"🐕", color:"#1e3a5f" },
  { key:"feline",  label:"Feline Expert",     icon:"🐈", color:"#4a1d96" },
  { key:"chicken", label:"Poultry Specialist",icon:"🐔", color:"#854d0e" },
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
const getDiagRank = s => { let r=DIAG_RANKS[0]; for(const x of DIAG_RANKS) if(s>=x.minScore) r=x; return r; };
const getBadges = hist => {
  const c={}; for(const {species,correct} of hist){if(!c[species])c[species]={ok:0,n:0};c[species].n++;if(correct)c[species].ok++;}
  return DIAG_BADGES.filter(b=>c[b.key]&&c[b.key].ok>=2);
};

function DiagnosisGame({ onBack }) {
  const [cases]    = useState(()=>[...DIAG_CASES].sort(()=>Math.random()-0.5));
  const [idx, setIdx]           = useState(0);
  const [tries, setTries]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore]       = useState(0);
  const [history, setHistory]   = useState([]);
  const [screen, setScreen]     = useState("game"); // game|done
  const [ease, setEase]         = useState(0);
  const [enjoy, setEnjoy]       = useState(0);
  const [fbDone, setFbDone]     = useState(false);
  const sessionStart = useState(()=>Date.now())[0];
  const qTimes = useState(()=>[])[0];
  const qStart  = useState(()=>({current:Date.now()}))[0];

  const c = cases[idx], total = cases.length;
  const rank = getDiagRank(score);
  const sc = DIAG_SC[c?.species] || DIAG_SC.canine;
  const isLocked = selected !== null;

  const handleAnswer = i => {
    if (isLocked || tries.includes(i)) return;
    const nt = [...tries, i];
    setTries(nt);
    const ok = i === c.correct;
    if (ok || nt.length >= 2) {
      setSelected(i);
      const elapsed = Date.now() - qStart.current;
      qTimes.push({ animal:c.animal, elapsed, correct:ok, tries:nt.length });
      const nh = [...history, { species:c.species, correct:ok }];
      setHistory(nh);
      if (ok && nt.length === 1) setScore(s=>s+1);
    }
  };

  const handleNext = () => {
    qStart.current = Date.now();
    if (idx+1 >= total) { finalize(); setScreen("done"); return; }
    setIdx(i=>i+1); setTries([]); setSelected(null);
  };

  const finalize = () => {
    const dur = Date.now() - sessionStart;
    for (const q of qTimes) {
      postToAirtable("Animal Diagnosis", { Date:new Date().toLocaleDateString(), Time:new Date().toLocaleTimeString(), Game:"Animal Diagnosis", Type:"question", Label:q.animal, Correct:q.correct?"Yes":"No", Tries:q.tries, "Elapsed (s)":Math.round(q.elapsed/1000) });
    }
    postToAirtable("Animal Diagnosis", { Date:new Date().toLocaleDateString(), Time:new Date().toLocaleTimeString(), Game:"Animal Diagnosis", Type:"session", Score:score, Total:total, "Duration (s)":Math.round(dur/1000), Answered:qTimes.length, "Drop-Off":"No", "Drop-Off At":"—", "Ease Rating":"—", "Enjoy Rating":"—", Platform:navigator.userAgent.includes("iPad")||navigator.userAgent.includes("iPhone")?"ios":"other" });
  };

  const submitFb = () => {
    postToAirtable("Animal Diagnosis", { Date:new Date().toLocaleDateString(), Time:new Date().toLocaleTimeString(), Game:"Animal Diagnosis", Type:"feedback", "Ease Rating":String(ease), "Enjoy Rating":String(enjoy) });
    setFbDone(true);
  };

  const btnCol = i => {
    if (isLocked && i===c.correct) return {bg:"#14532d",text:"#bbf7d0",border:"#22c55e"};
    if (tries.includes(i)&&i!==c.correct) return {bg:"#7f1d1d",text:"#fecaca",border:"#ef4444"};
    if (isLocked) return {bg:"#1e293b",text:"#64748b",border:"#334155"};
    return {bg:"#1e3a5f",text:"#e2e8f0",border:"#3b82f6"};
  };

  const fb = () => {
    if (!isLocked&&tries.length===1) return {bg:"#78350f",border:"#f59e0b",tc:"#fde68a",title:"⚠️ Not quite — one more try!",body:null};
    if (isLocked&&tries.includes(c.correct)) return {bg:"#14532d",border:"#22c55e",tc:"#bbf7d0",title:tries.length===1?"✅ Correct Diagnosis!":"✅ Correct on second try!",body:c.explanation};
    if (isLocked) return {bg:"#7f1d1d",border:"#ef4444",tc:"#fecaca",title:`❌ Correct: ${c.options[c.correct]}`,body:c.explanation};
    return null;
  };
  const f = fb();

  if (screen==="done") {
    const eLabels=["Very Hard","Hard","OK","Easy","Very Easy"], eEmojis=["😞","😐","🙂","😄","🤩"];
    const badges=getBadges(history), finalRank=getDiagRank(score);
    return (
      <div style={{...S.center,background:"#0f172a"}}>
        <div style={{maxWidth:640,width:"100%",textAlign:"center"}}>
          {!fbDone?(<>
            <h2 style={{color:"#fbbf24",fontSize:30,fontWeight:"bold",marginBottom:8}}>🏁 Session Complete!</h2>
            <p style={{fontSize:22,color:"#fff",fontWeight:"bold",marginBottom:4}}>{score}/{total}</p>
            <p style={{color:"#fbbf24",fontSize:20,fontWeight:"bold",marginBottom:20}}>{finalRank.icon} {finalRank.title}</p>
            {badges.length>0&&<div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>{badges.map(b=><span key={b.key} style={{background:b.color,color:"#fff",padding:"8px 16px",borderRadius:20,fontSize:16,fontWeight:"bold"}}>{b.icon} {b.label}</span>)}</div>}
            <div style={{...S.card,textAlign:"left",marginBottom:20}}>
              <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",marginBottom:10}}>HOW EASY WAS THIS TO USE?</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:16}}>
                {eLabels.map((l,i)=>{const a=ease===i+1;return(<button key={i} onClick={()=>setEase(i+1)} style={{background:a?"#fbbf24":"#0f172a",color:a?"#0f172a":"#e2e8f0",border:`2px solid ${a?"#fbbf24":"#334155"}`,borderRadius:12,padding:"12px 8px",fontSize:15,fontWeight:"bold",cursor:"pointer",minWidth:70}}>{"⭐".repeat(i+1)}<br/><span style={{fontSize:12}}>{l}</span></button>);})}
              </div>
              <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",marginBottom:10}}>HOW DID YOU ENJOY THIS GAME?</p>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                {eEmojis.map((e,i)=>{const a=enjoy===i+1;return(<button key={i} onClick={()=>setEnjoy(i+1)} style={{background:a?"#1e3a5f":"#0f172a",border:`3px solid ${a?"#7dd3fc":"#334155"}`,borderRadius:14,padding:"12px",fontSize:34,cursor:"pointer",transform:a?"scale(1.2)":"scale(1)"}}>{e}</button>);})}
              </div>
            </div>
            <button onClick={submitFb} disabled={!ease||!enjoy} style={{...S.goldBtn,opacity:ease&&enjoy?1:0.4,marginBottom:12}}>Submit Feedback</button><br/>
            <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"none",fontSize:16,cursor:"pointer",marginTop:8}}>← Back to Hub</button>
          </>):(<>
            <div style={{fontSize:64,marginBottom:16}}>🙏</div>
            <h2 style={{color:"#fbbf24",fontSize:28,fontWeight:"bold",marginBottom:12}}>Thank You, Doctor!</h2>
            <p style={{color:"#cbd5e1",fontSize:19,marginBottom:24}}>Your feedback has been saved.</p>
            <button onClick={onBack} style={S.goldBtn}>← Back to Hub</button>
          </>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{...S.page,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{maxWidth:700,width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"8px 16px",fontSize:15,cursor:"pointer"}}>← Hub</button>
          <div style={{textAlign:"right"}}>
            <span style={{color:"#fbbf24",fontSize:17,fontWeight:"bold"}}>{rank.icon} {rank.title}</span>
            <span style={{color:"#cbd5e1",fontSize:17,fontWeight:"bold",display:"block"}}>Score: {score}</span>
          </div>
        </div>
        <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:20}}>
          <div style={{background:"#fbbf24",height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/>
        </div>
        {/* Patient card */}
        <div style={{borderRadius:20,overflow:"hidden",marginBottom:20,border:`2px solid ${sc.accent}44`}}>
          <div style={{background:sc.banner,padding:"8px 20px",display:"flex",justifyContent:"space-between"}}>
            <span style={{color:sc.accent,fontSize:14,fontWeight:"bold",letterSpacing:2}}>{sc.label}</span>
            <span style={{color:sc.accent,fontSize:14}}>Case {idx+1} of {total}</span>
          </div>
          <div style={{background:`radial-gradient(ellipse at center,${sc.banner}99 0%,${sc.bg} 70%)`,padding:"24px 20px 16px",textAlign:"center"}}>
            <div style={{fontSize:80,marginBottom:8}}>{c.animal.split(" ")[0]}</div>
            <h2 style={{fontSize:26,color:sc.accent,fontWeight:"bold",margin:"0 0 10px"}}>{c.animal.split(" ").slice(1).join(" ")}</h2>
            <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
              {[`👤 ${c.name}`,`🎂 ${c.age}`,`⚕ ${c.sex}`].map((t,i)=>(
                <span key={i} style={{background:`${sc.accent}22`,color:sc.accent,borderRadius:20,padding:"6px 16px",fontSize:18,fontWeight:"bold"}}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{background:"#111827",padding:"16px 20px"}}>
            <p style={{color:sc.accent,fontSize:14,fontWeight:"bold",letterSpacing:2,marginBottom:12}}>PRESENTING SYMPTOMS</p>
            {c.symptoms.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",marginBottom:10,background:"#1e293b",borderRadius:10,padding:"10px 14px",border:`1px solid ${sc.accent}22`}}>
                <span style={{color:sc.accent,fontSize:16,marginRight:10}}>▸</span>
                <span style={{color:"#e2e8f0",fontSize:20,lineHeight:1.5,fontWeight:"bold"}}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{color:"#7dd3fc",fontSize:21,fontWeight:"bold",textAlign:"center",marginBottom:10}}>WHAT IS YOUR DIAGNOSIS?</p>
        {!isLocked&&tries.length===0&&<p style={{color:"#cbd5e1",fontSize:19,fontWeight:"bold",textAlign:"center",marginBottom:12}}>You have 2 attempts per case</p>}
        {!isLocked&&tries.length===1&&<p style={{color:"#fbbf24",fontSize:19,fontWeight:"bold",textAlign:"center",marginBottom:12}}>⚠️ 1 attempt remaining</p>}
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
          {c.options.map((opt,i)=>{const col=btnCol(i);return(
            <button key={i} onClick={()=>handleAnswer(i)} style={{background:col.bg,color:col.text,border:`2px solid ${col.border}`,borderRadius:14,padding:"18px 22px",fontSize:21,fontWeight:"bold",textAlign:"left",cursor:!isLocked&&!tries.includes(i)?"pointer":"default",lineHeight:1.4,opacity:isLocked&&!tries.includes(i)&&i!==c.correct?0.5:1}}>
              {String.fromCharCode(65+i)}. &nbsp;{opt}
            </button>
          );})}
        </div>
        {f&&(
          <div style={{background:f.bg,border:`2px solid ${f.border}`,borderRadius:16,padding:"18px 22px",marginBottom:20}}>
            <p style={{color:f.tc,fontSize:20,fontWeight:"bold",marginBottom:f.body?12:0}}>{f.title}</p>
            {f.body&&<p style={{color:"#e2e8f0",fontSize:20,lineHeight:1.8,fontWeight:"bold"}}>{f.body}</p>}
          </div>
        )}
        {isLocked&&<button onClick={handleNext} style={{...S.goldBtn,width:"100%",padding:"20px"}}>{idx+1>=total?"See Final Score 🏁":"Next Case →"}</button>}
      </div>
    </div>
  );
}

// ── PATTERN COMPLETION (condensed but complete) ───────────────────────────────
const COLORS = { red:{fill:"#ef4444",stroke:"#991b1b",label:"Red"}, blue:{fill:"#3b82f6",stroke:"#1d4ed8",label:"Blue"}, yellow:{fill:"#fbbf24",stroke:"#b45309",label:"Yellow"}, green:{fill:"#22c55e",stroke:"#15803d",label:"Green"}, purple:{fill:"#a855f7",stroke:"#7e22ce",label:"Purple"}, orange:{fill:"#f97316",stroke:"#c2410c",label:"Orange"} };
const CK = Object.keys(COLORS);
const SHAPES = ["circle","square","triangle","diamond","star","hexagon"];
const SIZES  = ["small","medium","large"];
const SPX    = {small:42,medium:82,large:130};

function ShapeEl({shape,color,dim=80}) {
  const sz=dim, c=COLORS[color], cx=sz/2, cy=sz/2, r=sz*0.42, sw=Math.max(3,sz*0.06);
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

const sh=a=>[...a].sort(()=>Math.random()-0.5), pk=(a,n)=>sh(a).slice(0,n), rnd=a=>a[Math.floor(Math.random()*a.length)], cyc=(a,i)=>a[i%a.length];
function genL1(){const shape=rnd(SHAPES),[c1,c2]=pk(CK,2),C1=COLORS[c1].label,C2=COLORS[c2].label;const pats=[{seq:[c1,c1,c2,c2,c1],ex:`Colours move in pairs: ${C1}–${C1}, then ${C2}–${C2}, back to ${C1}.`},{seq:[c1,c2,c1,c2,c1],ex:`Strict alternation: ${C1}, ${C2}, ${C1}, ${C2} — fifth is ${C1}.`},{seq:[c1,c2,c2,c1,c2],ex:`Block ${C1}–${C2}–${C2} repeats. Position 5 is ${C2}.`},{seq:[c1,c1,c1,c2,c1],ex:`Three ${C1}s then one ${C2} break, resets to ${C1}.`}];const ch=rnd(pats);const tiles=ch.seq.map(color=>({shape,color,size:"medium"}));return{label:`Color Seq — ${shape}`,shown:tiles.slice(0,4),answer:tiles[4],wrongs:pk(CK.filter(c=>c!==tiles[4].color),2).map(color=>({shape,color,size:"medium"})),rule:"What color completes the pattern?",explanation:ch.ex};}
function genL2(){const[s1,s2]=pk(SHAPES,2),[c1,c2]=pk(CK,2);const S1=s1[0].toUpperCase()+s1.slice(1),C1=COLORS[c1].label,C2=COLORS[c2].label;const seq=[{shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1}].map(t=>({...t,size:"medium"}));return{label:`Shape+Color — ${S1}`,shown:seq.slice(0,4),answer:seq[4],wrongs:sh([{shape:s1,color:c2,size:"medium"},{shape:s2,color:c1,size:"medium"}]).slice(0,2),rule:"Which shape and color comes next?",explanation:`Shape and colour swap as a pair: ${S1}+${C1}, then ${s2[0].toUpperCase()+s2.slice(1)}+${C2}, repeating. Fifth is a ${C1} ${S1}.`};}
function genL3(){const shape=rnd(SHAPES),S=shape[0].toUpperCase()+shape.slice(1),colors=pk(CK,3),seq=[0,1,2,3,4].map(i=>({shape,color:cyc(colors,i),size:cyc(SIZES,i)}));const ans=seq[4];const[C0,C1,C2]=colors.map(c=>COLORS[c].label);return{label:`Multi-Rule — ${S}`,shown:seq.slice(0,4),answer:ans,wrongs:[{shape,color:cyc(colors,4),size:SIZES[(SIZES.indexOf(ans.size)+1)%3]},{shape,color:colors[(colors.indexOf(ans.color)+1)%3],size:ans.size}],rule:"Shape, colour AND size follow a pattern — what's next?",explanation:`Shape always ${S}. Colour cycles ${C0}→${C1}→${C2}. Size cycles small→medium→large. Position 5: ${ans.size}, ${COLORS[ans.color].label} ${S}.`};}

const PGENS=[genL1,genL1,genL2,genL2,genL3,genL3,genL1,genL2,genL3,genL2];
const PRANKS=[{title:"Pattern Novice",icon:"🔍",min:0},{title:"Shape Spotter",icon:"👁️",min:4},{title:"Sequence Thinker",icon:"🧠",min:8},{title:"Logic Analyst",icon:"📐",min:13},{title:"Pattern Strategist",icon:"🎯",min:18},{title:"Visual Mastermind",icon:"🏅",min:23},{title:"Grand Pattern Master",icon:"🏆",min:28}];
const getPRank=s=>{let r=PRANKS[0];for(const x of PRANKS)if(s>=x.min)r=x;return r;};
const PLV=i=>i<2?{label:"Level 1 — Colour Pattern",color:"#22c55e"}:i<6?{label:"Level 2 — Shape & Colour",color:"#fbbf24"}:{label:"Level 3 — Multi-Rule",color:"#f97316"};
const StarRow=({count,size=24})=><div style={{display:"flex",gap:3}}>{[1,2,3].map(i=><span key={i} style={{fontSize:size,filter:i<=count?"none":"grayscale(1) opacity(0.2)"}}>⭐</span>)}</div>;

function PatternGame({ onBack }) {
  const [puzzles] = useState(()=>PGENS.map(g=>g()));
  const [opts]    = useState(()=>puzzles.map(p=>sh([p.answer,...p.wrongs])));
  const [idx,setIdx]         = useState(0);
  const [tries,setTries]     = useState([]);
  const [locked,setLocked]   = useState(false);
  const [score,setScore]     = useState(0);
  const [stars,setStars]     = useState([]);
  const [screen,setScreen]   = useState("game");
  const [ease,setEase]       = useState(0);
  const [enjoy,setEnjoy]     = useState(0);
  const [fbDone,setFbDone]   = useState(false);
  const sessionStart = useState(()=>Date.now())[0];
  const qTimes = useState(()=>[])[0];
  const qStart = useState(()=>({current:Date.now()}))[0];
  const total=puzzles.length, puz=puzzles[idx], rank=getPRank(score);

  const isCorrect=opt=>JSON.stringify(opt)===JSON.stringify(puz.answer);
  const wasWrong=opt=>tries.some(t=>JSON.stringify(t)===JSON.stringify(opt)&&!isCorrect(opt));

  const handlePick=opt=>{
    if(locked||tries.some(t=>JSON.stringify(t)===JSON.stringify(opt)))return;
    const nt=[...tries,opt];setTries(nt);
    const ok=isCorrect(opt);
    if(ok||nt.length>=2){
      setLocked(true);
      qTimes.push({label:puz.label,elapsed:Date.now()-qStart.current,correct:ok,tries:nt.length});
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
    const dur=Date.now()-sessionStart;
    for(const q of qTimes)postToAirtable("Pattern Completion",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Pattern Completion",Type:"question",Label:q.label,Correct:q.correct?"Yes":"No",Tries:q.tries,"Elapsed (s)":Math.round(q.elapsed/1000)});
    postToAirtable("Pattern Completion",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Pattern Completion",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qTimes.length,"Drop-Off":"No","Drop-Off At":"—","Ease Rating":"—","Enjoy Rating":"—",Platform:navigator.userAgent.includes("iPad")||navigator.userAgent.includes("iPhone")?"ios":"other"});
  };

  const submitFb=()=>{
    postToAirtable("Pattern Completion",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Pattern Completion",Type:"feedback","Ease Rating":String(ease),"Enjoy Rating":String(enjoy)});
    setFbDone(true);
  };

  const lv=PLV(idx);

  if(screen==="done"){
    const eLabels=["Very Hard","Hard","OK","Easy","Very Easy"],eEmojis=["😞","😐","🙂","😄","🤩"],finalRank=getPRank(score);
    return(
      <div style={{...S.center,background:"#0f172a"}}>
        <div style={{maxWidth:620,width:"100%",textAlign:"center"}}>
          {!fbDone?(<>
            <h2 style={{color:"#fbbf24",fontSize:28,fontWeight:"bold",marginBottom:8}}>🏁 Session Complete!</h2>
            <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><StarRow count={Math.round(stars.reduce((a,b)=>a+b,0)/Math.max(total,1))} size={32}/></div>
            <p style={{color:"#94a3b8",fontSize:17,marginBottom:12}}>{stars.reduce((a,b)=>a+b,0)} of {total*3} stars</p>
            <p style={{color:"#fbbf24",fontSize:22,fontWeight:"bold",marginBottom:20}}>{finalRank.icon} {finalRank.title}</p>
            <div style={{...S.card,textAlign:"left"}}>
              <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",marginBottom:10}}>HOW EASY WAS THIS TO USE?</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:16}}>
                {eLabels.map((l,i)=>{const a=ease===i+1;return(<button key={i} onClick={()=>setEase(i+1)} style={{background:a?"#fbbf24":"#0f172a",color:a?"#0f172a":"#e2e8f0",border:`2px solid ${a?"#fbbf24":"#334155"}`,borderRadius:12,padding:"12px 8px",fontSize:15,fontWeight:"bold",cursor:"pointer",minWidth:70}}>{"⭐".repeat(i+1)}<br/><span style={{fontSize:12}}>{l}</span></button>);})}
              </div>
              <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",marginBottom:10}}>HOW DID YOU ENJOY THIS GAME?</p>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                {eEmojis.map((e,i)=>{const a=enjoy===i+1;return(<button key={i} onClick={()=>setEnjoy(i+1)} style={{background:a?"#1e3a5f":"#0f172a",border:`3px solid ${a?"#7dd3fc":"#334155"}`,borderRadius:14,padding:"12px",fontSize:34,cursor:"pointer",transform:a?"scale(1.2)":"scale(1)"}}>{e}</button>);})}
              </div>
            </div>
            <button onClick={submitFb} disabled={!ease||!enjoy} style={{...S.goldBtn,opacity:ease&&enjoy?1:0.4,marginBottom:12}}>Submit Feedback</button><br/>
            <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"none",fontSize:16,cursor:"pointer",marginTop:8}}>← Back to Hub</button>
          </>):(<>
            <div style={{fontSize:64,marginBottom:16}}>🙏</div>
            <h2 style={{color:"#fbbf24",fontSize:28,fontWeight:"bold",marginBottom:12}}>Thank You!</h2>
            <p style={{color:"#cbd5e1",fontSize:19,marginBottom:24}}>Your feedback has been saved.</p>
            <button onClick={onBack} style={S.goldBtn}>← Back to Hub</button>
          </>)}
        </div>
      </div>
    );
  }

  return(
    <div style={{...S.page,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{maxWidth:680,width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"8px 16px",fontSize:15,cursor:"pointer"}}>← Hub</button>
          <div style={{textAlign:"right"}}>
            <span style={{color:"#fbbf24",fontSize:16,fontWeight:"bold"}}>{rank.icon} {rank.title}</span>
            <span style={{color:"#64748b",fontSize:14,display:"block"}}>Score: {score}</span>
          </div>
        </div>
        <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:8}}>
          <div style={{background:"#fbbf24",height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/>
        </div>
        <p style={{color:lv.color,fontSize:15,fontWeight:"bold",letterSpacing:1,marginBottom:14,textAlign:"center"}}>{lv.label.toUpperCase()}</p>
        {stars.length>0&&<div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>{stars.map((s,i)=><StarRow key={i} count={s} size={16}/>)}</div>}
        <div style={{background:"#1e293b",borderRadius:20,padding:"24px 12px",marginBottom:20,border:"2px solid #334155"}}>
          <p style={{color:"#7dd3fc",fontSize:15,fontWeight:"bold",letterSpacing:2,textAlign:"center",marginBottom:18}}>FIND THE MISSING PIECE</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
            {puz.shown.map((tile,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{background:"#0f172a",borderRadius:14,padding:10,border:"2px solid #334155",display:"flex",alignItems:"center",justifyContent:"center",width:150,height:150}}>
                  <ShapeEl shape={tile.shape} color={tile.color} dim={SPX[tile.size]}/>
                </div>
                <span style={{color:"#94a3b8",fontSize:13,fontStyle:"italic",textTransform:"capitalize"}}>{tile.size}</span>
              </div>
            ))}
            <span style={{color:"#fbbf24",fontSize:26,fontWeight:"bold"}}>→</span>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:150,height:150,borderRadius:14,border:"3px dashed #fbbf24",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a"}}>
                <span style={{fontSize:36,color:"#fbbf24"}}>?</span>
              </div>
            </div>
          </div>
        </div>
        <p style={{color:"#7dd3fc",fontSize:19,fontWeight:"bold",textAlign:"center",marginBottom:8}}>{puz.rule}</p>
        {!locked&&tries.length===0&&<p style={{color:"#64748b",fontSize:15,textAlign:"center",marginBottom:14}}>You have 2 attempts</p>}
        {!locked&&tries.length===1&&<p style={{color:"#fbbf24",fontSize:16,fontWeight:"bold",textAlign:"center",marginBottom:14}}>⚠️ Last attempt — look carefully</p>}
        <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:20,flexWrap:"wrap"}}>
          {opts[idx].map((opt,i)=>{
            const wrong=wasWrong(opt),correct=isCorrect(opt)&&locked,clickable=!locked&&!wasWrong(opt);
            return(
              <div key={i} onClick={()=>clickable&&handlePick(opt)} style={{background:correct?"#14532d44":wrong?"#7f1d1d44":"#1e293b",border:`3px solid ${correct?"#22c55e":wrong?"#ef4444":"#334155"}`,borderRadius:18,padding:14,display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:clickable?"pointer":"default",opacity:locked&&!correct&&!wrong?0.45:1,width:150,height:185,justifyContent:"center"}}>
                <ShapeEl shape={opt.shape} color={opt.color} dim={SPX[opt.size]}/>
                <span style={{color:correct?"#22c55e":wrong?"#ef4444":"#94a3b8",fontSize:16,fontWeight:"bold",textAlign:"center"}}>{correct?"✅ Correct":wrong?"❌ Wrong":`Option ${String.fromCharCode(65+i)}`}</span>
              </div>
            );
          })}
        </div>
        {locked&&(()=>{const gotIt=tries.some(t=>JSON.stringify(t)===JSON.stringify(puz.answer)),first=gotIt&&tries.length===1;return(
          <div style={{background:gotIt?"#14532d":"#7f1d1d",border:`2px solid ${gotIt?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"18px 20px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><StarRow count={first?3:gotIt?2:0} size={24}/></div>
            <p style={{color:gotIt?"#bbf7d0":"#fecaca",fontSize:18,fontWeight:"bold",marginBottom:10,textAlign:"center"}}>{first?"🎉 Perfect — first attempt!":gotIt?"✅ Correct on second try!":`❌ Answer: Option ${String.fromCharCode(65+opts[idx].findIndex(o=>JSON.stringify(o)===JSON.stringify(puz.answer)))}`}</p>
            <p style={{color:"#e2e8f0",fontSize:17,lineHeight:1.75}}>{puz.explanation}</p>
          </div>
        );})()}
        {locked&&<button onClick={handleNext} style={{...S.goldBtn,width:"100%",padding:"18px"}}>{idx+1>=total?"See Final Score 🏁":"Next Puzzle →"}</button>}
      </div>
    </div>
  );
}

// ── WORD ASSOCIATION ──────────────────────────────────────────────────────────
const WORD_QS = [
  {cat:"digestive",diff:"easy",theme:"RUMINANT STOMACH CHAMBERS",options:["Rumen","Omasum","Cecum"],odd:2,explanation:"Rumen and omasum are true ruminant stomach chambers. The cecum is a separate intestinal organ, not a stomach chamber."},
  {cat:"digestive",diff:"easy",theme:"DIGESTIVE ENZYMES",options:["Lipase","Amylase","Insulin"],odd:2,explanation:"Lipase and amylase are digestive enzymes. Insulin is a pancreatic hormone regulating blood glucose — not a digestive enzyme."},
  {cat:"digestive",diff:"medium",theme:"AVIAN DIGESTION",options:["Proventriculus","Gizzard","Duodenum"],odd:2,explanation:"Proventriculus and gizzard are the two-part avian stomach. The duodenum is the first section of the small intestine — present in most vertebrates, not unique to birds."},
  {cat:"digestive",diff:"medium",theme:"LIVER FUNCTIONS",options:["Bile Production","Glycogen Storage","Erythropoiesis"],odd:2,explanation:"Bile production and glycogen storage are hepatic functions. Erythropoiesis occurs in bone marrow in adult mammals, not the liver."},
  {cat:"pharmacology",diff:"easy",theme:"NSAIDs IN VETERINARY MEDICINE",options:["Meloxicam","Carprofen","Metronidazole"],odd:2,explanation:"Meloxicam and carprofen are NSAIDs for pain and inflammation. Metronidazole is an antibiotic — it treats infections, not inflammation."},
  {cat:"pharmacology",diff:"easy",theme:"ANTIPARASITIC DRUGS",options:["Ivermectin","Fenbendazole","Dexamethasone"],odd:2,explanation:"Ivermectin and fenbendazole are antiparasitic agents. Dexamethasone is a corticosteroid for inflammation and immune suppression."},
  {cat:"pharmacology",diff:"medium",theme:"HEPATOTOXIC IN CATS",options:["Acetaminophen","Diazepam","Penicillin"],odd:2,explanation:"Acetaminophen and oral diazepam are both documented hepatotoxic in cats. Penicillin is generally safe at therapeutic doses."},
  {cat:"pharmacology",diff:"medium",theme:"OPIOID ANALGESICS",options:["Buprenorphine","Butorphanol","Tramadol"],odd:2,explanation:"Buprenorphine and butorphanol are true opioids. Tramadol's opioid effect in dogs is minimal due to poor conversion to its active metabolite."},
  {cat:"reproduction",diff:"easy",theme:"HORMONES IN PARTURITION",options:["Oxytocin","Relaxin","Testosterone"],odd:2,explanation:"Oxytocin drives contractions and relaxin softens the cervix — both central to birth. Testosterone is an androgen unrelated to parturition."},
  {cat:"reproduction",diff:"medium",theme:"CAUSES OF DYSTOCIA",options:["Fetal Malpresentation","Uterine Inertia","Cryptorchidism"],odd:2,explanation:"Malpresentation and uterine inertia are direct causes of difficult birth. Cryptorchidism is a male reproductive condition unrelated to parturition."},
  {cat:"hematology",diff:"easy",theme:"COMPONENTS OF A CBC",options:["PCV","WBC Count","ALT"],odd:2,explanation:"PCV and WBC count are CBC components. ALT is a liver enzyme on a chemistry panel, not a CBC."},
  {cat:"hematology",diff:"easy",theme:"WHITE BLOOD CELL TYPES",options:["Neutrophil","Eosinophil","Erythrocyte"],odd:2,explanation:"Neutrophils and eosinophils are leukocytes. Erythrocytes are red blood cells — not white blood cells."},
  {cat:"hematology",diff:"medium",theme:"CAUSES OF ANEMIA IN DOGS",options:["Immune-Mediated Hemolysis","Ehrlichiosis","Polycythemia"],odd:2,explanation:"Immune-mediated hemolysis and ehrlichiosis cause anemia. Polycythemia is the opposite — an increase in red blood cells."},
  {cat:"neurology",diff:"easy",theme:"SIGNS OF VESTIBULAR DISEASE",options:["Head Tilt","Nystagmus","Paraplegia"],odd:2,explanation:"Head tilt and nystagmus are hallmark vestibular signs. Paraplegia indicates spinal cord disease, not vestibular pathology."},
  {cat:"neurology",diff:"medium",theme:"CAUSES OF SEIZURES IN DOGS",options:["Idiopathic Epilepsy","Hypoglycemia","Hyperkalemia"],odd:2,explanation:"Epilepsy and hypoglycemia are recognized seizure triggers. Hyperkalemia causes cardiac arrhythmias, not seizures."},
  {cat:"dermatology",diff:"easy",theme:"CAUSES OF PRURITUS IN DOGS",options:["Atopic Dermatitis","Flea Allergy","Hypothyroidism"],odd:2,explanation:"Atopic dermatitis and flea allergy cause pruritus. Hypothyroidism causes alopecia and scaling but is not a pruritic disease."},
  {cat:"dermatology",diff:"easy",theme:"ENDOCRINE DISORDERS IN CATS",options:["Hyperthyroidism","Diabetes Mellitus","Addison's Disease"],odd:2,explanation:"Hyperthyroidism and diabetes are common feline endocrine disorders. Addison's disease is extremely rare in cats."},
  {cat:"dermatology",diff:"medium",theme:"CLINICAL SIGNS OF CUSHING'S",options:["Polydipsia","Pot-Belly","Hypoglycemia"],odd:2,explanation:"Polydipsia and pot-belly are classic Cushing's signs. Hypoglycemia is associated with Addison's or insulinoma — Cushing's causes hyperglycemia."},
];

const WCATS = [
  {key:"digestive",label:"Digestive System",icon:"🫁",color:"#14532d"},
  {key:"pharmacology",label:"Pharmacology",icon:"💊",color:"#1e3a5f"},
  {key:"reproduction",label:"Reproduction",icon:"🔬",color:"#4a1d96"},
  {key:"hematology",label:"Hematology & Immunity",icon:"🩸",color:"#7f1d1d"},
  {key:"neurology",label:"Neurology & MSK",icon:"🧠",color:"#134e4a"},
  {key:"dermatology",label:"Dermatology & Endocrine",icon:"🩺",color:"#854d0e"},
];
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
  const [ease,setEase]=useState(0);
  const [enjoy,setEnjoy]=useState(0);
  const [fbDone,setFbDone]=useState(false);
  const sessionStart=useState(()=>Date.now())[0];
  const qTimes=useState(()=>[])[0];
  const qStart=useState(()=>({current:Date.now()}))[0];
  const total=questions.length, q=questions[idx], rank=getWRank(score);
  const catInfo=WCATS.find(c=>c.key===q?.cat)||WCATS[0];

  const handlePick=i=>{
    if(locked||tries.includes(i))return;
    const nt=[...tries,i];setTries(nt);
    const ok=i===q.odd;
    if(ok||nt.length>=2){
      setLocked(true);
      qTimes.push({theme:q.theme,elapsed:Date.now()-qStart.current,correct:ok,tries:nt.length});
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
    const dur=Date.now()-sessionStart;
    for(const qt of qTimes)postToAirtable("Word Association",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Word Association",Type:"question",Label:qt.theme,Correct:qt.correct?"Yes":"No",Tries:qt.tries,"Elapsed (s)":Math.round(qt.elapsed/1000)});
    postToAirtable("Word Association",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Word Association",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qTimes.length,"Drop-Off":"No","Drop-Off At":"—","Ease Rating":"—","Enjoy Rating":"—",Platform:navigator.userAgent.includes("iPad")||navigator.userAgent.includes("iPhone")?"ios":"other"});
  };

  const submitFb=()=>{
    postToAirtable("Word Association",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Word Association",Type:"feedback","Ease Rating":String(ease),"Enjoy Rating":String(enjoy)});
    setFbDone(true);
  };

  if(screen==="done"){
    const eLabels=["Very Hard","Hard","OK","Easy","Very Easy"],eEmojis=["😞","😐","🙂","😄","🤩"],finalRank=getWRank(score);
    return(
      <div style={{...S.center,background:"#0f172a"}}>
        <div style={{maxWidth:620,width:"100%",textAlign:"center"}}>
          {!fbDone?(<>
            <h2 style={{color:"#fbbf24",fontSize:28,fontWeight:"bold",marginBottom:8}}>🏁 Session Complete!</h2>
            <p style={{color:"#fbbf24",fontSize:22,fontWeight:"bold",marginBottom:20}}>{finalRank.icon} {finalRank.title}</p>
            <div style={{...S.card,textAlign:"left"}}>
              <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",marginBottom:10}}>HOW EASY WAS THIS TO USE?</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:16}}>
                {eLabels.map((l,i)=>{const a=ease===i+1;return(<button key={i} onClick={()=>setEase(i+1)} style={{background:a?"#fbbf24":"#0f172a",color:a?"#0f172a":"#e2e8f0",border:`2px solid ${a?"#fbbf24":"#334155"}`,borderRadius:12,padding:"12px 8px",fontSize:15,fontWeight:"bold",cursor:"pointer",minWidth:70}}>{"⭐".repeat(i+1)}<br/><span style={{fontSize:12}}>{l}</span></button>);})}
              </div>
              <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",marginBottom:10}}>HOW DID YOU ENJOY THIS GAME?</p>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                {eEmojis.map((e,i)=>{const a=enjoy===i+1;return(<button key={i} onClick={()=>setEnjoy(i+1)} style={{background:a?"#1e3a5f":"#0f172a",border:`3px solid ${a?"#7dd3fc":"#334155"}`,borderRadius:14,padding:"12px",fontSize:34,cursor:"pointer",transform:a?"scale(1.2)":"scale(1)"}}>{e}</button>);})}
              </div>
            </div>
            <button onClick={submitFb} disabled={!ease||!enjoy} style={{...S.goldBtn,opacity:ease&&enjoy?1:0.4,marginBottom:12}}>Submit Feedback</button><br/>
            <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"none",fontSize:16,cursor:"pointer",marginTop:8}}>← Back to Hub</button>
          </>):(<>
            <div style={{fontSize:64,marginBottom:16}}>🙏</div>
            <h2 style={{color:"#fbbf24",fontSize:28,fontWeight:"bold",marginBottom:12}}>Thank You, Doctor!</h2>
            <button onClick={onBack} style={S.goldBtn}>← Back to Hub</button>
          </>)}
        </div>
      </div>
    );
  }

  return(
    <div style={{...S.page,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{maxWidth:660,width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"8px 16px",fontSize:15,cursor:"pointer"}}>← Hub</button>
          <div style={{textAlign:"right"}}>
            <span style={{color:"#fbbf24",fontSize:16,fontWeight:"bold"}}>{rank.icon} {rank.title}</span>
            <span style={{color:"#64748b",fontSize:14,display:"block"}}>Score: {score}</span>
          </div>
        </div>
        <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:8}}>
          <div style={{background:"#fbbf24",height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{background:catInfo.color,color:"#fff",fontSize:14,fontWeight:"bold",padding:"4px 14px",borderRadius:20}}>{catInfo.icon} {catInfo.label}</span>
          <span style={{color:q.diff==="easy"?"#22c55e":"#fbbf24",fontSize:13,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1}}>{q.diff}</span>
        </div>
        <div style={{background:"#1e293b",borderRadius:20,padding:"28px 24px",marginBottom:22,border:"2px solid #334155",textAlign:"center"}}>
          <p style={{color:"#7dd3fc",fontSize:14,fontWeight:"bold",letterSpacing:2,marginBottom:12}}>THEME WORD</p>
          <div style={{background:"#0f172a",borderRadius:14,padding:"18px 24px",display:"inline-block",marginBottom:18}}>
            <span style={{fontSize:34,fontWeight:"bold",color:"#fbbf24",letterSpacing:2}}>{q.theme}</span>
          </div>
          <p style={{color:"#94a3b8",fontSize:18}}>Which word does <strong style={{color:"#fbbf24"}}>NOT</strong> belong?</p>
        </div>
        {!locked&&tries.length===0&&<p style={{color:"#64748b",fontSize:15,textAlign:"center",marginBottom:14}}>You have 2 attempts</p>}
        {!locked&&tries.length===1&&<p style={{color:"#fbbf24",fontSize:16,fontWeight:"bold",textAlign:"center",marginBottom:14}}>⚠️ Last attempt</p>}
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
          {q.options.map((word,i)=>{
            const ww=tries.includes(i)&&i!==q.odd,ic=locked&&i===q.odd;
            return(<button key={i} onClick={()=>!locked&&!tries.includes(i)&&handlePick(i)} style={{background:ic?"#14532d":ww?"#7f1d1d":"#1e293b",border:`2px solid ${ic?"#22c55e":ww?"#ef4444":"#334155"}`,borderRadius:16,padding:"22px 28px",fontSize:24,fontWeight:"bold",color:ic?"#bbf7d0":ww?"#fecaca":"#e2e8f0",textAlign:"center",cursor:!locked&&!tries.includes(i)?"pointer":"default",opacity:locked&&!ic&&!ww?0.45:1}}>
              {word}{ic&&<span style={{fontSize:16,marginLeft:12}}>← Odd one out ✅</span>}{ww&&<span style={{fontSize:16,marginLeft:12}}>❌</span>}
            </button>);
          })}
        </div>
        {locked&&(()=>{const gotIt=tries.includes(q.odd),first=gotIt&&tries.length===1;return(
          <div style={{background:gotIt?"#14532d":"#7f1d1d",border:`2px solid ${gotIt?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"18px 22px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><StarRow count={first?3:gotIt?2:0} size={22}/></div>
            <p style={{color:gotIt?"#bbf7d0":"#fecaca",fontSize:18,fontWeight:"bold",marginBottom:10,textAlign:"center"}}>{first?"🎉 Correct on first try!":gotIt?"✅ Correct on second try!":`❌ Odd one out: "${q.options[q.odd]}"`}</p>
            <p style={{color:"#e2e8f0",fontSize:18,lineHeight:1.8,fontWeight:"bold"}}>{q.explanation}</p>
          </div>
        );})()}
        {locked&&<button onClick={handleNext} style={{...S.goldBtn,width:"100%",padding:"18px"}}>{idx+1>=total?"See Final Score 🏁":"Next Round →"}</button>}
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [game, setGame] = useState(null);
  if (game === "diagnosis") return <DiagnosisGame onBack={()=>setGame(null)}/>;
  if (game === "pattern")   return <PatternGame   onBack={()=>setGame(null)}/>;
  if (game === "word")      return <WordGame       onBack={()=>setGame(null)}/>;
  return <Hub onSelect={setGame}/>;
}