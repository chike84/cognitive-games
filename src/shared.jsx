import { useState, useEffect } from "react";

// ── Airtable ──────────────────────────────────────────────────────────────────
const AIRTABLE_TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
export async function postToAirtable(table, fields) {
  try {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`, {
      method:"POST", headers:{"Authorization":`Bearer ${AIRTABLE_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({records:[{fields}]}),
    });
  } catch(e){console.error("Airtable:",e);}
}

// ── TTS ───────────────────────────────────────────────────────────────────────
export function detectPlatform(){const ua=navigator.userAgent;if(/iPad|iPhone|iPod/.test(ua))return"ios";if(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)return"ios";if(/Macintosh|Mac OS X/.test(ua))return"mac";if(/Windows/.test(ua))return"windows";return"other";}
function getPreferredVoice(voices){const p=detectPlatform();if(p==="ios")return voices.find(v=>/daniel/i.test(v.name)&&/en/i.test(v.lang))||voices.find(v=>/karen|samantha|moira/i.test(v.name))||voices.find(v=>v.lang==="en-GB")||voices.find(v=>v.lang==="en-US")||voices[0];return voices.find(v=>/gordon/i.test(v.name)&&/en/i.test(v.lang))||voices.find(v=>/gordon/i.test(v.name))||voices.find(v=>/daniel|oliver|arthur/i.test(v.name))||voices.find(v=>v.lang==="en-GB")||voices.find(v=>v.lang==="en-US")||voices[0];}
export function speakText(text,onStart,onEnd){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const voices=window.speechSynthesis.getVoices();const utt=new SpeechSynthesisUtterance(text);utt.rate=0.78;utt.pitch=0.85;utt.volume=1.0;const pref=getPreferredVoice(voices);if(pref)utt.voice=pref;utt.onstart=onStart||(()=>{});utt.onend=onEnd||(()=>{});utt.onerror=onEnd||(()=>{});window.speechSynthesis.speak(utt);}

export function AudioButton({text,large=false}){
  const[speaking,setSpeaking]=useState(false);
  useEffect(()=>()=>window.speechSynthesis?.cancel(),[]);
  const handle=()=>{if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return;}speakText(text,()=>setSpeaking(true),()=>setSpeaking(false));};
  return(<button onClick={handle} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,background:speaking?"#1e3a5f":"#fbbf24",color:speaking?"#7dd3fc":"#0f172a",border:`3px solid ${speaking?"#7dd3fc":"#f59e0b"}`,borderRadius:18,padding:large?"24px 32px":"18px 24px",fontSize:large?24:20,fontWeight:"bold",cursor:"pointer",width:"100%",boxShadow:speaking?"none":"0 4px 24px rgba(251,191,36,0.35)",transition:"all 0.2s",marginBottom:12}}>
    <span style={{fontSize:large?44:30}}>{speaking?"⏹️":"🔊"}</span>
    <span style={{textAlign:"left",lineHeight:1.4}}>{speaking?"Tap to stop":large?<><span style={{fontSize:24,fontWeight:"bold"}}>TAP HERE FIRST</span><br/><span style={{fontSize:20,fontWeight:"bold"}}>Hear how to play</span></>:"Read this to me"}</span>
  </button>);
}

// ── Shared ────────────────────────────────────────────────────────────────────
export const BG="#0f172a",GOLD="#fbbf24",LIGHT="#cbd5e1";
export const page={background:BG,minHeight:"100vh",fontFamily:"Georgia,serif",color:"#e2e8f0",padding:"24px 16px"};
export const center={background:BG,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:"Georgia,serif"};
export const goldBtn={background:GOLD,color:BG,fontSize:22,fontWeight:"bold",padding:"20px 48px",borderRadius:16,border:"none",cursor:"pointer"};
export const card={background:"#1e293b",borderRadius:16,padding:"20px 24px",border:"1px solid #334155",marginBottom:16};
export const StarRow=({count,size=24})=><div style={{display:"flex",gap:3}}>{[1,2,3].map(i=><span key={i} style={{fontSize:size,filter:i<=count?"none":"grayscale(1) opacity(0.2)"}}>⭐</span>)}</div>;

export function FeedbackScreen({onBack,gameName,table}){
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
