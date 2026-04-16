import { useState, useEffect, useRef } from "react";

// ── Airtable ──────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
async function postToAirtable(table, fields) {
  try {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`, {
      method:"POST", headers:{"Authorization":`Bearer ${AIRTABLE_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({records:[{fields}]}),
    });
  } catch(e){console.error("Airtable:",e);}
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function detectPlatform(){const ua=navigator.userAgent;if(/iPad|iPhone|iPod/.test(ua))return"ios";if(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)return"ios";if(/Macintosh|Mac OS X/.test(ua))return"mac";if(/Windows/.test(ua))return"windows";return"other";}
function getPreferredVoice(voices){const p=detectPlatform();if(p==="ios")return voices.find(v=>/daniel/i.test(v.name)&&/en/i.test(v.lang))||voices.find(v=>/karen|samantha|moira/i.test(v.name))||voices.find(v=>v.lang==="en-GB")||voices.find(v=>v.lang==="en-US")||voices[0];return voices.find(v=>/gordon/i.test(v.name)&&/en/i.test(v.lang))||voices.find(v=>/gordon/i.test(v.name))||voices.find(v=>/daniel|oliver|arthur/i.test(v.name))||voices.find(v=>v.lang==="en-GB")||voices.find(v=>v.lang==="en-US")||voices[0];}
function speakText(text,onStart,onEnd){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const voices=window.speechSynthesis.getVoices();const utt=new SpeechSynthesisUtterance(text);utt.rate=0.78;utt.pitch=0.85;utt.volume=1.0;const pref=getPreferredVoice(voices);if(pref)utt.voice=pref;utt.onstart=onStart||(()=>{});utt.onend=onEnd||(()=>{});utt.onerror=onEnd||(()=>{});window.speechSynthesis.speak(utt);}

function AudioButton({text,large=false}){
  const[speaking,setSpeaking]=useState(false);
  useEffect(()=>()=>window.speechSynthesis?.cancel(),[]);
  const handle=()=>{if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}speakText(text,()=>setSpeaking(true),()=>setSpeaking(false));};
  return(<button onClick={handle} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,background:speaking?"#1e3a5f":"#fbbf24",color:speaking?"#7dd3fc":"#0f172a",border:`3px solid ${speaking?"#7dd3fc":"#f59e0b"}`,borderRadius:18,padding:large?"24px 32px":"18px 24px",fontSize:large?24:20,fontWeight:"bold",cursor:"pointer",width:"100%",boxShadow:speaking?"none":"0 4px 24px rgba(251,191,36,0.35)",transition:"all 0.2s",marginBottom:12}}>
    <span style={{fontSize:large?44:30}}>{speaking?"⏹️":"🔊"}</span>
    <span style={{textAlign:"left",lineHeight:1.4}}>{speaking?"Tap to stop":large?<><span style={{fontSize:24,fontWeight:"bold"}}>TAP HERE FIRST</span><br/><span style={{fontSize:20,fontWeight:"bold"}}>Hear how to play</span></>:"Read this to me"}</span>
  </button>);
}

// ── Shared ────────────────────────────────────────────────────────────────────
const BG="#0f172a",GOLD="#fbbf24",LIGHT="#cbd5e1";
const page={background:BG,minHeight:"100vh",fontFamily:"Georgia,serif",color:"#e2e8f0",padding:"24px 16px"};
const center={background:BG,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:"Georgia,serif"};
const goldBtn={background:GOLD,color:BG,fontSize:22,fontWeight:"bold",padding:"20px 48px",borderRadius:16,border:"none",cursor:"pointer"};
const card={background:"#1e293b",borderRadius:16,padding:"20px 24px",border:"1px solid #334155",marginBottom:16};
const StarRow=({count,size=24})=><div style={{display:"flex",gap:3}}>{[1,2,3].map(i=><span key={i} style={{fontSize:size,filter:i<=count?"none":"grayscale(1) opacity(0.2)"}}>⭐</span>)}</div>;

function FeedbackScreen({onBack,gameName,table}){
  const[ease,setEase]=useState(0),[enjoy,setEnjoy]=useState(0),[done,setDone]=useState(false);
  const eL=["Very Hard","Hard","OK","Easy","Very Easy"],eE=["😞","😐","🙂","😄","🤩"];
  const submit=()=>{postToAirtable(table,{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:gameName,Type:"feedback","Ease Rating":String(ease),"Enjoy Rating":String(enjoy)});setDone(true);};
  if(done)return(<div style={center}><div style={{maxWidth:580,width:"100%",textAlign:"center"}}><div style={{fontSize:64,marginBottom:16}}>🙏</div><h2 style={{color:GOLD,fontSize:30,fontWeight:"bold",marginBottom:12}}>Thank You!</h2><p style={{color:LIGHT,fontSize:20,fontWeight:"bold",marginBottom:28}}>Your feedback has been saved.</p><button onClick={onBack} style={goldBtn}>← Back to Hub</button></div></div>);
  return(<div style={center}><div style={{maxWidth:620,width:"100%",textAlign:"center"}}>
    <div style={{fontSize:52,marginBottom:12}}>📋</div>
    <h2 style={{color:GOLD,fontSize:30,fontWeight:"bold",marginBottom:8}}>Quick Feedback</h2>
    <p style={{color:LIGHT,fontSize:20,fontWeight:"bold",marginBottom:28}}>Two quick questions — tap your answer below.</p>
    <div style={card}>
      <p style={{color:"#7dd3fc",fontSize:18,fontWeight:"bold",marginBottom:8}}>HOW EASY WAS THIS TO USE?</p>
      <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginTop:12}}>
        {eL.map((label,i)=>{const a=ease===i+1;return(<button key={i} onClick={()=>setEase(i+1)} style={{background:a?GOLD:"#0f172a",color:a?BG:"#e2e8f0",border:`2px solid ${a?GOLD:"#334155"}`,borderRadius:14,padding:"16px 10px",fontSize:16,fontWeight:"bold",cursor:"pointer",minWidth:76}}>{"⭐".repeat(i+1)}<br/><span style={{fontSize:13,display:"block",marginTop:4}}>{label}</span></button>);})}
      </div>
    </div>
    <div style={card}>
      <p style={{color:"#7dd3fc",fontSize:18,fontWeight:"bold",marginBottom:8}}>HOW DID YOU ENJOY THIS GAME?</p>
      <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap",marginTop:12}}>
        {eE.map((emoji,i)=>{const a=enjoy===i+1;return(<button key={i} onClick={()=>setEnjoy(i+1)} style={{background:a?"#1e3a5f":"#0f172a",border:`3px solid ${a?"#7dd3fc":"#334155"}`,borderRadius:16,padding:"16px",fontSize:38,cursor:"pointer",minWidth:68,transform:a?"scale(1.18)":"scale(1)"}}>{emoji}</button>);})}
      </div>
    </div>
    <button onClick={submit} disabled={!ease||!enjoy} style={{...goldBtn,opacity:ease&&enjoy?1:0.4,marginBottom:12}}>Submit Feedback</button><br/>
    <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"none",fontSize:17,cursor:"pointer",marginTop:8}}>Skip →</button>
  </div></div>);
}

// ── HUB ───────────────────────────────────────────────────────────────────────
const HUB_TTS=`Welcome to Cognitive Games. This is a suite of brain training games designed for sharp, curious minds of all ages. There are five games to choose from. Animal Diagnosis Challenge — clinical reasoning with real veterinary cases. Pattern Completion — visual logic puzzles across three levels. Veterinary Word Association — find the term that doesn't belong. What Would You Do — everyday decision-making stories. And Memory Pair Match — a card matching memory game. Take your time, tap any game to begin, and enjoy.`;

function Hub({onSelect}){
  const games=[
    {id:"diagnosis",icon:"🐾",title:"Animal Diagnosis Challenge",desc:"Clinical reasoning across Dogs, Cats & Chickens",color:"#7dd3fc"},
    {id:"pattern",  icon:"🧩",title:"Pattern Completion",         desc:"Visual logic puzzles across 3 difficulty levels", color:"#c084fc"},
    {id:"word",     icon:"🔤",title:"Veterinary Word Association", desc:"Find the clinical term that doesn't belong",      color:"#86efac"},
    {id:"stories",  icon:"🌍",title:"What Would You Do?",          desc:"Everyday decision-making scenarios",              color:"#f97316"},
    {id:"memory",   icon:"🃏",title:"Memory Pair Match",           desc:"Flip cards and find the matching pairs",          color:"#fbbf24"},
  ];
  return(<div style={center}><div style={{maxWidth:680,width:"100%",textAlign:"center"}}>
    <div style={{fontSize:72,marginBottom:16}}>🧠</div>
    <h1 style={{fontSize:38,fontWeight:"bold",color:GOLD,marginBottom:12,lineHeight:1.2}}>Cognitive Games</h1>
    <p style={{fontSize:22,color:LIGHT,fontWeight:"bold",marginBottom:24,lineHeight:1.6}}>A suite of brain training games for sharp, curious minds — designed with care for players of all ages and abilities.</p>
    <AudioButton text={HUB_TTS} large/>
    <p style={{color:LIGHT,fontSize:19,fontWeight:"bold",marginBottom:24}}>We'll walk you through everything before you start.</p>
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
      {games.map(g=>(<button key={g.id} onClick={()=>onSelect(g.id)} style={{background:"#1e293b",border:`2px solid ${g.color}44`,borderRadius:18,padding:"22px 28px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:20}}>
        <span style={{fontSize:44}}>{g.icon}</span>
        <div><p style={{color:g.color,fontSize:22,fontWeight:"bold",margin:"0 0 4px"}}>{g.title}</p><p style={{color:LIGHT,fontSize:18,fontWeight:"bold",margin:0}}>{g.desc}</p></div>
      </button>))}
    </div>
    <p style={{color:LIGHT,fontSize:19,fontWeight:"bold"}}>No time limits · Large text · Accessibility first</p>
  </div></div>);
}

// ── ANIMAL DIAGNOSIS ──────────────────────────────────────────────────────────
const DIAG_TTS=`Hey, welcome. This is the Animal Diagnosis Challenge — built for someone with real clinical experience. Each round gives you a patient with presenting symptoms. Pick the right diagnosis from three options. You get two attempts per case, and after each one we'll walk through exactly what the diagnosis was and why. No time pressure. Take as long as you need. Tap Begin Rounds when you're ready.`;
const DIAG_BYE=`Well done, Doctor. You've made it through all the cases. That kind of clinical recall doesn't just disappear — it stays with you. Come back whenever you're ready for another round.`;
const DIAG_SC={canine:{banner:"#1e3a5f",accent:"#7dd3fc",label:"CANINE",bg:"#080f1c"},feline:{banner:"#3b0764",accent:"#c084fc",label:"FELINE",bg:"#0e0718"},chicken:{banner:"#92400e",accent:"#fbbf24",label:"POULTRY",bg:"#1c1008"}};
const DIAG_RANKS=[{title:"Veterinary Intern",min:0,icon:"🩺"},{title:"Junior Practitioner",min:4,icon:"📋"},{title:"General Practitioner",min:8,icon:"🔬"},{title:"Senior Clinician",min:13,icon:"🧬"},{title:"Clinical Specialist",min:18,icon:"🏅"},{title:"Consulting Veterinarian",min:23,icon:"🎖️"},{title:"Chief of Veterinary Medicine",min:28,icon:"🏆"}];
const getDR=s=>{let r=DIAG_RANKS[0];for(const x of DIAG_RANKS)if(s>=x.min)r=x;return r;};
const DIAG_BADGES=[{key:"canine",label:"Canine Expert",icon:"🐕",color:"#1e3a5f"},{key:"feline",label:"Feline Expert",icon:"🐈",color:"#4a1d96"},{key:"chicken",label:"Poultry Specialist",icon:"🐔",color:"#854d0e"}];
const getDB=hist=>{const c={};for(const{species,correct}of hist){if(!c[species])c[species]={ok:0,n:0};c[species].n++;if(correct)c[species].ok++;}return DIAG_BADGES.filter(b=>c[b.key]&&c[b.key].ok>=2);};
const CASES=[
  {species:"canine",animal:"🐕 Golden Retriever",name:"Max",age:"8 years",sex:"Male (neutered)",symptoms:["Excessive thirst and urination","Pot-bellied appearance","Symmetrical hair loss on flanks","Lethargy and muscle weakness"],options:["Hypothyroidism","Hyperadrenocorticism (Cushing's Disease)","Diabetes Mellitus"],correct:1,explanation:"Cushing's Disease classically presents with PU/PD, pot-belly from muscle wasting, and bilateral flank alopecia due to excess cortisol. A hallmark in older dogs."},
  {species:"canine",animal:"🐕 Dachshund",name:"Fritz",age:"6 years",sex:"Male (neutered)",symptoms:["Sudden onset paralysis of hind limbs","Crying out when back is touched","History of jumping off furniture","Inability to urinate"],options:["Hip Dysplasia","Intervertebral Disc Disease (IVDD)","Degenerative Myelopathy"],correct:1,explanation:"IVDD is the classic chondrodystrophic breed emergency. Rapid-onset paralysis, pain, and bladder dysfunction are the giveaways."},
  {species:"canine",animal:"🐕 Boxer",name:"Rocky",age:"7 years",sex:"Male (intact)",symptoms:["Rapid abdominal distension","Unproductive retching","Restlessness and hypersalivation","Pale gums and rapid heart rate"],options:["Acute Pancreatitis","Gastric Dilatation-Volvulus (GDV)","Splenic Mass Rupture"],correct:1,explanation:"GDV is a life-threatening emergency in deep-chested breeds. Gastric twisting traps gas and cuts off blood supply — cardiovascular collapse follows quickly without intervention."},
  {species:"canine",animal:"🐕 Labrador Retriever",name:"Bailey",age:"9 years",sex:"Female (spayed)",symptoms:["Progressive hindlimb weakness","Difficulty rising from rest","Painful on lumbar palpation","Normal forelimb strength"],options:["Degenerative Myelopathy","Lumbosacral Stenosis","Fibrocartilaginous Embolism"],correct:1,explanation:"Lumbosacral stenosis is common in large breeds. Pelvic limb weakness and lumbosacral pain are key — often misattributed to hip dysplasia until a careful neuro exam is done."},
  {species:"canine",animal:"🐕 Border Collie",name:"Finn",age:"3 years",sex:"Male (intact)",symptoms:["Seizure lasting 90 seconds","Paddling limbs and jaw chomping","Disoriented for 20 minutes after","No prior illness or trauma"],options:["Portosystemic Shunt","Idiopathic Epilepsy","Hypoglycaemia"],correct:1,explanation:"Idiopathic epilepsy is the most common cause of seizures in young to middle-aged dogs. Classic tonic-clonic episode with post-ictal confusion and no metabolic history."},
  {species:"canine",animal:"🐕 German Shepherd",name:"Rex",age:"11 years",sex:"Male (neutered)",symptoms:["Gradual hindlimb ataxia over 12 months","Knuckling of rear paws","No spinal pain on palpation","Normal bladder and bowel"],options:["Lumbosacral Stenosis","Degenerative Myelopathy","Fibrocartilaginous Embolism"],correct:1,explanation:"Degenerative myelopathy — slow, painless progressive ataxia in hindlimbs with knuckling. No pain differentiates it from disc disease."},
  {species:"feline",animal:"🐈 Domestic Shorthair",name:"Luna",age:"12 years",sex:"Female (spayed)",symptoms:["Weight loss despite increased appetite","Increased vocalization","Heart rate of 240 bpm","Fine muscle tremors"],options:["Hyperthyroidism","Chronic Kidney Disease","Inflammatory Bowel Disease"],correct:0,explanation:"Hyperthyroidism is the most common endocrine disorder in cats over 10. Weight loss with ravenous appetite and tachycardia — the contrast between eating well and losing weight is the giveaway."},
  {species:"feline",animal:"🐈 Maine Coon",name:"Thor",age:"5 years",sex:"Male (neutered)",symptoms:["Sudden hind limb paralysis","Cold and painful hind limbs","Absent femoral pulses bilaterally","Crying out in severe pain"],options:["Spinal Cord Injury","Aortic Thromboembolism (Saddle Thrombus)","Feline Infectious Peritonitis"],correct:1,explanation:"Aortic thromboembolism — thrombus lodges at the aortic bifurcation. Bilateral cold limbs and absent pulses are unmistakable."},
  {species:"feline",animal:"🐈 Persian",name:"Bella",age:"8 years",sex:"Female (spayed)",symptoms:["Increased water intake and urination","Weight loss over several months","Unkempt coat and lethargy","Vomiting 2–3 times per week"],options:["Hyperthyroidism","Chronic Kidney Disease","Diabetes Mellitus"],correct:1,explanation:"Chronic kidney disease in middle-aged to older cats — PU/PD, weight loss, vomiting, and a dull coat are the hallmarks."},
  {species:"feline",animal:"🐈 Siamese",name:"Mochi",age:"6 years",sex:"Male (neutered)",symptoms:["Straining in litter box with little output","Crying when urinating","Blood-tinged urine","Restlessness and frequent box visits"],options:["Constipation","Feline Idiopathic Cystitis (FIC)","Urinary Tract Infection"],correct:1,explanation:"FIC is the most common cause of lower urinary tract signs in young male cats. Straining, haematuria, and frequent attempts with little output — classic FIC."},
  {species:"chicken",animal:"🐔 Rhode Island Red",name:"Rosie",age:"2 years",sex:"Female (hen)",symptoms:["Egg-laying stopped suddenly","Distended abdomen with fluid wave","Lethargy and tail drooping","Laboured breathing when handled"],options:["Egg Binding","Ascites (Water Belly)","Egg Yolk Peritonitis"],correct:2,explanation:"Egg Yolk Peritonitis — yolk enters the abdomen triggering inflammation. Fluid accumulation, cessation of laying, and dyspnoea are key signs."},
  {species:"chicken",animal:"🐔 Buff Orpington",name:"Goldie",age:"3 years",sex:"Female (hen)",symptoms:["Egg stuck visible at vent","Straining without passing egg","Hunched posture","Vent area swollen and reddened"],options:["Cloacal Prolapse","Egg Binding","Vent Gleet"],correct:1,explanation:"Egg binding — visible egg at vent with straining and hunched posture. Warm soaking, lubrication, and calcium supplementation are first-line."},
  {species:"chicken",animal:"🐔 Leghorn",name:"Pearl",age:"1 year",sex:"Female (hen)",symptoms:["Sudden flock-wide respiratory distress","Gasping and tracheal rales","Nasal discharge and conjunctivitis","40% mortality in 48h"],options:["Infectious Laryngotracheitis (ILT)","Newcastle Disease","Avian Influenza"],correct:0,explanation:"ILT — herpesvirus causing acute severe respiratory distress. Gasping, bloody tracheal mucus, and rapid flock spread are hallmarks."},
  {species:"chicken",animal:"🐔 Sussex",name:"Hazel",age:"18 months",sex:"Female (hen)",symptoms:["Pale comb and wattles","Watery green diarrhoea","Sudden drop in egg production","High fever — 110°F"],options:["Fowl Cholera","Coccidiosis","Infectious Bursal Disease"],correct:0,explanation:"Fowl Cholera (Pasteurella multocida) — high fever, green diarrhoea, pale comb, and rapid flock spread. Prompt bacteriology is essential."},
  {species:"chicken",animal:"🐔 Silkie",name:"Flossy",age:"1 year",sex:"Female (hen)",symptoms:["Thickened crusty leg scales","Legs lifted repeatedly when walking","Scaly debris lifting from shanks","Bird pecks at own legs"],options:["Bumblefoot","Scaly Leg Mite (Knemidocoptes mutans)","Dermatitis"],correct:1,explanation:"Scaly Leg Mite burrows under scales causing crusting and thickening. Silkies are especially prone. Treat with petroleum jelly or ivermectin."},
];

function DiagnosisGame({onBack}){
  const[cases]=useState(()=>[...CASES].sort(()=>Math.random()-0.5));
  const[idx,setIdx]=useState(0),[tries,setTries]=useState([]),[selected,setSelected]=useState(null),[score,setScore]=useState(0),[history,setHistory]=useState([]),[screen,setScreen]=useState("home");
  const ss=useRef(Date.now()),qt=useRef([]),qs=useRef(Date.now());
  const c=cases[idx],total=cases.length,rank=getDR(score),sc=DIAG_SC[c?.species]||DIAG_SC.canine,isLocked=selected!==null;
  const handleAnswer=i=>{if(isLocked||tries.includes(i))return;const nt=[...tries,i];setTries(nt);const ok=i===c.correct;if(ok||nt.length>=2){setSelected(i);qt.current.push({animal:c.animal,elapsed:Date.now()-qs.current,correct:ok,tries:nt.length});const nh=[...history,{species:c.species,correct:ok}];setHistory(nh);if(ok&&nt.length===1)setScore(s=>s+1);}};
  const handleNext=()=>{qs.current=Date.now();if(idx+1>=total){finalize();setScreen("done");return;}setIdx(i=>i+1);setTries([]);setSelected(null);};
  const finalize=()=>{const dur=Date.now()-ss.current;for(const q of qt.current)postToAirtable("Animal Diagnosis",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Animal Diagnosis",Type:"question",Label:q.animal,Correct:q.correct?"Yes":"No",Tries:q.tries,"Elapsed (s)":Math.round(q.elapsed/1000)});postToAirtable("Animal Diagnosis",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Animal Diagnosis",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qt.current.length,"Drop-Off":"No","Ease Rating":"—","Enjoy Rating":"—",Platform:detectPlatform()});setTimeout(()=>speakText(DIAG_BYE,null,null),700);};
  const fmsg=()=>{if(!isLocked&&tries.length===1)return{bg:"#78350f",border:"#f59e0b",tc:"#fde68a",title:"⚠️ Not quite — one more try!",body:null};if(isLocked&&tries.includes(c.correct))return{bg:"#14532d",border:"#22c55e",tc:"#bbf7d0",title:tries.length===1?"✅ Correct Diagnosis!":"✅ Correct on second try!",body:c.explanation};if(isLocked)return{bg:"#7f1d1d",border:"#ef4444",tc:"#fecaca",title:`❌ Correct: ${c.options[c.correct]}`,body:c.explanation};return null;};
  const f=fmsg();
  const bCol=i=>{if(isLocked&&i===c.correct)return{bg:"#14532d",text:"#bbf7d0",border:"#22c55e"};if(tries.includes(i)&&i!==c.correct)return{bg:"#7f1d1d",text:"#fecaca",border:"#ef4444"};if(isLocked)return{bg:"#1e293b",text:"#64748b",border:"#334155"};return{bg:"#1e3a5f",text:"#e2e8f0",border:"#3b82f6"};};
  if(screen==="home")return(<div style={center}><div style={{maxWidth:660,width:"100%",textAlign:"center"}}><div style={{fontSize:72,marginBottom:16}}>🐾</div><h1 style={{fontSize:36,fontWeight:"bold",color:GOLD,marginBottom:12}}>Animal Diagnosis Challenge</h1><p style={{fontSize:22,color:LIGHT,fontWeight:"bold",marginBottom:24,lineHeight:1.5}}>A clinical reasoning game for the experienced veterinary mind.</p><AudioButton text={DIAG_TTS} large/><p style={{color:LIGHT,fontSize:19,fontWeight:"bold",marginBottom:24}}>We'll walk you through everything before you start.</p><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}><button onClick={()=>setScreen("game")} style={goldBtn}>Begin Rounds →</button><button onClick={onBack} style={{background:"#1e293b",color:"#7dd3fc",fontSize:18,fontWeight:"bold",padding:"18px 28px",borderRadius:16,border:"2px solid #334155",cursor:"pointer"}}>← Hub</button></div><p style={{color:LIGHT,fontSize:19,fontWeight:"bold"}}>No time limits · Large text · 2 attempts per case</p></div></div>);
  if(screen==="done")return <FeedbackScreen onBack={onBack} gameName="Animal Diagnosis" table="Animal Diagnosis"/>;
  return(<div style={{...page,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{maxWidth:700,width:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:16,cursor:"pointer"}}>← Hub</button><div style={{textAlign:"right"}}><span style={{color:GOLD,fontSize:18,fontWeight:"bold"}}>{rank.icon} {rank.title}</span><span style={{color:LIGHT,fontSize:18,fontWeight:"bold",display:"block"}}>Score: {score}</span></div></div>
    <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:24}}><div style={{background:GOLD,height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/></div>
    <div style={{borderRadius:22,overflow:"hidden",marginBottom:20,border:`2px solid ${sc.accent}44`}}>
      <div style={{background:sc.banner,padding:"10px 20px",display:"flex",justifyContent:"space-between"}}><span style={{color:sc.accent,fontSize:15,fontWeight:"bold",letterSpacing:2}}>{sc.label}</span><span style={{color:sc.accent,fontSize:15}}>Case {idx+1} of {total}</span></div>
      <div style={{background:`radial-gradient(ellipse at center,${sc.banner}99 0%,${sc.bg} 70%)`,padding:"28px 20px 20px",textAlign:"center"}}>
        <div style={{fontSize:88,marginBottom:8}}>{c.animal.split(" ")[0]}</div>
        <h2 style={{fontSize:28,color:sc.accent,fontWeight:"bold",margin:"0 0 12px"}}>{c.animal.split(" ").slice(1).join(" ")}</h2>
        <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap"}}>{[`👤 ${c.name}`,`🎂 ${c.age}`,`⚕ ${c.sex}`].map((t,i)=><span key={i} style={{background:`${sc.accent}22`,color:sc.accent,borderRadius:20,padding:"8px 18px",fontSize:18,fontWeight:"bold"}}>{t}</span>)}</div>
      </div>
      <div style={{background:"#111827",padding:"18px 22px 20px"}}>
        <p style={{color:sc.accent,fontSize:15,fontWeight:"bold",letterSpacing:2,marginBottom:14}}>PRESENTING SYMPTOMS</p>
        {c.symptoms.map((s,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",marginBottom:12,background:"#1e293b",borderRadius:10,padding:"12px 14px",border:`1px solid ${sc.accent}22`}}><span style={{color:sc.accent,fontSize:18,marginRight:12,flexShrink:0}}>▸</span><span style={{color:"#e2e8f0",fontSize:20,lineHeight:1.5,fontWeight:"bold"}}>{s}</span></div>)}
      </div>
    </div>
    <p style={{color:"#7dd3fc",fontSize:21,fontWeight:"bold",textAlign:"center",marginBottom:10}}>WHAT IS YOUR DIAGNOSIS?</p>
    {!isLocked&&tries.length===0&&<p style={{color:LIGHT,fontSize:19,fontWeight:"bold",textAlign:"center",marginBottom:14}}>You have 2 attempts per case</p>}
    {!isLocked&&tries.length===1&&<p style={{color:GOLD,fontSize:19,fontWeight:"bold",textAlign:"center",marginBottom:14}}>⚠️ 1 attempt remaining — choose carefully</p>}
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>{c.options.map((opt,i)=>{const col=bCol(i);return(<button key={i} onClick={()=>handleAnswer(i)} style={{background:col.bg,color:col.text,border:`2px solid ${col.border}`,borderRadius:14,padding:"20px 22px",fontSize:21,fontWeight:"bold",textAlign:"left",cursor:!isLocked&&!tries.includes(i)?"pointer":"default",lineHeight:1.4,opacity:isLocked&&!tries.includes(i)&&i!==c.correct?0.5:1}}>{String.fromCharCode(65+i)}. &nbsp;{opt}</button>);})}</div>
    {f&&<div style={{background:f.bg,border:`2px solid ${f.border}`,borderRadius:16,padding:"20px 22px",marginBottom:20}}><p style={{color:f.tc,fontSize:20,fontWeight:"bold",marginBottom:f.body?12:0}}>{f.title}</p>{f.body&&<><p style={{color:"#e2e8f0",fontSize:20,lineHeight:1.8,fontWeight:"bold",marginBottom:8}}>{f.body}</p><AudioButton text={f.body}/></>}</div>}
    {isLocked&&<button onClick={handleNext} style={{...goldBtn,width:"100%",padding:"20px"}}>{idx+1>=total?"See Final Score 🏁":"Next Case →"}</button>}
  </div></div>);
}

// ── PATTERN COMPLETION ────────────────────────────────────────────────────────
const PAT_TTS=`Hey, welcome. You'll see four shapes in a row and your job is to figure out what comes fifth. Each puzzle has a pattern — could be the colours, could be the shapes, could be both. You get two tries per puzzle, no timer, no rush. After each one we'll walk through exactly what the pattern was. Tap Start Puzzles when you're ready.`;
const PAT_BYE=`And that's a wrap. You made it through all ten puzzles. Every one of those patterns took real focus to work through. Come back whenever you're ready for another round.`;
const COLORS={red:{fill:"#ef4444",stroke:"#991b1b",label:"Red"},blue:{fill:"#3b82f6",stroke:"#1d4ed8",label:"Blue"},yellow:{fill:"#fbbf24",stroke:"#b45309",label:"Yellow"},green:{fill:"#22c55e",stroke:"#15803d",label:"Green"},purple:{fill:"#a855f7",stroke:"#7e22ce",label:"Purple"},orange:{fill:"#f97316",stroke:"#c2410c",label:"Orange"}};
const CK=Object.keys(COLORS),SHAPES=["circle","square","triangle","diamond","star","hexagon"],SIZES=["small","medium","large"],SPX={small:42,medium:82,large:130};
function ShapeEl({shape,color,dim=80}){const sz=dim,c=COLORS[color],cx=sz/2,cy=sz/2,r=sz*0.42,sw=Math.max(3,sz*0.06);const poly=n=>{const p=[];for(let i=0;i<n;i++){const a=(i*2*Math.PI)/n-Math.PI/2;p.push(`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`);}return p.join(" ");};const star=()=>{const p=[],or=r,ir=r*0.42,n=5;for(let i=0;i<n*2;i++){const a=(i*Math.PI)/n-Math.PI/2,rr=i%2===0?or:ir;p.push(`${cx+rr*Math.cos(a)},${cy+rr*Math.sin(a)}`);}return p.join(" ");};const cm={fill:c.fill,stroke:c.stroke,strokeWidth:sw,strokeLinejoin:"round"};return(<svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{display:"block"}}>{shape==="circle"&&<circle cx={cx} cy={cy} r={r} {...cm}/>}{shape==="square"&&<rect x={sz*.08} y={sz*.08} width={sz*.84} height={sz*.84} rx={sz*.08} {...cm}/>}{shape==="triangle"&&<polygon points={poly(3)} {...cm}/>}{shape==="diamond"&&<polygon points={poly(4)} {...cm}/>}{shape==="star"&&<polygon points={star()} {...cm}/>}{shape==="hexagon"&&<polygon points={poly(6)} {...cm}/>}</svg>);}
const sh=a=>[...a].sort(()=>Math.random()-0.5),pk=(a,n)=>sh(a).slice(0,n),rnd=a=>a[Math.floor(Math.random()*a.length)],cyc=(a,i)=>a[i%a.length];
function genL1(){const shape=rnd(SHAPES),[c1,c2]=pk(CK,2),C1=COLORS[c1].label,C2=COLORS[c2].label;const pats=[{seq:[c1,c1,c2,c2,c1],ex:`The colours move in pairs — two ${C1}s, then two ${C2}s, then back to ${C1}.`},{seq:[c1,c2,c1,c2,c1],ex:`Straight alternation: ${C1}, ${C2}, ${C1}, ${C2} — the fifth has to be ${C1}.`},{seq:[c1,c2,c2,c1,c2],ex:`Block ${C1}–${C2}–${C2} repeats. Position five follows as ${C2}.`},{seq:[c1,c1,c1,c2,c1],ex:`Three ${C1}s, then one ${C2} break, then it resets to ${C1}.`}];const ch=rnd(pats);const tiles=ch.seq.map(color=>({shape,color,size:"medium"}));return{label:`Color Seq — ${shape}`,shown:tiles.slice(0,4),answer:tiles[4],wrongs:pk(CK.filter(c=>c!==tiles[4].color),2).map(color=>({shape,color,size:"medium"})),rule:"What color completes the pattern?",explanation:ch.ex};}
function genL2(){const[s1,s2]=pk(SHAPES,2),[c1,c2]=pk(CK,2);const S1=s1[0].toUpperCase()+s1.slice(1),S2=s2[0].toUpperCase()+s2.slice(1),C1=COLORS[c1].label,C2=COLORS[c2].label;const seq=[{shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1},{shape:s2,color:c2},{shape:s1,color:c1}].map(t=>({...t,size:"medium"}));return{label:`Shape+Color — ${S1}`,shown:seq.slice(0,4),answer:seq[4],wrongs:sh([{shape:s1,color:c2,size:"medium"},{shape:s2,color:c1,size:"medium"}]).slice(0,2),rule:"Which shape and color comes next?",explanation:`Shape and colour swap together as a pair: ${S1}+${C1}, then ${S2}+${C2}, then back again. The fifth slot is a ${C1} ${S1}.`};}
function genL3(){const shape=rnd(SHAPES),S=shape[0].toUpperCase()+shape.slice(1),colors=pk(CK,3),seq=[0,1,2,3,4].map(i=>({shape,color:cyc(colors,i),size:cyc(SIZES,i)}));const ans=seq[4];const[C0,C1,C2]=colors.map(c=>COLORS[c].label);return{label:`Multi-Rule — ${S}`,shown:seq.slice(0,4),answer:ans,wrongs:[{shape,color:cyc(colors,4),size:SIZES[(SIZES.indexOf(ans.size)+1)%3]},{shape,color:colors[(colors.indexOf(ans.color)+1)%3],size:ans.size}],rule:"Shape, colour AND size follow a pattern — what's next?",explanation:`Three things at once here. Shape: always a ${S}. Colour cycles ${C0}→${C1}→${C2}→repeating. Size cycles small→medium→large→repeating. Position five: a ${ans.size}, ${COLORS[ans.color].label} ${S}.`};}
const PGENS=[genL1,genL1,genL2,genL2,genL3,genL3,genL1,genL2,genL3,genL2];
const PRANKS=[{title:"Pattern Novice",icon:"🔍",min:0},{title:"Shape Spotter",icon:"👁️",min:4},{title:"Sequence Thinker",icon:"🧠",min:8},{title:"Logic Analyst",icon:"📐",min:13},{title:"Pattern Strategist",icon:"🎯",min:18},{title:"Visual Mastermind",icon:"🏅",min:23},{title:"Grand Pattern Master",icon:"🏆",min:28}];
const getPR=s=>{let r=PRANKS[0];for(const x of PRANKS)if(s>=x.min)r=x;return r;};
const PLV=i=>i<2?{label:"Level 1 — Colour Pattern",color:"#22c55e"}:i<6?{label:"Level 2 — Shape & Colour",color:GOLD}:{label:"Level 3 — Multi-Rule",color:"#f97316"};

function PatternGame({onBack}){
  const[puzzles]=useState(()=>PGENS.map(g=>g()));
  const[opts]=useState(()=>puzzles.map(p=>sh([p.answer,...p.wrongs])));
  const[idx,setIdx]=useState(0),[tries,setTries]=useState([]),[locked,setLocked]=useState(false),[score,setScore]=useState(0),[stars,setStars]=useState([]),[screen,setScreen]=useState("home");
  const ss=useRef(Date.now()),qt=useRef([]),qs=useRef(Date.now());
  const total=puzzles.length,puz=puzzles[idx],rank=getPR(score);
  const isC=opt=>JSON.stringify(opt)===JSON.stringify(puz.answer);
  const wasW=opt=>tries.some(t=>JSON.stringify(t)===JSON.stringify(opt)&&!isC(opt));
  const handlePick=opt=>{if(locked||tries.some(t=>JSON.stringify(t)===JSON.stringify(opt)))return;const nt=[...tries,opt];setTries(nt);const ok=isC(opt);if(ok||nt.length>=2){setLocked(true);qt.current.push({label:puz.label,elapsed:Date.now()-qs.current,correct:ok,tries:nt.length});if(ok&&nt.length===1){setStars(s=>[...s,3]);setScore(s=>s+1);}else if(ok){setStars(s=>[...s,2]);}else{setStars(s=>[...s,0]);}}};
  const handleNext=()=>{qs.current=Date.now();if(idx+1>=total){finalize();setScreen("done");return;}setIdx(i=>i+1);setTries([]);setLocked(false);};
  const finalize=()=>{const dur=Date.now()-ss.current;for(const q of qt.current)postToAirtable("Pattern Completion",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Pattern Completion",Type:"question",Label:q.label,Correct:q.correct?"Yes":"No",Tries:q.tries,"Elapsed (s)":Math.round(q.elapsed/1000)});postToAirtable("Pattern Completion",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Pattern Completion",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qt.current.length,"Drop-Off":"No","Ease Rating":"—","Enjoy Rating":"—",Platform:detectPlatform()});setTimeout(()=>speakText(PAT_BYE,null,null),600);};
  const lv=PLV(idx);
  if(screen==="home")return(<div style={center}><div style={{maxWidth:620,width:"100%",textAlign:"center"}}><div style={{fontSize:64,marginBottom:12}}>🧩</div><h1 style={{fontSize:36,fontWeight:"bold",color:GOLD,marginBottom:10}}>Pattern Completion</h1><p style={{fontSize:22,color:LIGHT,fontWeight:"bold",marginBottom:20,lineHeight:1.5}}>A visual logic puzzle for the sharp, reasoning mind.</p><div style={{...card,textAlign:"left",marginBottom:20}}><p style={{color:"#7dd3fc",fontSize:17,fontWeight:"bold",marginBottom:14}}>DIFFICULTY LEVELS</p>{[{label:"Level 1",desc:"Colour sequences",detail:"Spot how colours repeat or alternate and predict what comes next.",color:"#22c55e"},{label:"Level 2",desc:"Shape & colour rules",detail:"Two things change at once — track both shape and colour together.",color:GOLD},{label:"Level 3",desc:"Multi-rule patterns",detail:"Shape, colour and size all follow separate rules simultaneously.",color:"#f97316"}].map(l=>(<div key={l.label} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:l.color,fontWeight:"bold",fontSize:20}}>{l.label}</span><span style={{color:"#e2e8f0",fontSize:19,fontWeight:"bold"}}>{l.desc}</span></div><p style={{color:LIGHT,fontSize:19,fontWeight:"bold",lineHeight:1.6,margin:0}}>{l.detail}</p></div>))}</div><AudioButton text={PAT_TTS} large/><p style={{color:LIGHT,fontSize:19,fontWeight:"bold",marginBottom:20}}>We'll walk you through everything before you start.</p><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}><button onClick={()=>setScreen("game")} style={goldBtn}>Start Puzzles →</button><button onClick={onBack} style={{background:"#1e293b",color:"#7dd3fc",fontSize:18,fontWeight:"bold",padding:"18px 28px",borderRadius:16,border:"2px solid #334155",cursor:"pointer"}}>← Hub</button></div><p style={{color:LIGHT,fontSize:19,fontWeight:"bold"}}>No time limits · 2 attempts · Earn ⭐⭐⭐ per puzzle</p></div></div>);
  if(screen==="done")return <FeedbackScreen onBack={onBack} gameName="Pattern Completion" table="Pattern Completion"/>;
  return(<div style={{...page,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{maxWidth:680,width:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:16,cursor:"pointer"}}>← Hub</button><div style={{textAlign:"right"}}><span style={{color:GOLD,fontSize:17,fontWeight:"bold"}}>{rank.icon} {rank.title}</span><span style={{color:LIGHT,fontSize:17,fontWeight:"bold",display:"block"}}>Score: {score}</span></div></div>
    <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:8}}><div style={{background:GOLD,height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/></div>
    <p style={{color:lv.color,fontSize:16,fontWeight:"bold",letterSpacing:1,marginBottom:14,textAlign:"center"}}>{lv.label.toUpperCase()}</p>
    {stars.length>0&&<div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>{stars.map((s,i)=><StarRow key={i} count={s} size={17}/>)}</div>}
    <div style={{background:"#1e293b",borderRadius:20,padding:"24px 12px",marginBottom:20,border:"2px solid #334155"}}>
      <p style={{color:"#7dd3fc",fontSize:16,fontWeight:"bold",letterSpacing:2,textAlign:"center",marginBottom:18}}>FIND THE MISSING PIECE</p>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
        {puz.shown.map((tile,i)=>(<div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{background:"#0f172a",borderRadius:14,padding:10,border:"2px solid #334155",display:"flex",alignItems:"center",justifyContent:"center",width:150,height:150}}><ShapeEl shape={tile.shape} color={tile.color} dim={SPX[tile.size]}/></div><span style={{color:"#94a3b8",fontSize:14,fontWeight:"bold",fontStyle:"italic",textTransform:"capitalize"}}>{tile.size}</span><span style={{color:"#64748b",fontSize:14,fontWeight:"bold"}}>{i+1}</span></div>))}
        <span style={{color:GOLD,fontSize:28,fontWeight:"bold"}}>→</span>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:150,height:150,borderRadius:14,border:`3px dashed ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a"}}><span style={{fontSize:36,color:GOLD}}>?</span></div><span style={{color:GOLD,fontSize:14,fontWeight:"bold"}}>5</span></div>
      </div>
    </div>
    <p style={{color:"#7dd3fc",fontSize:20,fontWeight:"bold",textAlign:"center",marginBottom:8}}>{puz.rule}</p>
    {!locked&&tries.length===0&&<p style={{color:LIGHT,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>You have 2 attempts</p>}
    {!locked&&tries.length===1&&<p style={{color:GOLD,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>⚠️ Last attempt — look carefully</p>}
    <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:20,flexWrap:"wrap"}}>{opts[idx].map((opt,i)=>{const wrong=wasW(opt),correct=isC(opt)&&locked,clickable=!locked&&!wasW(opt);return(<div key={i} onClick={()=>clickable&&handlePick(opt)} style={{background:correct?"#14532d44":wrong?"#7f1d1d44":"#1e293b",border:`3px solid ${correct?"#22c55e":wrong?"#ef4444":"#334155"}`,borderRadius:18,padding:14,display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:clickable?"pointer":"default",opacity:locked&&!correct&&!wrong?0.45:1,width:150,height:190,justifyContent:"center"}}><ShapeEl shape={opt.shape} color={opt.color} dim={SPX[opt.size]}/><span style={{color:correct?"#22c55e":wrong?"#ef4444":"#e2e8f0",fontSize:18,fontWeight:"bold",textAlign:"center"}}>{correct?"✅ Correct":wrong?"❌ Wrong":`Option ${String.fromCharCode(65+i)}`}</span></div>);})}</div>
    {locked&&(()=>{const gotIt=tries.some(t=>JSON.stringify(t)===JSON.stringify(puz.answer)),first=gotIt&&tries.length===1;return(<div style={{background:gotIt?"#14532d":"#7f1d1d",border:`2px solid ${gotIt?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"18px 20px",marginBottom:20}}><div style={{display:"flex",justifyContent:"center",marginBottom:8}}><StarRow count={first?3:gotIt?2:0} size={26}/></div><p style={{color:gotIt?"#bbf7d0":"#fecaca",fontSize:19,fontWeight:"bold",marginBottom:10,textAlign:"center"}}>{first?"🎉 Perfect — first attempt!":gotIt?"✅ Correct on second try!":`❌ Answer: Option ${String.fromCharCode(65+opts[idx].findIndex(o=>JSON.stringify(o)===JSON.stringify(puz.answer)))}`}</p><div style={{borderTop:`1px solid ${gotIt?"#22c55e44":"#ef444444"}`,paddingTop:12}}><p style={{color:gotIt?"#86efac":"#fca5a5",fontSize:15,fontWeight:"bold",letterSpacing:1,marginBottom:8}}>💡 PATTERN EXPLANATION</p><p style={{color:"#e2e8f0",fontSize:20,lineHeight:1.8,fontWeight:"bold",marginBottom:8}}>{puz.explanation}</p><AudioButton text={puz.explanation}/></div></div>);})()}
    {locked&&<button onClick={handleNext} style={{...goldBtn,width:"100%",padding:"20px"}}>{idx+1>=total?"See Final Score 🏁":"Next Puzzle →"}</button>}
  </div></div>);
}

// ── WORD ASSOCIATION ──────────────────────────────────────────────────────────
const WORD_TTS=`Hey, welcome. This one is Veterinary Word Association. Each round shows you a theme word at the top and three options below it. Two of them belong with the theme — one doesn't. Your job is to find the odd one out. Two attempts per round, no time pressure, and after each answer we'll explain exactly why the odd one is the odd one. Tap Start Rounds when you're ready.`;
const WORD_BYE=`That's all the rounds — well done. Every one of those took real clinical reasoning to work through. Come back whenever you'd like another session.`;
const WQS=[
  {cat:"digestive",diff:"easy",theme:"RUMINANT STOMACH CHAMBERS",options:["Rumen","Omasum","Cecum"],odd:2,explanation:"Rumen and omasum are both true chambers of the ruminant stomach. The cecum is a separate intestinal organ — not a stomach chamber at all."},
  {cat:"digestive",diff:"easy",theme:"DIGESTIVE ENZYMES",options:["Lipase","Amylase","Insulin"],odd:2,explanation:"Lipase and amylase are both digestive enzymes. Insulin is a pancreatic hormone that regulates blood glucose — not a digestive enzyme."},
  {cat:"digestive",diff:"medium",theme:"AVIAN DIGESTION",options:["Proventriculus","Gizzard","Duodenum"],odd:2,explanation:"The proventriculus and gizzard are the two-part stomach unique to birds. The duodenum is the first section of the small intestine — present across most vertebrates, nothing specifically avian about it."},
  {cat:"digestive",diff:"medium",theme:"LIVER FUNCTIONS",options:["Bile Production","Glycogen Storage","Erythropoiesis"],odd:2,explanation:"Bile production and glycogen storage are both hepatic functions. Erythropoiesis happens in bone marrow in adult mammals — not the liver."},
  {cat:"pharmacology",diff:"easy",theme:"NSAIDs IN VETERINARY MEDICINE",options:["Meloxicam","Carprofen","Metronidazole"],odd:2,explanation:"Meloxicam and carprofen are both NSAIDs for pain and inflammation. Metronidazole is an antibiotic — it treats infections, not inflammation."},
  {cat:"pharmacology",diff:"easy",theme:"ANTIPARASITIC DRUGS",options:["Ivermectin","Fenbendazole","Dexamethasone"],odd:2,explanation:"Ivermectin and fenbendazole are both antiparasitic agents. Dexamethasone is a corticosteroid for inflammation and immune suppression."},
  {cat:"pharmacology",diff:"medium",theme:"HEPATOTOXIC IN CATS",options:["Acetaminophen","Diazepam","Penicillin"],odd:2,explanation:"Acetaminophen and oral diazepam are both documented as hepatotoxic in cats. Penicillin is generally safe at therapeutic doses."},
  {cat:"pharmacology",diff:"medium",theme:"OPIOID ANALGESICS",options:["Buprenorphine","Butorphanol","Tramadol"],odd:2,explanation:"Buprenorphine and butorphanol are true opioids acting on mu and kappa receptors. Tramadol's opioid effect in dogs is minimal due to poor conversion to its active metabolite."},
  {cat:"reproduction",diff:"easy",theme:"HORMONES IN PARTURITION",options:["Oxytocin","Relaxin","Testosterone"],odd:2,explanation:"Oxytocin drives contractions and relaxin softens the cervix — both central to birth. Testosterone is an androgen with no role in parturition."},
  {cat:"reproduction",diff:"medium",theme:"CAUSES OF DYSTOCIA",options:["Fetal Malpresentation","Uterine Inertia","Cryptorchidism"],odd:2,explanation:"Malpresentation and uterine inertia are both direct causes of difficult birth. Cryptorchidism is a male reproductive condition completely unrelated to parturition."},
  {cat:"hematology",diff:"easy",theme:"COMPONENTS OF A CBC",options:["PCV","WBC Count","ALT"],odd:2,explanation:"PCV and WBC count are both standard CBC components. ALT is a liver enzyme on a chemistry panel — not a CBC."},
  {cat:"hematology",diff:"easy",theme:"WHITE BLOOD CELL TYPES",options:["Neutrophil","Eosinophil","Erythrocyte"],odd:2,explanation:"Neutrophils and eosinophils are both leukocytes. Erythrocytes are red blood cells — responsible for oxygen transport, not immune defence."},
  {cat:"hematology",diff:"medium",theme:"CAUSES OF ANEMIA IN DOGS",options:["Immune-Mediated Hemolysis","Ehrlichiosis","Polycythemia"],odd:2,explanation:"Immune-mediated hemolysis and ehrlichiosis are both recognised causes of anaemia. Polycythemia is the opposite — an abnormal increase in red blood cells."},
  {cat:"neurology",diff:"easy",theme:"SIGNS OF VESTIBULAR DISEASE",options:["Head Tilt","Nystagmus","Paraplegia"],odd:2,explanation:"Head tilt and nystagmus are hallmark vestibular signs. Paraplegia indicates spinal cord disease — a different system entirely."},
  {cat:"neurology",diff:"medium",theme:"CAUSES OF SEIZURES IN DOGS",options:["Idiopathic Epilepsy","Hypoglycemia","Hyperkalemia"],odd:2,explanation:"Idiopathic epilepsy and hypoglycemia are both recognised seizure triggers. Hyperkalemia primarily causes cardiac arrhythmias — not seizures."},
  {cat:"dermatology",diff:"easy",theme:"CAUSES OF PRURITUS IN DOGS",options:["Atopic Dermatitis","Flea Allergy","Hypothyroidism"],odd:2,explanation:"Atopic dermatitis and flea allergy both cause pruritus. Hypothyroidism causes alopecia and scaling — but affected dogs typically don't scratch excessively."},
  {cat:"dermatology",diff:"easy",theme:"ENDOCRINE DISORDERS IN CATS",options:["Hyperthyroidism","Diabetes Mellitus","Addison's Disease"],odd:2,explanation:"Hyperthyroidism and diabetes mellitus are both common feline endocrine disorders. Addison's disease is extremely rare in cats."},
  {cat:"dermatology",diff:"medium",theme:"CLINICAL SIGNS OF CUSHING'S",options:["Polydipsia","Pot-Belly","Hypoglycemia"],odd:2,explanation:"Polydipsia and pot-belly are classic Cushing's signs. Hypoglycemia is associated with Addison's or insulinoma — Cushing's typically causes hyperglycemia."},
];
const WCATS=[{key:"digestive",label:"Digestive System",icon:"🫁",color:"#14532d"},{key:"pharmacology",label:"Pharmacology",icon:"💊",color:"#1e3a5f"},{key:"reproduction",label:"Reproduction",icon:"🔬",color:"#4a1d96"},{key:"hematology",label:"Hematology & Immunity",icon:"🩸",color:"#7f1d1d"},{key:"neurology",label:"Neurology & MSK",icon:"🧠",color:"#134e4a"},{key:"dermatology",label:"Dermatology & Endocrine",icon:"🩺",color:"#854d0e"}];
const WRANKS=[{title:"Clinical Intern",icon:"🩺",min:0},{title:"Junior Clinician",icon:"📋",min:4},{title:"General Practitioner",icon:"🔬",min:8},{title:"Senior Clinician",icon:"💊",min:13},{title:"Clinical Specialist",icon:"🧬",min:18},{title:"Consulting Veterinarian",icon:"🎖️",min:22},{title:"Chief of Medicine",icon:"🏆",min:25}];
const getWR=s=>{let r=WRANKS[0];for(const x of WRANKS)if(s>=x.min)r=x;return r;};

function WordGame({onBack}){
  const[questions]=useState(()=>[...WQS].sort(()=>Math.random()-0.5));
  const[idx,setIdx]=useState(0),[tries,setTries]=useState([]),[locked,setLocked]=useState(false),[score,setScore]=useState(0),[stars,setStars]=useState([]),[screen,setScreen]=useState("home");
  const ss=useRef(Date.now()),qt=useRef([]),qs=useRef(Date.now());
  const total=questions.length,q=questions[idx],rank=getWR(score),catInfo=WCATS.find(c=>c.key===q?.cat)||WCATS[0];
  const handlePick=i=>{if(locked||tries.includes(i))return;const nt=[...tries,i];setTries(nt);const ok=i===q.odd;if(ok||nt.length>=2){setLocked(true);qt.current.push({theme:q.theme,elapsed:Date.now()-qs.current,correct:ok,tries:nt.length});if(ok&&nt.length===1){setStars(s=>[...s,3]);setScore(s=>s+1);}else if(ok){setStars(s=>[...s,2]);}else{setStars(s=>[...s,0]);}}};
  const handleNext=()=>{qs.current=Date.now();if(idx+1>=total){finalize();setScreen("done");return;}setIdx(i=>i+1);setTries([]);setLocked(false);};
  const finalize=()=>{const dur=Date.now()-ss.current;for(const qt2 of qt.current)postToAirtable("Word Association",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Word Association",Type:"question",Label:qt2.theme,Correct:qt2.correct?"Yes":"No",Tries:qt2.tries,"Elapsed (s)":Math.round(qt2.elapsed/1000)});postToAirtable("Word Association",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Word Association",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qt.current.length,"Drop-Off":"No","Ease Rating":"—","Enjoy Rating":"—",Platform:detectPlatform()});setTimeout(()=>speakText(WORD_BYE,null,null),600);};
  if(screen==="home")return(<div style={center}><div style={{maxWidth:620,width:"100%",textAlign:"center"}}><div style={{fontSize:64,marginBottom:12}}>🔤</div><h1 style={{fontSize:36,fontWeight:"bold",color:GOLD,marginBottom:10}}>Veterinary Word Association</h1><p style={{fontSize:22,color:LIGHT,fontWeight:"bold",marginBottom:24,lineHeight:1.5}}>Find the clinical term that doesn't belong.</p><AudioButton text={WORD_TTS} large/><p style={{color:LIGHT,fontSize:19,fontWeight:"bold",marginBottom:24}}>We'll walk you through everything before you start.</p><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}><button onClick={()=>setScreen("game")} style={goldBtn}>Start Rounds →</button><button onClick={onBack} style={{background:"#1e293b",color:"#7dd3fc",fontSize:18,fontWeight:"bold",padding:"18px 28px",borderRadius:16,border:"2px solid #334155",cursor:"pointer"}}>← Hub</button></div><p style={{color:LIGHT,fontSize:19,fontWeight:"bold"}}>No time limits · 2 attempts · Earn ⭐⭐⭐ per round</p></div></div>);
  if(screen==="done")return <FeedbackScreen onBack={onBack} gameName="Word Association" table="Word Association"/>;
  return(<div style={{...page,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{maxWidth:660,width:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:16,cursor:"pointer"}}>← Hub</button><div style={{textAlign:"right"}}><span style={{color:GOLD,fontSize:17,fontWeight:"bold"}}>{rank.icon} {rank.title}</span><span style={{color:"#64748b",fontSize:16,fontWeight:"bold",display:"block"}}>Score: {score}</span></div></div>
    <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:8}}><div style={{background:GOLD,height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/></div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><span style={{background:catInfo.color,color:"#fff",fontSize:15,fontWeight:"bold",padding:"6px 16px",borderRadius:20}}>{catInfo.icon} {catInfo.label}</span><span style={{color:q.diff==="easy"?"#22c55e":GOLD,fontSize:14,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1}}>{q.diff}</span></div>
    {stars.length>0&&<div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>{stars.map((s,i)=><StarRow key={i} count={s} size={17}/>)}</div>}
    <div style={{background:"#1e293b",borderRadius:20,padding:"28px 24px",marginBottom:22,border:"2px solid #334155",textAlign:"center"}}><p style={{color:"#7dd3fc",fontSize:15,fontWeight:"bold",letterSpacing:2,marginBottom:12}}>THEME WORD</p><div style={{background:"#0f172a",borderRadius:14,padding:"20px 24px",display:"inline-block",marginBottom:18}}><span style={{fontSize:36,fontWeight:"bold",color:GOLD,letterSpacing:2}}>{q.theme}</span></div><p style={{color:LIGHT,fontSize:20,fontWeight:"bold"}}>Which word does <strong style={{color:GOLD}}>NOT</strong> belong?</p></div>
    {!locked&&tries.length===0&&<p style={{color:LIGHT,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>You have 2 attempts</p>}
    {!locked&&tries.length===1&&<p style={{color:GOLD,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:14}}>⚠️ Last attempt — think carefully</p>}
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>{q.options.map((word,i)=>{const ww=tries.includes(i)&&i!==q.odd,ic=locked&&i===q.odd;return(<button key={i} onClick={()=>!locked&&!tries.includes(i)&&handlePick(i)} style={{background:ic?"#14532d":ww?"#7f1d1d":"#1e293b",border:`2px solid ${ic?"#22c55e":ww?"#ef4444":"#334155"}`,borderRadius:16,padding:"22px 28px",fontSize:24,fontWeight:"bold",color:ic?"#bbf7d0":ww?"#fecaca":"#e2e8f0",textAlign:"center",cursor:!locked&&!tries.includes(i)?"pointer":"default",opacity:locked&&!ic&&!ww?0.45:1}}>{word}{ic&&<span style={{fontSize:17,marginLeft:12}}>← Odd one out ✅</span>}{ww&&<span style={{fontSize:17,marginLeft:12}}>❌</span>}</button>);})}</div>
    {locked&&(()=>{const gotIt=tries.includes(q.odd),first=gotIt&&tries.length===1;return(<div style={{background:gotIt?"#14532d":"#7f1d1d",border:`2px solid ${gotIt?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"18px 22px",marginBottom:20}}><div style={{display:"flex",justifyContent:"center",marginBottom:8}}><StarRow count={first?3:gotIt?2:0} size={24}/></div><p style={{color:gotIt?"#bbf7d0":"#fecaca",fontSize:19,fontWeight:"bold",marginBottom:10,textAlign:"center"}}>{first?"🎉 Correct on first try!":gotIt?"✅ Correct on second try!":`❌ Odd one out: "${q.options[q.odd]}"`}</p><p style={{color:"#e2e8f0",fontSize:20,lineHeight:1.8,fontWeight:"bold",marginBottom:8}}>{q.explanation}</p><AudioButton text={q.explanation}/></div>);})()}
    {locked&&<button onClick={handleNext} style={{...goldBtn,width:"100%",padding:"20px"}}>{idx+1>=total?"See Final Score 🏁":"Next Round →"}</button>}
  </div></div>);
}

// ── WHAT WOULD YOU DO? ────────────────────────────────────────────────────────
const STORIES_TTS=`Welcome. This game is called What Would You Do. Each round presents you with a real-world situation — a brief scenario of just a few sentences. You'll then choose from three possible responses. After you choose, we'll walk through what tends to work best and why. There's no single right answer, but some choices are generally wiser than others. Take your time with each one. Tap Start Stories when you're ready.`;
const STORIES_BYE=`Well done. You've worked through all the scenarios — that's the kind of thoughtful reasoning that matters in real life. Come back whenever you'd like another round.`;

const STORIES=[
  {id:"s1",category:"Health",icon:"🏥",scenario:"Your elderly neighbour mentions she has been feeling dizzy and short of breath for several days but insists she doesn't want to bother the doctor. She lives alone and her family is far away.",options:["Respect her decision and check in on her occasionally","Offer to accompany her to the doctor or call on her behalf","Immediately call an ambulance without discussing it with her"],correct:1,outcome:"Offering to accompany her respects her autonomy while still ensuring she gets help. Dizziness and shortness of breath for several days in an elderly person can signal serious conditions like heart problems or low oxygen — gentle encouragement to seek care, with your support, is the wisest path.",wisdom:"Caring for others sometimes means gently overcoming their reluctance to seek help — especially when the stakes are high."},
  {id:"s2",category:"Finance",icon:"💰",scenario:"A trusted friend asks you to invest a significant sum of money in their new business venture. They are enthusiastic and confident it will succeed, but they have no formal business plan to show you.",options:["Invest the full amount — you trust your friend completely","Politely decline and explain you don't invest without a formal plan","Agree to a smaller amount you can afford to lose, and request written terms"],correct:2,outcome:"Agreeing to a smaller amount with written terms protects the friendship and your finances. Even with trusted friends, mixing money and relationships without documentation often ends badly — a formal agreement actually shows you take the partnership seriously.",wisdom:"Good intentions don't replace good documentation. Protecting yourself financially is not a sign of distrust — it's a sign of wisdom."},
  {id:"s3",category:"Family",icon:"👨‍👩‍👧",scenario:"Your adult child has made a major life decision — moving to another country — that you strongly disagree with. They are excited and have thought it through carefully over many months.",options:["Express your concerns clearly and then withdraw your support until they reconsider","Share your worries once, then offer your full support regardless of your feelings","Say nothing and pretend to support the decision while hoping they change their mind"],correct:1,outcome:"Sharing your concerns once — honestly and lovingly — and then offering full support honours both your relationship and their autonomy as an adult. Withdrawing support damages the relationship without changing the outcome, and pretending to agree while hoping they fail is a quiet form of sabotage.",wisdom:"Our children's choices belong to them. Our love doesn't have to agree to be unconditional."},
  {id:"s4",category:"Community",icon:"🏘️",scenario:"You notice a local shop owner is struggling financially after a difficult few months. You're not close friends, but you know them well enough to say hello. You have some disposable income this month.",options:["Do nothing — it's not your responsibility","Buy something from their shop and mention you hope things improve","Organise a community event to raise awareness and drive customers to their shop"],correct:1,outcome:"Buying something is a direct, immediate act of support that doesn't require organising anything or waiting. It puts money in their pocket today and signals community goodwill. Larger efforts like events are wonderful but take time the shop owner may not have.",wisdom:"Small, timely acts of kindness often matter more than grand gestures planned for later."},
  {id:"s5",category:"Health",icon:"💊",scenario:"A family member has been prescribed medication by their doctor but refuses to take it because they read something negative about it online. They have a genuine medical need for it.",options:["Force them to take the medication — it's for their own good","Dismiss their concerns and tell them to trust the doctor","Ask what specifically worried them and suggest discussing those concerns with their doctor"],correct:2,outcome:"Asking about their specific concerns and directing them back to the doctor respects their autonomy while keeping medical professionals in the loop. People who feel heard are far more likely to comply with treatment. Forcing medication is both impractical and harmful to trust.",wisdom:"Medical compliance improves dramatically when people feel their concerns have been genuinely listened to."},
  {id:"s6",category:"Ethics",icon:"⚖️",scenario:"You witness a colleague taking credit for a junior team member's idea in a meeting. The junior member looks uncomfortable but says nothing. You are not their manager.",options:["Say nothing — it's not your place to interfere","Privately tell the junior member after the meeting what you observed","Immediately speak up in the meeting and correct the attribution"],correct:1,outcome:"Speaking to the junior member privately gives them agency to decide how they want to handle it — and they may have good reasons for staying quiet in the moment. Speaking up in the meeting, while well-intentioned, can put them in an awkward position they weren't prepared for.",wisdom:"Advocacy is most effective when it empowers people rather than putting them in the spotlight without warning."},
  {id:"s7",category:"Environment",icon:"🌿",scenario:"You realise your neighbour has been burning rubbish in their garden, which is against local regulations and causing smoke that affects nearby households. They seem unaware of the rules.",options:["Report them to the local authority immediately","Politely speak to them directly, explain the regulations, and give them a chance to stop","Post about it on the local community social media group to warn others"],correct:1,outcome:"Speaking directly and assuming good faith is the right first step when someone appears unaware of the rules. Immediate reporting escalates without giving them a chance to correct it, and posting publicly online can damage their reputation without resolving anything.",wisdom:"Most conflicts can be resolved with a calm, direct conversation — escalation should be a last resort, not a first response."},
  {id:"s8",category:"Finance",icon:"🏠",scenario:"You receive an unexpected inheritance and are considering how to use it. You have some manageable debt, modest savings, and a dream of starting a small business you've thought about for years.",options:["Put everything into the business immediately while you're motivated","Pay off all your debt first, then save the remainder for the business","Split it thoughtfully: clear the debt, keep an emergency fund, and invest the rest in the business"],correct:2,outcome:"A balanced approach gives you financial stability while still moving toward your dream. Putting everything into the business before clearing debt is risky — debt costs you money every month. But clearing debt and saving everything without pursuing the business may leave the opportunity behind.",wisdom:"Financial decisions are rarely either-or. The wisest path usually involves protecting your foundation while still reaching for your goals."},
  {id:"s9",category:"Family",icon:"🧓",scenario:"Your elderly parent is becoming increasingly forgetful and you're worried about their safety living alone. They strongly resist any discussion about changing their living situation.",options:["Arrange a care home placement without discussing it further — their safety comes first","Dismiss your concerns for now — they seem mostly fine","Have a gentle, repeated conversation over time, involve their doctor, and explore options together"],correct:2,outcome:"Gradual, compassionate conversations that involve medical professionals and give your parent a voice in the process are far more effective and ethical than unilateral decisions. Forcing change without consent damages trust and can cause emotional harm — and often backfires.",wisdom:"Loss of independence is one of the deepest fears of ageing. Meeting that fear with patience and involvement, not decisions made behind someone's back, leads to better outcomes for everyone."},
  {id:"s10",category:"Ethics",icon:"🤝",scenario:"You discover that a close friend has been telling people a version of a shared story that makes you look bad, though you believe they are doing it unknowingly rather than maliciously.",options:["End the friendship — trust has been broken","Say nothing and hope it stops on its own","Talk to your friend privately, share what you've heard, and give them the chance to respond"],correct:2,outcome:"Speaking privately and assuming good faith is the wisest path when you believe the harm is unintentional. Ending the friendship over a misunderstanding skips the most important step — communication. Saying nothing allows the damage to continue.",wisdom:"Most friendship conflicts that feel like betrayal turn out to be misunderstandings. One honest conversation is worth a hundred assumptions."},
];

const STORY_RANKS=[{title:"Thoughtful Beginner",icon:"💭",min:0},{title:"Careful Thinker",icon:"🤔",min:3},{title:"Wise Respondent",icon:"🌱",min:5},{title:"Community Mindful",icon:"🤝",min:7},{title:"Experienced Judge",icon:"⚖️",min:9},{title:"Community Elder",icon:"🌟",min:10}];
const getSR=s=>{let r=STORY_RANKS[0];for(const x of STORY_RANKS)if(s>=x.min)r=x;return r;};
const CAT_COLORS={Health:"#14532d",Finance:"#1e3a5f",Family:"#4a1d96",Community:"#854d0e",Ethics:"#7f1d1d",Environment:"#134e4a"};

function StoriesGame({onBack}){
  const[stories]=useState(()=>[...STORIES].sort(()=>Math.random()-0.5));
  const[idx,setIdx]=useState(0),[selected,setSelected]=useState(null),[score,setScore]=useState(0),[screen,setScreen]=useState("home");
  const ss=useRef(Date.now()),qt=useRef([]),qs=useRef(Date.now());
  const total=stories.length,s=stories[idx],rank=getSR(score),catColor=CAT_COLORS[s?.category]||"#334155";
  const handlePick=i=>{if(selected!==null)return;setSelected(i);qt.current.push({id:s.id,elapsed:Date.now()-qs.current,correct:i===s.correct});if(i===s.correct)setScore(sc=>sc+1);};
  const handleNext=()=>{qs.current=Date.now();if(idx+1>=total){finalize();setScreen("done");return;}setIdx(i=>i+1);setSelected(null);};
  const finalize=()=>{const dur=Date.now()-ss.current;for(const q of qt.current)postToAirtable("Decision Stories",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Decision Stories",Type:"question",Label:q.id,Correct:q.correct?"Yes":"No","Elapsed (s)":Math.round(q.elapsed/1000)});postToAirtable("Decision Stories",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Decision Stories",Type:"session",Score:score,Total:total,"Duration (s)":Math.round(dur/1000),Answered:qt.current.length,"Drop-Off":"No","Ease Rating":"—","Enjoy Rating":"—",Platform:detectPlatform()});setTimeout(()=>speakText(STORIES_BYE,null,null),600);};
  if(screen==="home")return(<div style={center}><div style={{maxWidth:660,width:"100%",textAlign:"center"}}><div style={{fontSize:72,marginBottom:16}}>🌍</div><h1 style={{fontSize:36,fontWeight:"bold",color:GOLD,marginBottom:12}}>What Would You Do?</h1><p style={{fontSize:22,color:LIGHT,fontWeight:"bold",marginBottom:24,lineHeight:1.5}}>Real-world scenarios. Thoughtful choices. Everyday wisdom.</p><AudioButton text={STORIES_TTS} large/><p style={{color:LIGHT,fontSize:19,fontWeight:"bold",marginBottom:24}}>We'll walk you through everything before you start.</p><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}><button onClick={()=>setScreen("game")} style={goldBtn}>Start Stories →</button><button onClick={onBack} style={{background:"#1e293b",color:"#7dd3fc",fontSize:18,fontWeight:"bold",padding:"18px 28px",borderRadius:16,border:"2px solid #334155",cursor:"pointer"}}>← Hub</button></div><p style={{color:LIGHT,fontSize:19,fontWeight:"bold"}}>No time limits · Choose wisely · Reflect deeply</p></div></div>);
  if(screen==="done")return <FeedbackScreen onBack={onBack} gameName="Decision Stories" table="Decision Stories"/>;
  const isLocked=selected!==null;
  return(<div style={{...page,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{maxWidth:700,width:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:16,cursor:"pointer"}}>← Hub</button><div style={{textAlign:"right"}}><span style={{color:GOLD,fontSize:17,fontWeight:"bold"}}>{rank.icon} {rank.title}</span><span style={{color:LIGHT,fontSize:17,fontWeight:"bold",display:"block"}}>Score: {score}</span></div></div>
    <div style={{background:"#1e293b",borderRadius:8,height:10,marginBottom:20}}><div style={{background:GOLD,height:10,borderRadius:8,width:`${(idx/total)*100}%`}}/></div>
    <div style={{borderRadius:20,overflow:"hidden",marginBottom:20,border:`2px solid ${catColor}66`}}>
      <div style={{background:catColor,padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"#fff",fontSize:15,fontWeight:"bold",letterSpacing:2}}>{s.icon} {s.category.toUpperCase()}</span><span style={{color:"#fff",fontSize:15}}>Scenario {idx+1} of {total}</span></div>
      <div style={{background:"#1e293b",padding:"28px 24px"}}><p style={{color:"#e2e8f0",fontSize:21,lineHeight:1.9,fontWeight:"bold"}}>{s.scenario}</p></div>
    </div>
    <p style={{color:"#7dd3fc",fontSize:20,fontWeight:"bold",textAlign:"center",marginBottom:8}}>WHAT WOULD YOU DO?</p>
    {!isLocked&&<p style={{color:LIGHT,fontSize:18,fontWeight:"bold",textAlign:"center",marginBottom:16}}>Choose the response you think is wisest.</p>}
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>{s.options.map((opt,i)=>{const isRight=isLocked&&i===s.correct,isPicked=isLocked&&i===selected&&i!==s.correct;return(<button key={i} onClick={()=>handlePick(i)} style={{background:isRight?"#14532d":isPicked?"#7f1d1d":"#1e293b",color:isRight?"#bbf7d0":isPicked?"#fecaca":"#e2e8f0",border:`2px solid ${isRight?"#22c55e":isPicked?"#ef4444":"#334155"}`,borderRadius:14,padding:"20px 22px",fontSize:20,fontWeight:"bold",textAlign:"left",cursor:!isLocked?"pointer":"default",lineHeight:1.5,opacity:isLocked&&!isRight&&!isPicked?0.5:1}}>{String.fromCharCode(65+i)}. &nbsp;{opt}</button>);})}</div>
    {isLocked&&(<div style={{background:selected===s.correct?"#14532d":"#7f1d1d",border:`2px solid ${selected===s.correct?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
      <p style={{color:selected===s.correct?"#bbf7d0":"#fecaca",fontSize:20,fontWeight:"bold",marginBottom:12}}>{selected===s.correct?"✅ Wise choice!":"❌ Not the wisest path — here's why:"}</p>
      <p style={{color:"#e2e8f0",fontSize:20,lineHeight:1.8,fontWeight:"bold",marginBottom:12}}>{s.outcome}</p>
      <div style={{background:"#0f172a",borderRadius:12,padding:"14px 18px",marginBottom:12,border:`1px solid ${catColor}44`}}><p style={{color:GOLD,fontSize:18,fontWeight:"bold",fontStyle:"italic",margin:0}}>💡 "{s.wisdom}"</p></div>
      <AudioButton text={`${s.outcome} ${s.wisdom}`}/>
    </div>)}
    {isLocked&&<button onClick={handleNext} style={{...goldBtn,width:"100%",padding:"20px"}}>{idx+1>=total?"See Final Score 🏁":"Next Scenario →"}</button>}
  </div></div>);
}

// ── MEMORY PAIR MATCH ─────────────────────────────────────────────────────────
const MEMORY_TTS=`Welcome to Memory Pair Match. You'll see a grid of face-down cards — each one has a hidden picture. Tap a card to flip it, then tap another to try to find its match. If they match, they stay face-up. If they don't, they'll flip back over. Try to remember where each card is and find all the pairs in as few attempts as possible. The fewer attempts you use, the more stars you earn. Take your time — there's no timer. Tap Start Game when you're ready.`;
const MEMORY_BYE=`Excellent work. You found all the pairs — that's your memory working exactly as it should. Come back whenever you'd like to play again.`;

const CARD_PAIRS=["🐕","🐈","🌲","🔬","🌻","🦋","🐄","🔑","🌊","🍎","🦜","⚕️"];
const MEM_RANKS=[{title:"Forgetful Fawn",icon:"🦌",min:0},{title:"Curious Cub",icon:"🐻",min:1},{title:"Sharp Eye",icon:"👁️",min:2},{title:"Memory Keeper",icon:"🧠",min:3},{title:"Pattern Finder",icon:"🔍",min:4},{title:"Steel Trap Mind",icon:"🏆",min:5}];
const getMR=wins=>{let r=MEM_RANKS[0];for(const x of MEM_RANKS)if(wins>=x.min)r=x;return r;};

function MemoryGame({onBack}){
  const makeCards=()=>{const pairs=[...CARD_PAIRS,...CARD_PAIRS];return pairs.sort(()=>Math.random()-0.5).map((emoji,i)=>({id:i,emoji,flipped:false,matched:false}));};
  const[cards,setCards]=useState(makeCards);
  const[flipped,setFlipped]=useState([]);
  const[moves,setMoves]=useState(0);
  const[matches,setMatches]=useState(0);
  const[screen,setScreen]=useState("home");
  const[wins,setWins]=useState(0);
  const[celebrating,setCelebrating]=useState(false);
  const processing=useRef(false);
  const ss=useRef(Date.now());
  const total=CARD_PAIRS.length;

  const getStars=m=>{if(m<=total+2)return 3;if(m<=total+6)return 2;return 1;};

  const handleFlip=id=>{
    if(processing.current)return;
    const card=cards.find(c=>c.id===id);
    if(!card||card.flipped||card.matched||flipped.length>=2)return;
    const newFlipped=[...flipped,id];
    setCards(prev=>prev.map(c=>c.id===id?{...c,flipped:true}:c));
    setFlipped(newFlipped);
    if(newFlipped.length===2){
      processing.current=true;
      setMoves(m=>m+1);
      const[a,b]=newFlipped.map(fid=>cards.find(c=>c.id===fid));
      if(a.emoji===b.emoji){
        setTimeout(()=>{
          setCards(prev=>prev.map(c=>newFlipped.includes(c.id)?{...c,matched:true,flipped:true}:c));
          setFlipped([]);
          const newMatches=matches+1;
          setMatches(newMatches);
          setCelebrating(true);
          setTimeout(()=>setCelebrating(false),1200);
          processing.current=false;
          if(newMatches===total){
            const dur=Date.now()-ss.current;
            const m=moves+1;
            postToAirtable("Memory Pair Match",{Date:new Date().toLocaleDateString(),Time:new Date().toLocaleTimeString(),Game:"Memory Pair Match",Type:"session",Score:getStars(m),Total:3,"Duration (s)":Math.round(dur/1000),Moves:m,Matches:newMatches,"Ease Rating":"—","Enjoy Rating":"—",Platform:detectPlatform()});
            setTimeout(()=>speakText(MEMORY_BYE,null,null),600);
            setWins(w=>w+1);
            setTimeout(()=>setScreen("done"),800);
          }
        },400);
      } else {
        setTimeout(()=>{
          setCards(prev=>prev.map(c=>newFlipped.includes(c.id)&&!c.matched?{...c,flipped:false}:c));
          setFlipped([]);
          processing.current=false;
        },1000);
      }
    }
  };

  const restart=()=>{setCards(makeCards());setFlipped([]);setMoves(0);setMatches(0);setScreen("game");ss.current=Date.now();};
  const rank=getMR(wins);
  const stars=getStars(moves);

  if(screen==="home")return(<div style={center}><div style={{maxWidth:620,width:"100%",textAlign:"center"}}><div style={{fontSize:72,marginBottom:12}}>🃏</div><h1 style={{fontSize:36,fontWeight:"bold",color:GOLD,marginBottom:10}}>Memory Pair Match</h1><p style={{fontSize:22,color:LIGHT,fontWeight:"bold",marginBottom:24,lineHeight:1.5}}>Flip cards and find the matching pairs — train your memory.</p><div style={{...card,textAlign:"left",marginBottom:20}}><p style={{color:"#7dd3fc",fontSize:18,fontWeight:"bold",marginBottom:12}}>HOW TO PLAY</p><div style={{display:"flex",flexDirection:"column",gap:10}}>{[["👆","Tap any card to flip it face-up"],["👀","Remember where each picture is"],["🎯","Find the matching pair — they stay face-up"],["⭐","Fewer moves = more stars earned"]].map(([icon,text],i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:14,background:"#0f172a",borderRadius:10,padding:"12px 16px"}}><span style={{fontSize:28}}>{icon}</span><span style={{color:"#e2e8f0",fontSize:19,fontWeight:"bold"}}>{text}</span></div>))}</div></div><AudioButton text={MEMORY_TTS} large/><p style={{color:LIGHT,fontSize:19,fontWeight:"bold",marginBottom:20}}>We'll walk you through everything before you start.</p><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}><button onClick={()=>{setScreen("game");ss.current=Date.now();}} style={goldBtn}>Start Game →</button><button onClick={onBack} style={{background:"#1e293b",color:"#7dd3fc",fontSize:18,fontWeight:"bold",padding:"18px 28px",borderRadius:16,border:"2px solid #334155",cursor:"pointer"}}>← Hub</button></div><p style={{color:LIGHT,fontSize:19,fontWeight:"bold"}}>No time limit · Find all {total} pairs</p></div></div>);

  if(screen==="done"){
    const finalStars=getStars(moves);
    return(<div style={center}><div style={{maxWidth:580,width:"100%",textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:12}}>🎉</div>
      <h2 style={{color:GOLD,fontSize:30,fontWeight:"bold",marginBottom:8}}>All Pairs Found!</h2>
      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><StarRow count={finalStars} size={40}/></div>
      <p style={{color:LIGHT,fontSize:20,fontWeight:"bold",marginBottom:8}}>{moves} moves · {finalStars===3?"Outstanding memory!":finalStars===2?"Well played!":"Good effort — practice makes perfect!"}</p>
      <div style={{...card,marginBottom:20}}><p style={{color:"#7dd3fc",fontSize:15,marginBottom:6}}>YOUR RANK</p><p style={{color:GOLD,fontSize:26,fontWeight:"bold"}}>{rank.icon} {rank.title}</p><p style={{color:LIGHT,fontSize:17,fontWeight:"bold",marginTop:4}}>Games completed: {wins}</p></div>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}><button onClick={restart} style={goldBtn}>Play Again 🔄</button><button onClick={onBack} style={{background:"#1e293b",color:"#7dd3fc",fontSize:18,fontWeight:"bold",padding:"18px 28px",borderRadius:16,border:"2px solid #334155",cursor:"pointer"}}>← Hub</button></div>
    </div></div>);
  }

  const cols=6,rows=4;
  return(<div style={{...page,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{maxWidth:700,width:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <button onClick={onBack} style={{background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:16,cursor:"pointer"}}>← Hub</button>
      <div style={{textAlign:"center"}}>
        <span style={{color:GOLD,fontSize:18,fontWeight:"bold"}}>{rank.icon} {rank.title}</span>
        <span style={{color:LIGHT,fontSize:17,fontWeight:"bold",display:"block"}}>Moves: {moves} · Pairs: {matches}/{total}</span>
      </div>
      <button onClick={restart} style={{background:"#1e293b",color:LIGHT,border:"1px solid #334155",borderRadius:10,padding:"10px 18px",fontSize:15,fontWeight:"bold",cursor:"pointer"}}>🔄 Reset</button>
    </div>
    {celebrating&&(<div style={{textAlign:"center",fontSize:48,marginBottom:8,animation:"none"}}>✨ Match! ✨</div>)}
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols}, 1fr)`,gap:10,marginBottom:20}}>
      {cards.map(c=>(
        <button key={c.id} onClick={()=>handleFlip(c.id)} style={{aspectRatio:"1",background:c.flipped||c.matched?c.matched?"#14532d":"#1e3a5f":"#1e293b",border:`3px solid ${c.matched?"#22c55e":c.flipped?"#7dd3fc":"#334155"}`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:c.flipped||c.matched?36:24,cursor:c.flipped||c.matched?"default":"pointer",transition:"all 0.2s",boxShadow:c.matched?"0 0 12px #22c55e44":"none",minHeight:80}}>
          {c.flipped||c.matched?c.emoji:"🎴"}
        </button>
      ))}
    </div>
    <div style={{display:"flex",justifyContent:"center",gap:6}}><StarRow count={moves===0?3:getStars(moves)} size={28}/></div>
    <p style={{color:LIGHT,fontSize:17,fontWeight:"bold",textAlign:"center",marginTop:8}}>Aiming for {total+2} moves or fewer earns 3 stars</p>
  </div></div>);
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App(){
  const[view,setView]=useState("hub");
  if(view==="diagnosis")return <DiagnosisGame onBack={()=>setView("hub")}/>;
  if(view==="pattern")  return <PatternGame   onBack={()=>setView("hub")}/>;
  if(view==="word")     return <WordGame       onBack={()=>setView("hub")}/>;
  if(view==="stories")  return <StoriesGame    onBack={()=>setView("hub")}/>;
  if(view==="memory")   return <MemoryGame     onBack={()=>setView("hub")}/>;
  return <Hub onSelect={setView}/>;
}