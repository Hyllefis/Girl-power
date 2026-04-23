import { useState, useEffect } from "react";

const LIFT_LIBRARY = {
  "Squat":     ["Back Squat","Front Squat","Overhead Squat","Box Squat","Pause Squat","Safety Bar Squat","Goblet Squat","Bulgarian Split Squat"],
  "Hinge":     ["Deadlift","Romanian Deadlift","Sumo Deadlift","Trap Bar Deadlift","Good Morning","Stiff-Leg Deadlift","Hip Thrust","Kettlebell Swing"],
  "Push":      ["Bench Press","Overhead Press","Push Press","Incline Bench Press","Dumbbell Press","Dips","Handstand Push-ups","Push-ups"],
  "Pull":      ["Pull-ups","Chin-ups","Barbell Row","Pendlay Row","Dumbbell Row","Cable Row","Lat Pulldown","Muscle-ups"],
  "Olympic":   ["Clean","Power Clean","Hang Clean","Clean & Jerk","Snatch","Power Snatch","Hang Snatch","Push Jerk","Split Jerk","Muscle Snatch"],
  "Accessory": ["Bicep Curl","Tricep Extension","Lateral Raise","Face Pull","Shrug","Calf Raise","Leg Press","Leg Curl","Ab Wheel","Plank"],
  "CrossFit":  ["Thruster","Wall Ball","Box Jump","Double Unders","Row (cal)","Bike (cal)","Run (m)","Burpees","Toes to Bar","Assault Bike (cal)"],
};
const ALL_LIFTS = Object.values(LIFT_LIBRARY).flat();

const SK = "wod_v7";
const CK = "wod_custom_v7";

function load(k, fb) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } }
function persist(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function today() { return new Date().toISOString().split("T")[0]; }
function fmt(iso) { return new Date(iso).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" }); }
function fmtShort(iso) { return new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short" }); }
function blankSet() { return { reps:"", weight:"" }; }
function isPowerType(t) { return t === "Power" || t === "Weightlifting" || t === "Strength" || t === "Olympic Lifting"; }

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:       "#fdf8f5",       // warm cream
  surface:  "#ffffff",       // white cards
  surface2: "#fef3f0",       // blush tint
  border:   "#f0e4de",       // soft rose border
  border2:  "#e8d5cd",
  rose:     "#c9706a",       // main accent — dusty rose
  roseDark: "#a85550",
  rosePale: "#f5e0dd",
  text:     "#3d2c2a",       // warm dark brown
  text2:    "#8a6b66",       // muted
  text3:    "#b89e99",       // very muted
  gold:     "#c9706a",       // reuse rose for PRs
};

const FONT_BODY    = "'Georgia', 'Times New Roman', serif";
const FONT_LABEL   = "'Helvetica Neue', Arial, sans-serif";

// ── Progress Chart ────────────────────────────────────────────
function ProgressChart({ points }) {
  if (points.length < 2) return (
    <div style={{ color:C.text3, fontSize:12, padding:"12px 0", textAlign:"center", fontFamily:FONT_LABEL }}>
      Log at least 2 sessions to see your progress ✨
    </div>
  );
  const W = 300, H = 100, pl = 34, pr = 8, pt = 6, pb = 22;
  const iW = W - pl - pr, iH = H - pt - pb;
  const vals = points.map(p => p.kg);
  const lo = Math.min(...vals), hi = Math.max(...vals), range = hi - lo || 1;
  const cx = i => pl + (i / (points.length - 1)) * iW;
  const cy = v => pt + iH - ((v - lo) / range) * iH;
  const line = points.map((p, i) => `${cx(i)},${cy(p.kg)}`).join(" ");
  const area = `${cx(0)},${H-pb} ` + points.map((p,i) => `${cx(i)},${cy(p.kg)}`).join(" ") + ` ${cx(points.length-1)},${H-pb}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.5, 1].map(t => (
        <g key={t}>
          <line x1={pl} y1={pt+iH-t*iH} x2={W-pr} y2={pt+iH-t*iH} stroke={C.border} strokeWidth="1"/>
          <text x={pl-4} y={pt+iH-t*iH+4} fontSize="9" fill={C.text3} textAnchor="end">{(lo+t*range).toFixed(1)}</text>
        </g>
      ))}
      <polygon points={area} fill={C.rose} opacity="0.1"/>
      <polyline points={line} fill="none" stroke={C.rose} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={cx(i)} cy={cy(p.kg)} r="4" fill={C.rose}/>
          {(i === 0 || i === points.length-1 || points.length <= 5 || i % Math.ceil(points.length/4) === 0) && (
            <text x={cx(i)} y={H-pb+14} fontSize="8" fill={C.text3} textAnchor="middle">{fmtShort(p.date)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Set Table ─────────────────────────────────────────────────
function SetTable({ sets, prKg, onChange, onAddSet, onRemoveSet }) {
  const cell = {
    background: C.surface2, border:`1px solid ${C.border}`, color:C.text,
    padding:"10px 6px", fontSize:15, borderRadius:10, fontFamily:FONT_BODY,
    width:"100%", boxSizing:"border-box", outline:"none", textAlign:"center", fontWeight:600,
  };
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr 24px", gap:6, paddingBottom:8 }}>
        <span/>
        <span style={{ fontSize:9, color:C.text3, letterSpacing:2, textAlign:"center", textTransform:"uppercase", fontFamily:FONT_LABEL }}>Reps</span>
        <span style={{ fontSize:9, color:C.text3, letterSpacing:2, textAlign:"center", textTransform:"uppercase", fontFamily:FONT_LABEL }}>kg</span>
        <span/>
      </div>
      {sets.map((s, i) => {
        const w = parseFloat(s.weight);
        const pr = prKg && !isNaN(w) && w > 0 && w >= prKg;
        return (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr 24px", gap:6, marginBottom:8, alignItems:"center" }}>
            <span style={{ fontSize:11, color:pr?C.rose:C.text3, fontWeight:700, textAlign:"center", fontFamily:FONT_LABEL }}>{pr?"♡":i+1}</span>
            <input type="number" inputMode="numeric" placeholder="—" style={cell}
              value={s.reps} onChange={e => onChange(i,"reps",e.target.value)} />
            <input type="number" inputMode="decimal" placeholder="—"
              style={{ ...cell, color:pr?C.rose:C.text, borderColor:pr?C.rose:C.border }}
              value={s.weight} onChange={e => onChange(i,"weight",e.target.value)} />
            {sets.length > 1
              ? <button onClick={() => onRemoveSet(i)} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:16, padding:0 }}>×</button>
              : <span/>}
          </div>
        );
      })}
      <button onClick={onAddSet} style={{
        width:"100%", background:"transparent", border:`1px dashed ${C.border2}`,
        color:C.text3, padding:"9px", fontSize:11, letterSpacing:1,
        borderRadius:10, cursor:"pointer", fontFamily:FONT_LABEL, marginTop:2,
      }}>
        + add set
      </button>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [data,          setData]          = useState(() => load(SK, { sessions:[], prs:{} }));
  const [customs,       setCustoms]       = useState(() => load(CK, []));
  const [view,          setView]          = useState("log");
  const [logDate,       setLogDate]       = useState(today());
  const [logType,       setLogType]       = useState("Power");
  const [logName,       setLogName]       = useState("");
  const [logNotes,      setLogNotes]      = useState("");
  const [exercises,     setExercises]     = useState([]);
  const [addCust,       setAddCust]       = useState(false);
  const [custName,      setCustName]      = useState("");
  const [liftSelectVal, setLiftSelectVal] = useState("");
  const [histCat,       setHistCat]       = useState(null);
  const [openLift,      setOpenLift]      = useState(null);
  const [openWod,       setOpenWod]       = useState(null);
  const [saved,         setSaved]         = useState(false);
  const [imgReading,    setImgReading]    = useState(false);
  const [prCelebration, setPrCelebration] = useState(null); // {name, weight}

  useEffect(() => { persist(SK, data); },    [data]);
  useEffect(() => { persist(CK, customs); }, [customs]);

  const isWL = logType === "Power";
  const todaySessions = data.sessions.filter(s => s.date === logDate);
  const savedLifts   = [...new Set(data.sessions.flatMap(s => s.exercises.map(e => e.name)))];
  const currentLifts = exercises.map(e => e.name);
  const recentLifts  = [...new Set([...currentLifts, ...savedLifts])];
  const otherLifts   = ALL_LIFTS.filter(l => !recentLifts.includes(l));
  const otherCustom  = customs.filter(l => !recentLifts.includes(l));

  const powerSessions = data.sessions.filter(s => isPowerType(s.type));
  const wodSessions   = data.sessions.filter(s => s.type === "WOD");
  const liftIndex = {};
  powerSessions.forEach(ses => {
    ses.exercises.forEach(ex => {
      if (!liftIndex[ex.name]) liftIndex[ex.name] = [];
      liftIndex[ex.name].push({ date: ses.date, sets: ex.sets });
    });
  });
  const liftNames = Object.keys(liftIndex).sort();

  function getProgress(name) {
    const byDate = {};
    data.sessions.forEach(ses => {
      ses.exercises.filter(ex => ex.name === name).forEach(ex => {
        const best = Math.max(...ex.sets.map(s => parseFloat(s.weight) || 0));
        if (best > 0 && (!byDate[ses.date] || best > byDate[ses.date])) byDate[ses.date] = best;
      });
    });
    return Object.entries(byDate).sort((a,b) => a[0].localeCompare(b[0])).map(([date,kg]) => ({ date, kg }));
  }

  function addLift(name) {
    if (!name || name === "__custom__") return;
    setExercises(ex => [...ex, { name, sets:[blankSet()] }]);
    setLiftSelectVal(name);
  }
  function confirmCustom() {
    const n = custName.trim(); if (!n) return;
    if (!customs.includes(n)) setCustoms(c => [...c, n]);
    setExercises(ex => [...ex, { name:n, sets:[blankSet()] }]);
    setCustName(""); setAddCust(false); setLiftSelectVal(n);
  }
  function updSet(ei,si,f,v) { setExercises(exs => exs.map((ex,i) => i!==ei?ex:{ ...ex, sets:ex.sets.map((s,j) => j!==si?s:{ ...s,[f]:v }) })); }
  function addSet(ei)        { setExercises(exs => exs.map((ex,i) => i!==ei?ex:{ ...ex, sets:[...ex.sets,blankSet()] })); }
  function remSet(ei,si)     { setExercises(exs => exs.map((ex,i) => i!==ei?ex:{ ...ex, sets:ex.sets.filter((_,j) => j!==si) })); }
  function remEx(ei)         { setExercises(exs => exs.filter((_,i) => i!==ei)); }

  async function readImageNotes(file) {
    if (!file) return;
    setImgReading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: base64 } },
              { type: "text", text: "Read this image and transcribe exactly what is written. Return only the text content, nothing else. Keep the original formatting with line breaks." }
            ]
          }]
        })
      });
      const data = await resp.json();
      const text = data.content?.map(b => b.text || "").join("").trim();
      if (text) setLogNotes(n => n ? n + "\n" + text : text);
    } catch (e) {
      alert("Could not read image. Please try again.");
    }
    setImgReading(false);
  }

  function saveSession() {
    const isPow = logType === "Power";
    const vex = isPow ? exercises.map(ex => ({ ...ex, sets:ex.sets.filter(s=>s.reps||s.weight) })).filter(ex=>ex.sets.length>0) : [];
    if (isPow && !vex.length && !logNotes) return;
    if (!isPow && !logName && !logNotes) return;
    const session = { id:Date.now(), date:logDate, type:logType, wodName:logName, notes:logNotes, exercises:vex };
    const p = { ...data.prs };
    const newPRs = [];
    vex.forEach(ex => ex.sets.forEach(s => {
      const w = parseFloat(s.weight);
      if (!isNaN(w) && w > 0 && (!p[ex.name] || w > p[ex.name])) {
        if (!p[ex.name] || w > p[ex.name]) newPRs.push({ name: ex.name, weight: w });
        p[ex.name] = w;
      }
    }));
    setData(d => ({ sessions:[session,...d.sessions], prs:p }));
    setExercises([]); setLogName(""); setLogNotes(""); setLiftSelectVal("");
    setSaved(true); setTimeout(() => setSaved(false), 2500);
    if (newPRs.length > 0) {
      setPrCelebration(newPRs[0]);
      setTimeout(() => setPrCelebration(null), 4000);
    }
  }

  // ── Shared styles ──
  const inp = {
    width:"100%", background:C.surface, border:`1px solid ${C.border}`, color:C.text,
    padding:"12px 14px", fontSize:15, borderRadius:12, fontFamily:FONT_BODY,
    boxSizing:"border-box", outline:"none",
  };
  const sel = { ...inp, appearance:"none", WebkitAppearance:"none", MozAppearance:"none", cursor:"pointer" };
  const pBtn = {
    width:"100%", background:C.rose, color:"#fff", border:"none",
    padding:"15px", fontSize:13, letterSpacing:1, fontWeight:600,
    borderRadius:14, cursor:"pointer", fontFamily:FONT_LABEL,
    boxShadow:`0 4px 16px ${C.rose}44`,
  };
  const oBtn = {
    width:"100%", background:"transparent", color:C.rose, border:`1.5px solid ${C.rose}`,
    padding:"13px", fontSize:13, letterSpacing:1, fontWeight:600,
    borderRadius:14, cursor:"pointer", fontFamily:FONT_LABEL,
  };
  const gBtn = { background:"transparent", border:"none", color:C.text3, cursor:"pointer", fontSize:18, padding:"0 2px", fontFamily:FONT_LABEL, lineHeight:1 };
  const lbl  = { fontSize:10, letterSpacing:2, color:C.text3, textTransform:"uppercase", marginBottom:8, display:"block", fontFamily:FONT_LABEL };
  const card = {
    background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:16, marginBottom:12, overflow:"hidden",
    boxShadow:"0 2px 12px rgba(180,100,90,0.06)",
  };
  const nb = (a) => ({
    flex:1, padding:"14px 4px", fontSize:10, letterSpacing:1, fontWeight:600,
    textTransform:"uppercase", border:"none", background:"transparent",
    color:a?C.rose:C.text3, cursor:"pointer",
    borderBottom:a?`2px solid ${C.rose}`:"2px solid transparent",
    fontFamily:FONT_LABEL,
  });
  const pill = {
    display:"inline-block", fontSize:9, letterSpacing:1, fontWeight:600,
    textTransform:"uppercase", padding:"3px 9px", borderRadius:20,
    background:C.rosePale, color:C.rose, border:`1px solid ${C.border2}`,
    fontFamily:FONT_LABEL,
  };

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:FONT_BODY, maxWidth:480, margin:"0 auto", paddingBottom:90 }}>

      {/* ── Header ── */}
      <div style={{ padding:"28px 20px 18px", borderBottom:`1px solid ${C.border}`, background:C.surface }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:4, color:C.rose, textTransform:"uppercase", marginBottom:6, fontFamily:FONT_LABEL }}>
          ✦ Girl Power
        </div>
        <div style={{ fontSize:22, fontWeight:400, color:C.text, letterSpacing:-0.3, fontFamily:FONT_BODY }}>
          {dateStr}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ display:"flex", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.surface, zIndex:20 }}>
        {[["log","Log"],["history","History"],["prs","PRs"]].map(([id,label]) => (
          <button key={id} style={nb(view===id)} onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>

      {/* ══ LOG ══════════════════════════════════════════════════ */}
      {view === "log" && (
        <div>
          <div style={{ padding:"18px 20px" }}>

            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={lbl}>Date</label>
                <input type="date" style={inp} value={logDate} onChange={e => setLogDate(e.target.value)} />
              </div>
              <div style={{ flex:1 }}>
                <label style={lbl}>Type</label>
                <div style={{ position:"relative" }}>
                  <select style={sel} value={logType} onChange={e => {
                    setLogType(e.target.value); setLogName(""); setExercises([]); setLiftSelectVal("");
                  }}>
                    <option value="Power">Power</option>
                    <option value="WOD">WOD</option>
                  </select>
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:C.text3, pointerEvents:"none" }}>›</span>
                </div>
              </div>
            </div>

            {!isWL && (
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>WOD Name</label>
                <input style={inp} placeholder="e.g. Fran, Murph…" value={logName} onChange={e => setLogName(e.target.value)} />
              </div>
            )}

            {isWL && (
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Add Lift</label>
                {addCust ? (
                  <div style={{ display:"flex", gap:8 }}>
                    <input autoFocus style={{ ...inp, flex:1 }} placeholder="Exercise name…"
                      value={custName} onChange={e => setCustName(e.target.value)}
                      onKeyDown={e => { if(e.key==="Enter") confirmCustom(); if(e.key==="Escape"){ setAddCust(false); setCustName(""); } }} />
                    <button onClick={confirmCustom} style={{ flexShrink:0, background:C.rose, color:"#fff", border:"none", borderRadius:12, padding:"0 16px", fontFamily:FONT_LABEL, fontSize:13, fontWeight:600, cursor:"pointer" }}>Add</button>
                    <button onClick={() => { setAddCust(false); setCustName(""); }} style={{ flexShrink:0, background:"transparent", border:`1px solid ${C.border2}`, color:C.text3, borderRadius:12, padding:"0 12px", fontFamily:FONT_LABEL, cursor:"pointer" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ position:"relative" }}>
                    <select style={sel} value={liftSelectVal} onChange={e => {
                      const val = e.target.value;
                      if (val === "__custom__") { setAddCust(true); }
                      else if (val) { addLift(val); }
                    }}>
                      <option value="">— choose a lift —</option>
                      {(recentLifts.length > 0 || liftSelectVal) && (
                        <optgroup label="Recent">
                          {[...new Set([...(liftSelectVal?[liftSelectVal]:[]),...recentLifts])].map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="All Lifts">
                        {otherLifts.map(l => <option key={l} value={l}>{l}</option>)}
                      </optgroup>
                      {otherCustom.length > 0 && (
                        <optgroup label="My Custom Lifts">
                          {otherCustom.map(l => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="──────────">
                        <option value="__custom__">+ Add custom lift…</option>
                      </optgroup>
                    </select>
                    <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:C.text3, pointerEvents:"none" }}>›</span>
                  </div>
                )}
              </div>
            )}

            <label style={lbl}>Notes / Result</label>

            <textarea style={{ ...inp, minHeight:54, resize:"vertical", marginBottom:8 }} placeholder="Time, score, how it felt…"
              value={logNotes} onChange={e => setLogNotes(e.target.value)} />

            {/* Scan button below notes */}
            <label style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
              marginBottom:4, boxSizing:"border-box",
              background:"transparent", border:`1px solid ${C.border2}`, borderRadius:20, padding:"6px 14px",
              fontSize:11, fontWeight:500, color:C.text3,
              fontFamily:FONT_LABEL, cursor: imgReading ? "default" : "pointer",
              opacity: imgReading ? 0.7 : 1,
            }}>
              {imgReading ? "⏳ Reading…" : "📷 Scan WOD from photo"}
              {!imgReading && (
                <input
                  type="file"
                  accept="image/*"
                  style={{ position:"absolute", opacity:0, width:0, height:0 }}
                  onChange={e => {
                    const file = e.target.files && e.target.files[0];
                    if (file) readImageNotes(file);
                    e.target.value = "";
                  }}
                />
              )}
            </label>
          </div>

          <div style={{ padding:"0 20px" }}>
            {exercises.length > 0 && <label style={lbl}>Exercises ({exercises.length})</label>}
            {exercises.map((ex, ei) => {
              const prKg = data.prs[ex.name] || null;
              return (
                <div key={ei} style={card}>
                  <div style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}` }}>
                    <div>
                      <span style={{ fontSize:16, fontWeight:600, color:C.text }}>{ex.name}</span>
                      {prKg && <span style={{ fontSize:11, color:C.text3, marginLeft:8, fontFamily:FONT_LABEL }}>PR {prKg} kg</span>}
                    </div>
                    <button style={gBtn} onClick={() => remEx(ei)}>×</button>
                  </div>
                  <div style={{ padding:"14px 16px 16px" }}>
                    <SetTable sets={ex.sets} prKg={prKg}
                      onChange={(si,f,v) => updSet(ei,si,f,v)}
                      onAddSet={() => addSet(ei)}
                      onRemoveSet={si => remSet(ei,si)} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding:"14px 20px" }}>
            {todaySessions.length > 0 && (
              <div style={{ fontSize:12, color:C.text3, textAlign:"center", marginBottom:10, fontFamily:FONT_LABEL }}>
                {todaySessions.length} session{todaySessions.length>1?"s":""} saved today ✓
              </div>
            )}
            <button style={{ ...pBtn, opacity:(!exercises.length&&!logNotes)?0.4:1 }}
              onClick={saveSession} disabled={!exercises.length&&!logNotes}>
              Save Session
            </button>
          </div>
        </div>
      )}

      {/* ══ HISTORY ══════════════════════════════════════════════ */}
      {view === "history" && (
        <div style={{ padding:"18px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <label style={{ ...lbl, marginBottom:0 }}>{data.sessions.length} sessions logged</label>
            {data.sessions.length > 0 && (
              <button onClick={() => {
                if (window.confirm("Clear all data?")) { setData({ sessions:[], prs:{} }); setCustoms([]); }
              }} style={{ background:"transparent", border:`1px solid ${C.border2}`, color:C.text3, fontSize:10, letterSpacing:1, padding:"4px 10px", borderRadius:20, cursor:"pointer", fontFamily:FONT_LABEL }}>
                Clear all
              </button>
            )}
          </div>

          {data.sessions.length === 0 && <p style={{ color:C.text3, fontSize:14 }}>No sessions yet — start logging! 🌸</p>}

          {/* Power */}
          {powerSessions.length > 0 && (
            <div style={{ ...card, marginBottom:12 }}>
              <div style={{ padding:"16px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
                onClick={() => { setHistCat(histCat==="Power"?null:"Power"); setOpenLift(null); }}>
                <div>
                  <span style={{ fontSize:17, fontWeight:600, color:C.text }}>Power</span>
                  <span style={{ fontSize:11, color:C.text3, marginLeft:10, fontFamily:FONT_LABEL }}>{liftNames.length} lift{liftNames.length!==1?"s":""}</span>
                </div>
                <span style={{ color:C.rose, fontSize:18 }}>{histCat==="Power"?"‹":"›"}</span>
              </div>

              {histCat === "Power" && (
                <div style={{ borderTop:`1px solid ${C.border}` }}>
                  {liftNames.map((name, li) => {
                    const entries = liftIndex[name].sort((a,b) => b.date.localeCompare(a.date));
                    const prKg    = data.prs[name] || null;
                    const isOpen  = openLift === name;
                    return (
                      <div key={name} style={{ borderBottom: li < liftNames.length-1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
                          onClick={() => setOpenLift(isOpen?null:name)}>
                          <div>
                            <span style={{ fontSize:15, fontWeight:500, color:C.text }}>{name}</span>
                            {prKg && <span style={{ fontSize:11, color:C.rose, marginLeft:8, fontFamily:FONT_LABEL }}>PR {prKg} kg</span>}
                          </div>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ fontSize:11, color:C.text3, fontFamily:FONT_LABEL }}>{entries.length}×</span>
                            <span style={{ color:C.rose, fontSize:16 }}>{isOpen?"‹":"›"}</span>
                          </div>
                        </div>

                        {isOpen && (
                          <div style={{ background:C.surface2, padding:"16px 18px", borderTop:`1px solid ${C.border}` }}>
                            <div style={{ marginBottom:16 }}>
                              <ProgressChart points={getProgress(name)} />
                            </div>
                            {entries.map((entry, ei) => (
                              <div key={ei} style={{ marginBottom:16 }}>
                                <div style={{ fontSize:10, color:C.rose, letterSpacing:2, textTransform:"uppercase", marginBottom:8, fontFamily:FONT_LABEL }}>
                                  {fmt(entry.date)}
                                </div>
                                <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr", gap:4, marginBottom:4 }}>
                                  <span style={{ fontSize:9, color:C.text3, textAlign:"center", fontFamily:FONT_LABEL }}>#</span>
                                  <span style={{ fontSize:9, color:C.text3, letterSpacing:2, textAlign:"center", fontFamily:FONT_LABEL }}>Reps</span>
                                  <span style={{ fontSize:9, color:C.text3, letterSpacing:2, textAlign:"center", fontFamily:FONT_LABEL }}>kg</span>
                                </div>
                                {entry.sets.map((s, si) => {
                                  const w = parseFloat(s.weight);
                                  const pr = prKg && !isNaN(w) && w >= prKg;
                                  return (
                                    <div key={si} style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr", gap:4, padding:"4px 0" }}>
                                      <span style={{ fontSize:11, color:pr?C.rose:C.text3, textAlign:"center", fontFamily:FONT_LABEL }}>{pr?"♡":si+1}</span>
                                      <span style={{ fontSize:14, textAlign:"center", color:C.text2 }}>{s.reps||"—"}</span>
                                      <span style={{ fontSize:14, textAlign:"center", color:pr?C.rose:C.text2 }}>{s.weight?`${s.weight} kg`:"—"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* WOD */}
          {wodSessions.length > 0 && (
            <div style={card}>
              <div style={{ padding:"16px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
                onClick={() => { setHistCat(histCat==="WOD"?null:"WOD"); setOpenWod(null); }}>
                <div>
                  <span style={{ fontSize:17, fontWeight:600, color:C.text }}>WOD</span>
                  <span style={{ fontSize:11, color:C.text3, marginLeft:10, fontFamily:FONT_LABEL }}>{wodSessions.length} session{wodSessions.length!==1?"s":""}</span>
                </div>
                <span style={{ color:C.rose, fontSize:18 }}>{histCat==="WOD"?"‹":"›"}</span>
              </div>
              {histCat === "WOD" && (
                <div style={{ borderTop:`1px solid ${C.border}` }}>
                  {wodSessions.map((ses, si) => {
                    const isOpen = openWod === ses.id;
                    return (
                      <div key={ses.id} style={{ borderBottom: si < wodSessions.length-1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
                          onClick={() => setOpenWod(isOpen?null:ses.id)}>
                          <div>
                            <div style={{ fontSize:15, fontWeight:500, color:C.text }}>{ses.wodName || "WOD"}</div>
                            <div style={{ fontSize:11, color:C.text3, marginTop:2, fontFamily:FONT_LABEL }}>{fmt(ses.date)}</div>
                          </div>
                          <span style={{ color:C.rose, fontSize:16 }}>{isOpen?"‹":"›"}</span>
                        </div>
                        {isOpen && (
                          <div style={{ background:C.surface2, padding:"14px 18px", borderTop:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:14, color:C.text2 }}>{ses.notes || "No notes recorded"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ PRs ══════════════════════════════════════════════════ */}
      {view === "prs" && (
        <div style={{ padding:"18px 20px" }}>
          <label style={lbl}>{Object.keys(data.prs).length} personal records</label>
          {Object.keys(data.prs).length === 0 && <p style={{ color:C.text3, fontSize:14 }}>Log sessions with weights to track your PRs ✨</p>}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(180,100,90,0.06)" }}>
            {Object.entries(data.prs).sort((a,b)=>a[0].localeCompare(b[0])).map(([name,weight],i,arr) => (
              <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:15, fontWeight:500, color:C.text }}>{name}</span>
                <div>
                  <span style={{ fontSize:22, fontWeight:600, color:C.rose }}>{weight}</span>
                  <span style={{ fontSize:12, color:C.text3, marginLeft:4, fontFamily:FONT_LABEL }}>kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      <div style={{
        position:"fixed", bottom:100, left:"50%", transform:"translateX(-50%)",
        background:C.rose, color:"#fff", padding:"12px 28px", borderRadius:24,
        fontSize:13, letterSpacing:1, fontFamily:FONT_LABEL,
        boxShadow:`0 4px 20px ${C.rose}66`,
        opacity:saved?1:0, transition:"opacity 0.3s", pointerEvents:"none", zIndex:100,
      }}>
        Saved ✓
      </div>

      {/* PR Banner */}
      {prCelebration && (
        <div style={{
          position:"fixed", top:0, left:0, right:0, zIndex:200,
          display:"flex", flexDirection:"column", alignItems:"center",
          animation:"slideDown 0.4s ease-out",
        }}>
          <style>{`
            @keyframes slideDown { from { transform:translateY(-100%); } to { transform:translateY(0); } }
            @keyframes fadeUp { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-20px); } }
            .pr-banner { animation: slideDown 0.4s ease-out, fadeUp 0.5s ease-in 3.5s forwards; }
            @keyframes confettiFall {
              0%   { transform: translateY(-10px) rotate(0deg);   opacity:1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity:0; }
            }
            .confetti-piece { position:fixed; top:-10px; animation: confettiFall linear forwards; border-radius:2px; }
          `}</style>

          {/* Confetti */}
          {[...Array(30)].map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${Math.random()*100}%`,
              width: `${6 + Math.random()*6}px`,
              height: `${10 + Math.random()*8}px`,
              background: [C.rose,"#f4a7a3","#fcd5ce","#c77daa","#e8c8c0","#f9e4e1"][i%6],
              animationDuration: `${1.5 + Math.random()*2}s`,
              animationDelay: `${Math.random()*0.5}s`,
            }}/>
          ))}

          {/* Banner */}
          <div className="pr-banner" style={{
            background: `linear-gradient(135deg, ${C.rose}, #c77daa)`,
            color:"#fff", padding:"18px 32px", width:"100%",
            textAlign:"center", boxShadow:"0 4px 24px rgba(180,80,100,0.35)",
          }}>
            <div style={{ fontSize:22, marginBottom:4 }}>🏆✨🎉</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:FONT_LABEL, letterSpacing:0.5 }}>
              New Personal Record!
            </div>
            <div style={{ fontSize:15, fontFamily:FONT_BODY, marginTop:4, opacity:0.92 }}>
              {prCelebration.name} — {prCelebration.weight} kg
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
