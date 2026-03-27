import { useState, useEffect, useMemo, useRef } from "react";

const API_BASE = "https://dataset-finder-backend-production.up.railway.app";
const MAX_SEARCHES_PER_DAY = 5;

const FACTOR_META = {
  citationCount:     { label: "Citation Count",     icon: "📚", desc: "How many published papers have cited or used this dataset" },
  sourceCredibility: { label: "Source Credibility", icon: "🏛",  desc: "Trustworthiness of the institution or organisation that published it" },
  documentation:     { label: "Documentation",      icon: "📋", desc: "Quality of data cards, metadata, column descriptions and labels" },
  licenseClarity:    { label: "License Clarity",    icon: "⚖️", desc: "Whether it has a clear, open license allowing research use" },
  communityAdoption: { label: "Community Adoption", icon: "🌐", desc: "How widely used it is across the ML and research community" },
  maintenance:       { label: "Maintenance",        icon: "🔧", desc: "How actively the dataset is maintained and kept up to date" },
  biasAndDiversity:  { label: "Bias & Diversity",   icon: "⚖",  desc: "How representative, balanced and free from demographic bias the data is" },
};

const SOURCES = ["Kaggle","HuggingFace","UCI ML Repository","PapersWithCode","Zenodo","GitHub","Government"];
const LICENSES = ["CC BY 4.0","CC0","MIT","Apache 2.0","Public Domain","Other"];

const getToken = () => localStorage.getItem("token");
const setToken = (t) => localStorage.setItem("token", t);
const removeToken = () => localStorage.removeItem("token");

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  return fetch(API_BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
};

// FIX: PDF download with auth token instead of window.open
const downloadPdfWithAuth = async (id) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/saved/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { alert("Failed to download PDF"); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `dataset-${id}.pdf`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

const S = {
  input: { width: "100%", padding: "11px 14px", background: "rgba(10,20,50,0.85)", border: "1px solid #1e3a8a", borderRadius: 10, color: "#e0e8ff", fontSize: 14, fontFamily: "'Syne',sans-serif", outline: "none", boxSizing: "border-box" },
  btn: (v="primary") => ({
    padding: "10px 18px", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "'Syne',sans-serif", cursor: "pointer",
    background: v==="primary" ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : v==="danger" ? "rgba(239,68,68,0.12)" : "rgba(30,58,138,0.25)",
    color: v==="danger" ? "#ef4444" : "#fff",
    border: v!=="primary" ? `1px solid ${v==="danger"?"#ef444440":"#1e3a8a"}` : "none",
    transition: "all 0.2s ease",
  }),
  card: { background: "rgba(8,15,40,0.92)", border: "1px solid #0d1b3e", borderRadius: 14, overflow: "hidden" },
};

// ── Profile Dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ user, logout, setPage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "U";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px 5px 6px", background:"rgba(30,58,138,0.2)", borderRadius:24, border:"1px solid #1e3a8a", cursor:"pointer", transition:"all 0.2s", userSelect:"none" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(30,58,138,0.35)"}
        onMouseLeave={e => e.currentTarget.style.background="rgba(30,58,138,0.2)"}>
        {user.avatar
          ? <img src={user.avatar} style={{ width:28, height:28, borderRadius:"50%", border:"2px solid #1e3a8a" }} alt="" />
          : <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff", border:"2px solid #1e3a8a" }}>{initials}</div>
        }
        <span style={{ fontSize:12, color:"#aabcd8", fontWeight:600, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</span>
        <span style={{ fontSize:10, color:"#4a5a7a", transition:"transform 0.2s", transform: open?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
      </div>

      {open && (
        <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", width:200, background:"rgba(5,11,26,0.98)", border:"1px solid #1e3a8a", borderRadius:12, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.5)", zIndex:200, animation:"fadeIn 0.15s ease" }}>
          <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {/* User info */}
          <div style={{ padding:"12px 14px", borderBottom:"1px solid #0d1b3e" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#e0e8ff", marginBottom:2 }}>{user.name}</div>
            <div style={{ fontSize:11, color:"#4a5a7a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
          </div>

          {/* Menu items */}
          {[
            { icon:"🔍", label:"Search Datasets", action:() => { setPage("search"); setOpen(false); } },
            { icon:"📚", label:"My Library", action:() => { setPage("saved"); setOpen(false); } },
            { icon:"ℹ️", label:"About", action:() => { setPage("about"); setOpen(false); } },
          ].map(item => (
            <div key={item.label} onClick={item.action}
              style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:13, color:"#aabcd8", transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(30,58,138,0.3)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}

          {/* Divider + Logout */}
          <div style={{ borderTop:"1px solid #0d1b3e" }}>
            <div onClick={() => { logout(); setOpen(false); }}
              style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:13, color:"#ef4444", transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <span>🚪</span><span>Logout</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── About Page ────────────────────────────────────────────────────────────────
function AboutPage({ setPage }) {
  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"50px 20px 80px" }}>
      <div style={{ ...S.card, padding:36 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⬡</div>
          <h1 style={{ margin:"0 0 8px", fontSize:28, fontWeight:800, background:"linear-gradient(135deg,#e0e8ff,#6fa3ef)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>DatasetFinder</h1>
          <p style={{ color:"#6b7a9a", fontSize:14, margin:0 }}>AI-Powered Dataset Discovery, Backed by Science</p>
        </div>

        {[
          { icon:"🤖", title:"How it works", body:"DatasetFinder uses Claude AI (Haiku) combined with real-time Serper web search to find the most relevant, reliable datasets for your research query. Results are ranked across 7 scientific reliability factors." },
          { icon:"📊", title:"Reliability Scoring", body:"Every dataset is scored /10 across Citation Count, Source Credibility, Documentation, License Clarity, Community Adoption, Maintenance, and Bias & Diversity." },
          { icon:"⚡", title:"Search Modes", body:"Fast mode uses Claude's training knowledge for instant results. Live mode fetches real-time data from the web. Cached mode returns previously searched results instantly." },
          { icon:"🔒", title:"Your Data", body:"Your saved datasets and collections are stored securely in MongoDB. We never sell your data. Login is optional — guest users can search up to 5 times per day." },
        ].map(item => (
          <div key={item.title} style={{ display:"flex", gap:14, marginBottom:20, padding:"16px", background:"rgba(4,9,22,0.6)", border:"1px solid #0d1b3e", borderRadius:10 }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#e0e8ff", marginBottom:4 }}>{item.title}</div>
              <div style={{ fontSize:13, color:"#8899bb", lineHeight:1.6 }}>{item.body}</div>
            </div>
          </div>
        ))}

        <div style={{ textAlign:"center", marginTop:24 }}>
          <button onClick={() => setPage("search")} style={{ ...S.btn("primary"), padding:"11px 28px" }}>🔍 Start Searching</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage]       = useState("search");
  const [user, setUser]       = useState(null);
  const [authLoading, setAL]  = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token && window.location.pathname === "/auth/callback") {
      setToken(token);
      setUser({ name: decodeURIComponent(params.get("name")||""), email: decodeURIComponent(params.get("email")||"") });
      window.history.replaceState({}, "", "/");
      setPage("search");
    }
  }, []);

  useEffect(() => {
    if (!getToken()) { setAL(false); return; }
    apiFetch("/auth/me").then(r => r.ok ? r.json() : null).then(u => {
      if (u) setUser(u); else removeToken();
      setAL(false);
    }).catch(() => { removeToken(); setAL(false); });
  }, []);

  const logout = () => { removeToken(); setUser(null); setPage("search"); };

  if (authLoading) return <Loading />;

  return (
    <div style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", overflowX: "hidden", background: "#050b1a", color: "#e0e8ff", fontFamily: "'Syne',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        body { margin:0; padding:0; overflow-x:hidden; }
        @media(max-width:600px){
          .search-row{flex-direction:column!important}
          .factor-grid{grid-template-columns:1fr!important}
          .card-inner{flex-direction:column!important}
          .filter-row{flex-direction:column!important}
        }
        .hover-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(30,58,138,0.25); }
        .hover-btn:hover { opacity: 0.85; transform: scale(0.98); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
      `}</style>

      {/* Animated background grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(30,58,138,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,0.07) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />
      {/* Glow orbs */}
      <div style={{ position:"fixed", top:"-20%", left:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"-20%", right:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(30,58,138,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(5,11,26,0.95)", borderBottom:"1px solid #0d1b3e", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", backdropFilter:"blur(12px)", flexWrap:"wrap", gap:8 }}>
        <span onClick={() => setPage("search")} style={{ fontWeight:800, fontSize:18, color:"#6fa3ef", cursor:"pointer", letterSpacing:1, display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:20 }}>⬡</span> DatasetFinder
        </span>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {user ? (
            <ProfileDropdown user={user} logout={logout} setPage={setPage} />
          ) : (
            <>
              <button onClick={() => setPage("login")} style={{ ...S.btn("ghost"), padding:"7px 16px", fontSize:13 }}>Login</button>
              <button onClick={() => setPage("register")}
                style={{ ...S.btn("primary"), padding:"7px 16px", fontSize:13 }}
                onMouseEnter={e => e.currentTarget.style.transform="scale(1.04)"}
                onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      <div style={{ position:"relative" }}>
        {page==="search"   && <SearchPage user={user} setPage={setPage} />}
        {page==="login"    && <LoginPage setUser={setUser} setPage={setPage} />}
        {page==="register" && <RegisterPage setUser={setUser} setPage={setPage} />}
        {page==="saved"    && <SavedPage user={user} setPage={setPage} />}
        {page==="about"    && <AboutPage setPage={setPage} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEARCH PAGE
// ════════════════════════════════════════════════════════════════════════════
function SearchPage({ user, setPage }) {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState(null);
  const [searched, setSearched]     = useState("");
  const [showFactor, setShowFactor] = useState(false);
  const [rateInfo, setRateInfo]     = useState(null);
  const [saveMsg, setSaveMsg]       = useState({});
  const [collections, setCols]      = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [queryType, setQueryType]   = useState(null);
  const [searchMode, setSearchMode] = useState(null);
  const [fromCache, setFromCache]   = useState(false);
  const [hoveredSample, setHoveredSample] = useState(null);

  const [sortBy, setSortBy]         = useState("reliability");
  const [filterSource, setFilterSource] = useState("");
  const [filterLicense, setFilterLicense] = useState("");
  const [filterMinScore, setFilterMinScore] = useState(0);

  useEffect(() => {
    apiFetch("/api/rate-limit").then(r => r.json()).then(setRateInfo).catch(()=>{});
    if (user) apiFetch("/api/collections").then(r => r.json()).then(d => Array.isArray(d) ? setCols(d) : setCols([])).catch(()=>{});
  }, [user]);

  const search = async (liveSearch = false) => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(null); setResults(null); setSearched(query); setExpanded(null); setQueryType(null); setSearchMode(null);
    try {
      const res = await apiFetch("/api/search", { method:"POST", body:JSON.stringify({ query:query.trim(), liveSearch: liveSearch === true }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed."); return; }
      setResults(data.datasets);
      setQueryType(data.queryType);
      setSearchMode(data.mode);
      setFromCache(data.fromCache || false);
      setRateInfo({ remaining:data.remaining, used:data.used, max:data.max });
    } catch (err) { setError("Search failed: " + err.message); }
    finally { setLoading(false); }
  };

  const filteredResults = useMemo(() => {
    if (!results) return null;
    let filtered = [...results];
    if (filterSource) filtered = filtered.filter(d => d.source?.toLowerCase().includes(filterSource.toLowerCase()));
    if (filterLicense) filtered = filtered.filter(d => d.license?.toLowerCase().includes(filterLicense.toLowerCase()));
    if (filterMinScore > 0) filtered = filtered.filter(d => d.reliabilityScore >= filterMinScore);
    filtered.sort((a, b) => {
      if (sortBy === "reliability") return (b.reliabilityScore || 0) - (a.reliabilityScore || 0);
      if (sortBy === "year") return (b.year || 0) - (a.year || 0);
      if (sortBy === "size") return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      return 0;
    });
    return filtered;
  }, [results, sortBy, filterSource, filterLicense, filterMinScore]);

  const saveDataset = async (ds, collectionId=null) => {
    if (!user) { setPage("login"); return; }
    setSaveMsg(p => ({ ...p, [ds.name]:"saving" }));
    const res = await apiFetch("/api/saved", { method:"POST", body:JSON.stringify({ dataset:ds, collectionId }) });
    const data = await res.json();
    setSaveMsg(p => ({ ...p, [ds.name]: res.ok ? "saved" : (data.error||"Error") }));
    setTimeout(() => setSaveMsg(p => ({ ...p, [ds.name]:null })), 3000);
  };

  const scoreColor = (s) => s>=8?"#00E5A0":s>=6?"#FFB800":s>=4?"#FF8C42":"#FF5A5A";
  const rankColors = ["#FFD700","#C0C0C0","#CD7F32"];
  const remaining  = rateInfo?.remaining ?? MAX_SEARCHES_PER_DAY;
  const pillColor  = remaining>2?"#00E5A0":remaining>0?"#FFB800":"#FF5A5A";

  const ScoreBar = ({ score, small }) => {
    const color = scoreColor(score);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, height:small?4:6, background:"#0d1b3e", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:(score/10*100)+"%", background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:3, transition:"width 0.6s ease" }} />
        </div>
        <span style={{ fontSize:small?11:13, fontWeight:700, color, fontFamily:"monospace", minWidth:28 }}>{score}</span>
      </div>
    );
  };

  const samples = ["image classification","mental health AND depression","climate data","NLP OR sentiment","medical imaging","fraud detection"];

  return (
    <div style={{ maxWidth:900, width:"100%", margin:"0 auto", padding:"46px 20px 80px" }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <div style={{ padding:"5px 14px", background:"rgba(30,58,138,0.3)", border:"1px solid #1e3a8a", borderRadius:20, fontSize:11, color:"#6fa3ef", fontFamily:"'Space Mono',monospace", letterSpacing:2 }}>
            <span className="pulse" style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:"#6fa3ef", marginRight:6, verticalAlign:"middle" }} />
            LIVE AI-POWERED DATASET DISCOVERY
          </div>
          {rateInfo && (
            <div style={{ padding:"5px 12px", background:"rgba(0,0,0,0.4)", border:`1px solid ${pillColor}66`, borderRadius:20, fontSize:11, color:pillColor, fontFamily:"'Space Mono',monospace", transition:"color 0.3s" }}>
              {rateInfo.remaining}/{rateInfo.max} SEARCHES LEFT TODAY
            </div>
          )}
        </div>
        <h1 style={{ fontSize:"clamp(26px,5vw,52px)", fontWeight:800, lineHeight:1.05, margin:"0 0 14px", background:"linear-gradient(135deg,#e0e8ff 0%,#6fa3ef 50%,#3b82f6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Find the Right Dataset.<br />Backed by Science.
        </h1>
        <p style={{ color:"#6b7a9a", fontSize:13, maxWidth:480, margin:"0 auto 14px", lineHeight:1.7 }}>
          Search any topic and get the top 3 most relevant datasets — ranked by reliability, citations, and real-world research usage.
          {!user && <span> <span onClick={() => setPage("register")} style={{ color:"#3b82f6", cursor:"pointer", textDecoration:"underline", fontWeight:600 }}>Sign up</span> to save datasets!</span>}
        </p>
        <button onClick={() => setShowFactor(!showFactor)}
          style={{ background:"none", border:"1px solid #1e3a8a", borderRadius:20, padding:"5px 14px", color:"#6fa3ef", fontSize:11, fontFamily:"'Space Mono',monospace", cursor:"pointer", transition:"all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.background="rgba(30,58,138,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#1e3a8a"; e.currentTarget.style.background="none"; }}>
          {showFactor?"▲ HIDE":"▼ WHAT MAKES A DATASET RELIABLE?"}
        </button>
        {showFactor && (
          <div style={{ marginTop:12, background:"rgba(8,15,40,0.97)", border:"1px solid #1e3a8a", borderRadius:14, padding:"14px 16px", textAlign:"left", maxWidth:640, margin:"12px auto 0" }}>
            <p style={{ margin:"0 0 10px", fontSize:10, color:"#6b7a9a", fontFamily:"'Space Mono',monospace", letterSpacing:1 }}>RELIABILITY IS SCORED /10 ACROSS 7 FACTORS:</p>
            <div className="factor-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {Object.entries(FACTOR_META).map(([k,f]) => (
                <div key={k} style={{ padding:"7px 9px", background:"#050b1a", border:"1px solid #0d1b3e", borderRadius:8, transition:"border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="#1e3a8a"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="#0d1b3e"}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#c8d8f0", marginBottom:2 }}>{f.icon} {f.label}</div>
                  <div style={{ fontSize:10, color:"#6b7a9a", lineHeight:1.4 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="search-row" style={{ maxWidth:680, width:"100%", margin:"0 auto 12px", display:"flex", gap:10 }}>
        <div style={{ flex:1, position:"relative" }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==="Enter" && search()}
            placeholder='e.g. "climate data" or "mental health AND suicidal"'
            disabled={rateInfo?.remaining===0}
            style={{ ...S.input, paddingLeft:42, opacity:rateInfo?.remaining===0?0.5:1, transition:"all 0.2s" }} />
          <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:17, opacity:0.4 }}>⌕</span>
        </div>
        <button onClick={() => search(false)} disabled={loading||!query.trim()||rateInfo?.remaining===0}
          style={{ ...S.btn("primary"), whiteSpace:"nowrap", opacity:(loading||rateInfo?.remaining===0)?0.5:1, cursor:(loading||rateInfo?.remaining===0)?"not-allowed":"pointer", transition:"all 0.2s" }}
          onMouseEnter={e => { if(!loading && query.trim()) e.currentTarget.style.transform="scale(1.03)"; }}
          onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
          {loading?"Searching...":"Search →"}
        </button>
      </div>

      {/* Filter toggle */}
      {results && (
        <div style={{ maxWidth:680, margin:"0 auto 24px" }}>
          <button onClick={() => setShowFilters(!showFilters)} style={{ ...S.btn("ghost"), padding:"6px 14px", fontSize:12, width:"100%" }}>
            {showFilters?"▲ Hide Filters":"▼ Filter & Sort Results"}
            {(filterSource||filterLicense||filterMinScore>0||sortBy!=="reliability") && <span style={{ marginLeft:8, padding:"2px 7px", background:"rgba(59,130,246,0.2)", borderRadius:10, fontSize:10, color:"#6fa3ef" }}>Active</span>}
          </button>
          {showFilters && (
            <div style={{ marginTop:10, padding:"14px 16px", background:"rgba(8,15,40,0.95)", border:"1px solid #1e3a8a", borderRadius:12 }}>
              <div className="filter-row" style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ fontSize:10, color:"#6b7a9a", fontFamily:"'Space Mono',monospace", letterSpacing:1, display:"block", marginBottom:5 }}>SORT BY</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...S.input, padding:"7px 10px", fontSize:12 }}>
                    <option value="reliability">Reliability Score ↓</option>
                    <option value="year">Year (Newest First)</option>
                    <option value="size">Dataset Size ↓</option>
                  </select>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ fontSize:10, color:"#6b7a9a", fontFamily:"'Space Mono',monospace", letterSpacing:1, display:"block", marginBottom:5 }}>SOURCE</label>
                  <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ ...S.input, padding:"7px 10px", fontSize:12 }}>
                    <option value="">All Sources</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ fontSize:10, color:"#6b7a9a", fontFamily:"'Space Mono',monospace", letterSpacing:1, display:"block", marginBottom:5 }}>LICENSE</label>
                  <select value={filterLicense} onChange={e => setFilterLicense(e.target.value)} style={{ ...S.input, padding:"7px 10px", fontSize:12 }}>
                    <option value="">All Licenses</option>
                    {LICENSES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ fontSize:10, color:"#6b7a9a", fontFamily:"'Space Mono',monospace", letterSpacing:1, display:"block", marginBottom:5 }}>MIN RELIABILITY: {filterMinScore}/10</label>
                  <input type="range" min="0" max="10" step="0.5" value={filterMinScore} onChange={e => setFilterMinScore(Number(e.target.value))} style={{ width:"100%", accentColor:"#3b82f6" }} />
                </div>
              </div>
              <button onClick={() => { setSortBy("reliability"); setFilterSource(""); setFilterLicense(""); setFilterMinScore(0); }} style={{ ...S.btn("ghost"), padding:"5px 12px", fontSize:11, marginTop:10 }}>✕ Reset Filters</button>
            </div>
          )}
        </div>
      )}

      {rateInfo?.remaining===0 && (
        <div style={{ maxWidth:680, margin:"-6px auto 24px", padding:"12px 16px", background:"rgba(255,184,0,0.08)", border:"1px solid rgba(255,184,0,0.3)", borderRadius:12, textAlign:"center", color:"#FFB800", fontSize:13 }}>
          🔒 You've used all 5 free searches today. Come back tomorrow!
        </div>
      )}

      {loading && (
        <div style={{ textAlign:"center", padding:"60px 0" }}>
          <div style={{ position:"relative", display:"inline-block", width:56, height:56, marginBottom:14 }}>
            <div style={{ position:"absolute", inset:0, border:"3px solid #1e3a8a", borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            <div style={{ position:"absolute", inset:8, border:"2px solid #0d1b3e", borderBottomColor:"#6fa3ef", borderRadius:"50%", animation:"spin 1.2s linear infinite reverse" }} />
          </div>
          <p style={{ margin:"0 0 4px", color:"#6fa3ef", fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:2 }}>⚡ SEARCHING FOR "{searched.toUpperCase()}"</p>
          <p style={{ margin:0, color:"#3a4a6a", fontFamily:"'Space Mono',monospace", fontSize:10 }}>Usually takes 2–5 seconds</p>
          <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding:14, background:"rgba(255,90,90,0.1)", border:"1px solid rgba(255,90,90,0.3)", borderRadius:12, color:"#ff8a8a", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span> {error}
        </div>
      )}

      {filteredResults && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"#6b7a9a", letterSpacing:2 }}>
              {queryType==="AND" ? "🔗 AND SEARCH —" : queryType==="OR" ? "🔀 OR SEARCH —" : "TOP DATASETS FOR"}
            </span>
            <span style={{ padding:"3px 12px", background:"rgba(59,130,246,0.15)", border:"1px solid #3b82f6", borderRadius:20, fontSize:12, color:"#6fa3ef", fontWeight:700 }}>"{searched}"</span>
            {filteredResults.length < (results?.length||0) && (
              <span style={{ fontSize:11, color:"#FFB800", fontFamily:"'Space Mono',monospace" }}>{filteredResults.length} of {results?.length} shown</span>
            )}
            {searchMode === "cached" && <span style={{ padding:"3px 9px", background:"rgba(255,184,0,0.1)", border:"1px solid #FFB80044", borderRadius:20, fontSize:10, color:"#FFB800", fontFamily:"'Space Mono',monospace" }}>⚡ CACHED</span>}
            {searchMode === "fast" && <span style={{ padding:"3px 9px", background:"rgba(0,229,160,0.1)", border:"1px solid #00E5A044", borderRadius:20, fontSize:10, color:"#00E5A0", fontFamily:"'Space Mono',monospace" }}>⚡ FAST</span>}
            {searchMode === "live" && <span style={{ padding:"3px 9px", background:"rgba(59,130,246,0.1)", border:"1px solid #3b82f644", borderRadius:20, fontSize:10, color:"#6fa3ef", fontFamily:"'Space Mono',monospace" }}>🌐 LIVE</span>}
            <button onClick={() => search(true)} disabled={loading}
              style={{ marginLeft:"auto", padding:"4px 12px", background:"rgba(30,58,138,0.3)", border:"1px solid #1e3a8a", borderRadius:20, color:"#6fa3ef", fontSize:11, cursor:"pointer", fontFamily:"'Space Mono',monospace", transition:"all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(30,58,138,0.5)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(30,58,138,0.3)"}>
              🌐 Get Latest Data
            </button>
          </div>

          {filteredResults.length === 0 ? (
            <div style={{ ...S.card, padding:32, textAlign:"center" }}>
              <p style={{ color:"#4a5a7a", fontSize:14 }}>No datasets match your filters. Try adjusting them.</p>
              <button onClick={() => { setSortBy("reliability"); setFilterSource(""); setFilterLicense(""); setFilterMinScore(0); }} style={{ ...S.btn("primary"), marginTop:12 }}>Reset Filters</button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {filteredResults.map((ds, i) => {
                const isExpanded = expanded===i;
                const sc = ds.reliabilityScore;
                const rColor = scoreColor(sc);
                const msg = saveMsg[ds.name];
                const sortedPapers = [...(ds.papers||[])].sort((a,b)=>(b.year||0)-(a.year||0));

                return (
                  <div key={i} className="hover-card" style={{ ...S.card, border:`1px solid ${i===0?"#1e3a8a":"#0d1b3e"}` }}>
                    <div style={{ padding:"6px 18px", background:i===0?"linear-gradient(90deg,rgba(30,58,138,0.5),transparent)":"rgba(8,14,34,0.5)", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid #0d1b3e" }}>
                      <span style={{ fontSize:14, fontWeight:900, color:rankColors[Math.min(i,2)], fontFamily:"monospace" }}>#{i+1}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:rankColors[Math.min(i,2)], fontFamily:"'Space Mono',monospace", letterSpacing:2 }}>{["BEST MATCH","2ND BEST","3RD BEST"][Math.min(i,2)]}</span>
                      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ fontSize:11, color:"#4a5a7a" }}>Reliability</span>
                        <div style={{ width:80 }}><ScoreBar score={sc} small /></div>
                      </div>
                    </div>

                    <div style={{ padding:"14px 18px" }}>
                      <div className="card-inner" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, marginBottom:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#e0e8ff" }}>{ds.name}</h2>
                            <span style={{ padding:"2px 8px", background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:6, fontSize:10, color:"#6fa3ef", fontWeight:600 }}>{ds.source}</span>
                            {ds.year && <span style={{ fontSize:11, color:"#4a5a7a", fontFamily:"monospace" }}>{ds.year}</span>}
                          </div>
                          <p style={{ margin:0, color:"#8899bb", fontSize:13, lineHeight:1.6 }}>{ds.description}</p>
                        </div>
                        <div style={{ textAlign:"center", flexShrink:0, padding:"10px 14px", background:"rgba(4,9,22,0.6)", border:`1px solid ${rColor}33`, borderRadius:10 }}>
                          <div style={{ fontSize:24, fontWeight:900, color:rColor, fontFamily:"monospace", lineHeight:1 }}>{sc}</div>
                          <div style={{ fontSize:9, color:rColor, fontFamily:"'Space Mono',monospace", letterSpacing:1, marginTop:2 }}>/10</div>
                        </div>
                      </div>

                      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                        {[["SIZE",ds.size],["FORMAT",ds.format],["CITATIONS",(ds.citedInPapers||0).toLocaleString()],["LICENSE",ds.license],["UPDATED",ds.lastUpdated]].map(([l,v],idx) => (
                          <div key={idx} style={{ padding:"5px 9px", background:"#0a1228", border:"1px solid #0d1b3e", borderRadius:7, transition:"border-color 0.2s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor="#1e3a8a"}
                            onMouseLeave={e => e.currentTarget.style.borderColor="#0d1b3e"}>
                            <div style={{ fontSize:9, color:"#4a5a7a", fontFamily:"'Space Mono',monospace", letterSpacing:1, marginBottom:1 }}>{l}</div>
                            <div style={{ fontSize:11, fontWeight:600, color:"#aabcd8" }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display:"flex", gap:7, marginTop:10, flexWrap:"wrap" }}>
                        <button onClick={() => setExpanded(isExpanded?null:i)} style={{ ...S.btn("ghost"), padding:"5px 12px", fontSize:11 }}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(30,58,138,0.4)"}
                          onMouseLeave={e => e.currentTarget.style.background="rgba(30,58,138,0.25)"}>
                          {isExpanded?"▲ Hide":"▼ Details & Papers"}
                        </button>
                        <button onClick={() => saveDataset(ds)} style={{ ...S.btn(msg==="saved"?"ghost":"primary"), padding:"5px 12px", fontSize:11 }}>
                          {msg==="saving"?"Saving...":msg==="saved"?"✓ Saved!":msg?msg:"💾 Save"}
                        </button>
                        {user && collections.length>0 && (
                          <select onChange={e => { if(e.target.value) saveDataset(ds,e.target.value); e.target.value=""; }}
                            style={{ padding:"5px 9px", background:"#0a1228", border:"1px solid #1e3a8a", borderRadius:7, color:"#6fa3ef", fontSize:11, cursor:"pointer" }}>
                            <option value="">+ Add to Collection</option>
                            {collections.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop:"1px solid #0d1b3e", padding:"16px 18px", background:"rgba(4,9,22,0.7)" }}>
                        <h3 style={{ margin:"0 0 10px", fontSize:11, fontFamily:"'Space Mono',monospace", color:"#6fa3ef", letterSpacing:2 }}>📊 RELIABILITY FACTOR BREAKDOWN (/10)</h3>
                        <div className="factor-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:16 }}>
                          {Object.entries(FACTOR_META).map(([key,meta]) => {
                            const val = (ds.reliabilityFactors||{})[key]||0;
                            return (
                              <div key={key} style={{ padding:"8px 10px", background:"#080f2a", border:"1px solid #0d1b3e", borderRadius:8 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                  <span style={{ fontSize:11, fontWeight:600, color:"#c8d8f0" }}>{meta.icon} {meta.label}</span>
                                  <span style={{ fontSize:12, fontWeight:800, color:scoreColor(val), fontFamily:"monospace" }}>{val}/10</span>
                                </div>
                                <ScoreBar score={val} small />
                                <div style={{ fontSize:10, color:"#4a5a7a", marginTop:3, lineHeight:1.4 }}>{meta.desc}</div>
                              </div>
                            );
                          })}
                        </div>

                        <h3 style={{ margin:"0 0 8px", fontSize:11, fontFamily:"'Space Mono',monospace", color:"#6fa3ef", letterSpacing:2 }}>🛡 KEY RELIABILITY NOTES</h3>
                        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:16 }}>
                          {(ds.reliabilityReasons||[]).map((r,ri) => (
                            <div key={ri} style={{ display:"flex", gap:8, padding:"8px 10px", background:"#080f2a", border:"1px solid #0d1b3e", borderRadius:7 }}>
                              <span style={{ color:"#00E5A0", flexShrink:0 }}>✓</span>
                              <span style={{ fontSize:12, color:"#8899bb", lineHeight:1.5 }}>{r}</span>
                            </div>
                          ))}
                        </div>

                        <h3 style={{ margin:"0 0 8px", fontSize:11, fontFamily:"'Space Mono',monospace", color:"#6fa3ef", letterSpacing:2 }}>📚 RESEARCH PAPERS (NEWEST FIRST)</h3>
                        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
                          {sortedPapers.map((p,pi) => (
                            <div key={pi} style={{ padding:"8px 10px", background:"#080f2a", border:"1px solid #0d1b3e", borderRadius:7, transition:"border-color 0.2s" }}
                              onMouseEnter={e => e.currentTarget.style.borderColor="#1e3a8a"}
                              onMouseLeave={e => e.currentTarget.style.borderColor="#0d1b3e"}>
                              <div style={{ fontSize:12, fontWeight:600, color:"#c8d8f0", marginBottom:2, lineHeight:1.4 }}>{p.title}</div>
                              <div style={{ fontSize:11, color:"#6b7a9a", marginBottom:4 }}>{p.authors} · {p.year}</div>
                              <div style={{ display:"flex", gap:5 }}>
                                <span style={{ fontSize:10, padding:"2px 6px", background:"rgba(59,130,246,0.1)", borderRadius:4, color:"#6fa3ef" }}>{p.venue}</span>
                                <span style={{ fontSize:10, padding:"2px 6px", background:"rgba(0,229,160,0.1)", borderRadius:4, color:"#00E5A0" }}>⭐ {(p.citations||0).toLocaleString()} citations</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <a href={ds.url} target="_blank" rel="noopener noreferrer"
                          style={{ display:"block", padding:"10px", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius:9, color:"#fff", textDecoration:"none", textAlign:"center", fontWeight:700, fontSize:13, transition:"opacity 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
                          onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                          View Dataset Source →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && !results && !error && (
        <div style={{ textAlign:"center" }}>
          <p style={{ color:"#4a5a7a", fontSize:11, fontFamily:"'Space Mono',monospace", marginBottom:12, letterSpacing:1 }}>TRY A SAMPLE SEARCH:</p>
          <div style={{ display:"flex", justifyContent:"center", gap:7, flexWrap:"wrap", marginBottom:10 }}>
            {samples.map(s => (
              <button key={s} onClick={() => setQuery(s)}
                style={{ padding:"7px 14px", background: hoveredSample===s ? "rgba(30,58,138,0.4)" : "rgba(10,20,50,0.8)", border: hoveredSample===s ? "1px solid #3b82f6" : "1px solid #1e3a8a", borderRadius:20, color: hoveredSample===s ? "#c8d8f0" : "#6fa3ef", fontSize:11, cursor:"pointer", fontFamily:"'Syne',sans-serif", transition:"all 0.2s", transform: hoveredSample===s ? "translateY(-1px)" : "translateY(0)" }}
                onMouseEnter={() => setHoveredSample(s)}
                onMouseLeave={() => setHoveredSample(null)}>
                {s}
              </button>
            ))}
          </div>
          <p style={{ color:"#2a3a5a", fontSize:10, fontFamily:"'Space Mono',monospace" }}>SUPPORTS AND/OR QUERIES → e.g. "mental health AND depression"</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════════════════════
function LoginPage({ setUser, setPage }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const login = async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/auth/login", { method:"POST", body:JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error||"Login failed"); return; }
      setToken(data.token); setUser(data.user); setPage("search");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth:400, margin:"50px auto", padding:"0 20px" }}>
      <div style={{ ...S.card, padding:28 }}>
        <h2 style={{ margin:"0 0 5px", fontSize:22, fontWeight:800, color:"#e0e8ff" }}>Welcome back</h2>
        <p style={{ margin:"0 0 20px", color:"#6b7a9a", fontSize:13 }}>Sign in to access your saved datasets</p>
        {error && <div style={{ padding:"9px 12px", background:"rgba(255,90,90,0.1)", border:"1px solid rgba(255,90,90,0.3)", borderRadius:8, color:"#ff8a8a", fontSize:12, marginBottom:14 }}>{error}</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={S.input} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={S.input} onKeyDown={e => e.key==="Enter" && login()} />
        </div>
        <button onClick={login} disabled={loading} style={{ ...S.btn("primary"), width:"100%", marginBottom:14 }}>
          {loading?"Signing in...":"Sign In"}
        </button>
        <div style={{ textAlign:"center", marginBottom:14 }}>
          <span style={{ color:"#4a5a7a", fontSize:11 }}>or continue with</span>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <a href={`${API_BASE}/auth/google`} style={{ ...S.btn("ghost"), flex:1, textAlign:"center", textDecoration:"none", display:"block", padding:"9px", fontSize:12 }}>🔵 Google</a>
          <a href={`${API_BASE}/auth/github`} style={{ ...S.btn("ghost"), flex:1, textAlign:"center", textDecoration:"none", display:"block", padding:"9px", fontSize:12 }}>⚫ GitHub</a>
        </div>
        <p style={{ textAlign:"center", color:"#6b7a9a", fontSize:12, margin:0 }}>
          Don't have an account? <span onClick={() => setPage("register")} style={{ color:"#6fa3ef", cursor:"pointer", textDecoration:"underline" }}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTER PAGE
// ════════════════════════════════════════════════════════════════════════════
function RegisterPage({ setUser, setPage }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const register = async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/auth/register", { method:"POST", body:JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error||"Registration failed"); return; }
      setToken(data.token); setUser(data.user); setPage("search");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth:400, margin:"50px auto", padding:"0 20px" }}>
      <div style={{ ...S.card, padding:28 }}>
        <h2 style={{ margin:"0 0 5px", fontSize:22, fontWeight:800, color:"#e0e8ff" }}>Create account</h2>
        <p style={{ margin:"0 0 20px", color:"#6b7a9a", fontSize:13 }}>Save datasets, create collections, add notes</p>
        {error && <div style={{ padding:"9px 12px", background:"rgba(255,90,90,0.1)", border:"1px solid rgba(255,90,90,0.3)", borderRadius:8, color:"#ff8a8a", fontSize:12, marginBottom:14 }}>{error}</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={S.input} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={S.input} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 characters)" type="password" style={S.input} onKeyDown={e => e.key==="Enter" && register()} />
        </div>
        <button onClick={register} disabled={loading} style={{ ...S.btn("primary"), width:"100%", marginBottom:14 }}>
          {loading?"Creating account...":"Create Account"}
        </button>
        <div style={{ textAlign:"center", marginBottom:14 }}>
          <span style={{ color:"#4a5a7a", fontSize:11 }}>or continue with</span>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <a href={`${API_BASE}/auth/google`} style={{ ...S.btn("ghost"), flex:1, textAlign:"center", textDecoration:"none", display:"block", padding:"9px", fontSize:12 }}>🔵 Google</a>
          <a href={`${API_BASE}/auth/github`} style={{ ...S.btn("ghost"), flex:1, textAlign:"center", textDecoration:"none", display:"block", padding:"9px", fontSize:12 }}>⚫ GitHub</a>
        </div>
        <p style={{ textAlign:"center", color:"#6b7a9a", fontSize:12, margin:0 }}>
          Already have an account? <span onClick={() => setPage("login")} style={{ color:"#6fa3ef", cursor:"pointer", textDecoration:"underline" }}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SAVED / LIBRARY PAGE
// ════════════════════════════════════════════════════════════════════════════
function SavedPage({ user, setPage }) {
  const [collections, setCols]  = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [activeCol, setActiveCol] = useState(null);
  const [newColName, setNewColName] = useState("");
  const [editingNote, setEditNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user) { setPage("login"); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const [cols, ds] = await Promise.all([
      apiFetch("/api/collections").then(r => r.json()),
      apiFetch("/api/saved").then(r => r.json()),
    ]);
    setCols(Array.isArray(cols)?cols:[]);
    setDatasets(Array.isArray(ds)?ds:[]);
    setLoading(false);
  };

  const createCol = async () => {
    if (!newColName.trim()) return;
    const res = await apiFetch("/api/collections", { method:"POST", body:JSON.stringify({ name:newColName.trim() }) });
    const col = await res.json();
    setCols(p => [col,...p]); setNewColName("");
  };

  const deleteCol = async (id) => {
    await apiFetch(`/api/collections/${id}`, { method:"DELETE" });
    setCols(p => p.filter(c => c._id!==id));
    setDatasets(p => p.filter(d => d.collectionId!==id));
    if (activeCol===id) setActiveCol(null);
  };

  const deleteDs = async (id) => {
    await apiFetch(`/api/saved/${id}`, { method:"DELETE" });
    setDatasets(p => p.filter(d => d._id!==id));
  };

  const saveNote = async (id) => {
    await apiFetch(`/api/saved/${id}/notes`, { method:"PUT", body:JSON.stringify({ notes:noteText }) });
    setDatasets(p => p.map(d => d._id===id?{...d,notes:noteText}:d));
    setEditNote(null);
  };

  const filtered = activeCol ? datasets.filter(d => d.collectionId===activeCol) : datasets;
  const scoreColor = (s) => s>=8?"#00E5A0":s>=6?"#FFB800":s>=4?"#FF8C42":"#FF5A5A";

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth:900, width:"100%", margin:"0 auto", padding:"36px 20px 80px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28, flexWrap:"wrap" }}>
        <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:"#e0e8ff" }}>📚 My Library</h1>
        <span style={{ padding:"3px 10px", background:"rgba(59,130,246,0.15)", border:"1px solid #3b82f6", borderRadius:20, fontSize:11, color:"#6fa3ef" }}>{datasets.length} datasets saved</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16 }}>

        {/* Sidebar */}
        <div>
          <div style={{ ...S.card, padding:14, marginBottom:10 }}>
            <p style={{ margin:"0 0 8px", fontSize:10, color:"#6b7a9a", fontFamily:"'Space Mono',monospace", letterSpacing:1 }}>COLLECTIONS</p>
            <div onClick={() => setActiveCol(null)} style={{ padding:"7px 9px", borderRadius:7, cursor:"pointer", background:!activeCol?"rgba(59,130,246,0.15)":"transparent", border:!activeCol?"1px solid #3b82f640":"1px solid transparent", marginBottom:3, fontSize:12, color:!activeCol?"#6fa3ef":"#8899bb", transition:"all 0.15s" }}>
              📋 All ({datasets.length})
            </div>
            {collections.map(col => (
              <div key={col._id} onClick={() => setActiveCol(col._id)} style={{ padding:"7px 9px", borderRadius:7, cursor:"pointer", background:activeCol===col._id?"rgba(59,130,246,0.15)":"transparent", border:activeCol===col._id?"1px solid #3b82f640":"1px solid transparent", marginBottom:3, display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all 0.15s" }}>
                <span style={{ fontSize:12, color:activeCol===col._id?"#6fa3ef":"#8899bb" }}>📁 {col.name} ({datasets.filter(d=>d.collectionId===col._id).length})</span>
                <button onClick={e => { e.stopPropagation(); deleteCol(col._id); }} style={{ background:"none", border:"none", color:"#4a5a7a", cursor:"pointer", fontSize:11 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ ...S.card, padding:12 }}>
            <p style={{ margin:"0 0 7px", fontSize:10, color:"#6b7a9a", fontFamily:"'Space Mono',monospace" }}>NEW COLLECTION</p>
            <input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Collection name..." style={{ ...S.input, fontSize:11, padding:"7px 9px", marginBottom:7 }} onKeyDown={e => e.key==="Enter" && createCol()} />
            <button onClick={createCol} style={{ ...S.btn("primary"), width:"100%", padding:"7px", fontSize:11 }}>+ Create</button>
          </div>
        </div>

        {/* Datasets */}
        <div>
          {filtered.length===0 ? (
            <div style={{ ...S.card, padding:36, textAlign:"center" }}>
              <p style={{ color:"#4a5a7a", fontSize:13 }}>No datasets saved yet.</p>
              <button onClick={() => setPage("search")} style={{ ...S.btn("primary"), marginTop:10 }}>🔍 Search Datasets</button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map(ds => {
                const isExp = expanded===ds._id;
                const rColor = scoreColor(ds.reliabilityScore);
                const sortedPapers = [...(ds.papers||[])].sort((a,b)=>(b.year||0)-(a.year||0));
                return (
                  <div key={ds._id} className="hover-card" style={S.card}>
                    <div style={{ padding:"12px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, flexWrap:"wrap" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
                            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#e0e8ff" }}>{ds.name}</h3>
                            <span style={{ padding:"1px 6px", background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:4, fontSize:10, color:"#6fa3ef" }}>{ds.source}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:rColor }}>{ds.reliabilityScore}/10</span>
                          </div>
                          <p style={{ margin:"0 0 7px", color:"#8899bb", fontSize:12, lineHeight:1.5 }}>{ds.description?.slice(0,120)}...</p>
                          {ds.notes && <div style={{ padding:"5px 9px", background:"rgba(255,184,0,0.08)", border:"1px solid rgba(255,184,0,0.2)", borderRadius:5, fontSize:11, color:"#FFB800", marginBottom:5 }}>📝 {ds.notes}</div>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        <button onClick={() => setExpanded(isExp?null:ds._id)} style={{ ...S.btn("ghost"), padding:"4px 10px", fontSize:10 }}>{isExp?"▲ Hide":"▼ Details"}</button>
                        <button onClick={() => { setEditNote(ds._id); setNoteText(ds.notes||""); }} style={{ ...S.btn("ghost"), padding:"4px 10px", fontSize:10 }}>📝 {ds.notes?"Edit Note":"Add Note"}</button>
                        {/* FIXED: PDF download with auth token */}
                        <button onClick={() => downloadPdfWithAuth(ds._id)} style={{ ...S.btn("ghost"), padding:"4px 10px", fontSize:10 }}>📄 PDF</button>
                        <button onClick={() => deleteDs(ds._id)} style={{ ...S.btn("danger"), padding:"4px 10px", fontSize:10 }}>🗑 Remove</button>
                      </div>
                      {editingNote===ds._id && (
                        <div style={{ marginTop:10 }}>
                          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add your notes..." style={{ ...S.input, height:70, resize:"vertical" }} />
                          <div style={{ display:"flex", gap:7, marginTop:7 }}>
                            <button onClick={() => saveNote(ds._id)} style={{ ...S.btn("primary"), padding:"5px 12px", fontSize:11 }}>Save Note</button>
                            <button onClick={() => setEditNote(null)} style={{ ...S.btn("ghost"), padding:"5px 12px", fontSize:11 }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {isExp && (
                      <div style={{ borderTop:"1px solid #0d1b3e", padding:"12px 16px", background:"rgba(4,9,22,0.7)" }}>
                        <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:10 }}>
                          {[["SIZE",ds.size],["FORMAT",ds.format],["LICENSE",ds.license],["UPDATED",ds.lastUpdated]].map(([l,v]) => (
                            <div key={l} style={{ padding:"5px 8px", background:"#0a1228", border:"1px solid #0d1b3e", borderRadius:6 }}>
                              <div style={{ fontSize:9, color:"#4a5a7a", fontFamily:"'Space Mono',monospace" }}>{l}</div>
                              <div style={{ fontSize:11, color:"#aabcd8", fontWeight:600 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <p style={{ margin:"0 0 8px", fontSize:11, color:"#6fa3ef", fontFamily:"'Space Mono',monospace" }}>PAPERS (NEWEST FIRST)</p>
                        {sortedPapers.map((p,pi) => (
                          <div key={pi} style={{ padding:"7px 9px", background:"#080f2a", border:"1px solid #0d1b3e", borderRadius:7, marginBottom:5 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#c8d8f0" }}>{p.title} ({p.year})</div>
                            <div style={{ fontSize:10, color:"#6b7a9a" }}>{p.authors} · {p.venue}</div>
                          </div>
                        ))}
                        <a href={ds.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", marginTop:8, padding:"8px", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius:8, color:"#fff", textDecoration:"none", textAlign:"center", fontWeight:700, fontSize:12 }}>
                          View Dataset Source →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"60vh", flexDirection:"column", gap:14 }}>
      <div style={{ position:"relative", width:44, height:44 }}>
        <div style={{ position:"absolute", inset:0, border:"3px solid #1e3a8a", borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <div style={{ position:"absolute", inset:8, border:"2px solid #0d1b3e", borderBottomColor:"#6fa3ef", borderRadius:"50%", animation:"spin 1.2s linear infinite reverse" }} />
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
