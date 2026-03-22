import { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("token");
const setToken = (t) => localStorage.setItem("token", t);
const removeToken = () => localStorage.removeItem("token");

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res;
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  input: { width: "100%", padding: "12px 14px", background: "rgba(10,20,50,0.85)", border: "1px solid #1e3a8a", borderRadius: 10, color: "#e0e8ff", fontSize: 14, fontFamily: "'Syne',sans-serif", outline: "none", boxSizing: "border-box" },
  btn: (variant = "primary") => ({
    padding: "11px 20px", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: "'Syne',sans-serif", cursor: "pointer",
    background: variant === "primary" ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : variant === "danger" ? "rgba(239,68,68,0.15)" : "rgba(30,58,138,0.3)",
    color: variant === "danger" ? "#ef4444" : "#fff",
    border: variant !== "primary" ? `1px solid ${variant === "danger" ? "#ef444466" : "#1e3a8a"}` : "none",
  }),
  card: { background: "rgba(8,15,40,0.92)", border: "1px solid #0d1b3e", borderRadius: 14, overflow: "hidden" },
};

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]           = useState("search"); // search | login | register | saved | callback
  const [user, setUser]           = useState(null);
  const [authLoading, setAuthL]   = useState(true);

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    const name   = params.get("name");
    const email  = params.get("email");
    if (token && window.location.pathname === "/auth/callback") {
      setToken(token);
      setUser({ name: decodeURIComponent(name), email: decodeURIComponent(email) });
      window.history.replaceState({}, "", "/");
      setPage("search");
    }
  }, []);

  // Load current user
  useEffect(() => {
    if (!getToken()) { setAuthL(false); return; }
    apiFetch("/auth/me").then(r => r.ok ? r.json() : null).then(u => {
      if (u) setUser(u);
      else removeToken();
      setAuthL(false);
    }).catch(() => { removeToken(); setAuthL(false); });
  }, []);

  const logout = () => { removeToken(); setUser(null); setPage("search"); };

  if (authLoading) return <Loading />;

  return (
    <div style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", overflowX: "hidden", background: "#050b1a", color: "#e0e8ff", fontFamily: "'Syne',sans-serif", boxSizing: "border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; padding: 0; overflow-x: hidden; } @media (max-width:600px) { .search-row { flex-direction: column !important; } .factor-grid { grid-template-columns: 1fr !important; } .card-inner { flex-direction: column !important; } }`}</style>

      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(30,58,138,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,0.07) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(5,11,26,0.95)", borderBottom: "1px solid #0d1b3e", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)" }}>
        <span onClick={() => setPage("search")} style={{ fontWeight: 800, fontSize: 18, color: "#6fa3ef", cursor: "pointer", letterSpacing: 1 }}>⬡ DatasetFinder</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {user ? (
            <>
              <button onClick={() => setPage("saved")} style={{ ...S.btn("ghost"), padding: "8px 14px", fontSize: 13 }}>💾 My Library</button>
              <button onClick={() => setPage("search")} style={{ ...S.btn("ghost"), padding: "8px 14px", fontSize: 13 }}>🔍 Search</button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(30,58,138,0.2)", borderRadius: 20, border: "1px solid #1e3a8a" }}>
                {user.avatar && <img src={user.avatar} style={{ width: 24, height: 24, borderRadius: "50%" }} alt="" />}
                <span style={{ fontSize: 13, color: "#aabcd8" }}>{user.name}</span>
                <button onClick={logout} style={{ background: "none", border: "none", color: "#6b7a9a", cursor: "pointer", fontSize: 12 }}>✕</button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setPage("login")} style={{ ...S.btn("ghost"), padding: "8px 14px", fontSize: 13 }}>Login</button>
              <button onClick={() => setPage("register")} style={{ ...S.btn("primary"), padding: "8px 14px", fontSize: 13 }}>Sign Up</button>
            </>
          )}
        </div>
      </nav>

      {/* Pages */}
      <div style={{ position: "relative" }}>
        {page === "search"   && <SearchPage user={user} setPage={setPage} />}
        {page === "login"    && <LoginPage setUser={setUser} setPage={setPage} />}
        {page === "register" && <RegisterPage setUser={setUser} setPage={setPage} />}
        {page === "saved"    && <SavedPage user={user} setPage={setPage} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEARCH PAGE
// ════════════════════════════════════════════════════════════════════════════
function SearchPage({ user, setPage }) {
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [expanded, setExpanded]       = useState(null);
  const [searched, setSearched]       = useState("");
  const [showFactor, setShowFactor]   = useState(false);
  const [rateInfo, setRateInfo]       = useState(null);
  const [saveMsg, setSaveMsg]         = useState({});
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    apiFetch("/api/rate-limit").then(r => r.json()).then(setRateInfo).catch(() => {});
    if (user) apiFetch("/api/collections").then(r => r.json()).then(setCollections).catch(() => {});
  }, [user]);

  const search = async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(null); setResults(null); setSearched(query); setExpanded(null);
    try {
      const res  = await apiFetch("/api/search", { method: "POST", body: JSON.stringify({ query: query.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed."); return; }
      setResults(data.datasets);
      setRateInfo({ remaining: data.remaining, used: data.used, max: data.max });
    } catch { setError("Network error. Please check your connection."); }
    finally { setLoading(false); }
  };

  const saveDataset = async (ds, collectionId = null) => {
    if (!user) { setPage("login"); return; }
    setSaveMsg(p => ({ ...p, [ds.name]: "saving" }));
    try {
      const res = await apiFetch("/api/saved", { method: "POST", body: JSON.stringify({ dataset: ds, collectionId }) });
      const data = await res.json();
      if (!res.ok) { setSaveMsg(p => ({ ...p, [ds.name]: data.error || "Error" })); }
      else { setSaveMsg(p => ({ ...p, [ds.name]: "saved" })); }
    } catch { setSaveMsg(p => ({ ...p, [ds.name]: "Error" })); }
    setTimeout(() => setSaveMsg(p => ({ ...p, [ds.name]: null })), 3000);
  };

  const scoreColor = (s) => s >= 8 ? "#00E5A0" : s >= 6 ? "#FFB800" : s >= 4 ? "#FF8C42" : "#FF5A5A";
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const rankLabels = ["BEST MATCH", "2ND BEST", "3RD BEST"];
  const remaining  = rateInfo?.remaining ?? MAX_SEARCHES_PER_DAY;
  const pillColor  = remaining > 2 ? "#00E5A0" : remaining > 0 ? "#FFB800" : "#FF5A5A";

  const ScoreBar = ({ score, small }) => {
    const color = scoreColor(score);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: small ? 4 : 6, background: "#0d1b3e", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (score / 10 * 100) + "%", background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: small ? 11 : 13, fontWeight: 700, color, fontFamily: "monospace", minWidth: 28 }}>{score}</span>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", padding: "50px 20px 80px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ padding: "5px 14px", background: "rgba(30,58,138,0.3)", border: "1px solid #1e3a8a", borderRadius: 20, fontSize: 11, color: "#6fa3ef", fontFamily: "'Space Mono',monospace", letterSpacing: 2 }}>
            ◆ LIVE AI-POWERED DATASET DISCOVERY
          </div>
          {rateInfo && (
            <div style={{ padding: "5px 12px", background: "rgba(0,0,0,0.4)", border: `1px solid ${pillColor}66`, borderRadius: 20, fontSize: 11, color: pillColor, fontFamily: "'Space Mono',monospace" }}>
              {rateInfo.remaining}/{rateInfo.max} SEARCHES LEFT TODAY
            </div>
          )}
        </div>
        <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 800, lineHeight: 1.05, margin: "0 0 12px", background: "linear-gradient(135deg,#e0e8ff 0%,#6fa3ef 50%,#3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Find the Right Dataset.<br />Backed by Science.
        </h1>
        <p style={{ color: "#6b7a9a", fontSize: 14, maxWidth: 460, margin: "0 auto 14px", lineHeight: 1.7 }}>
          Search any topic — get the top 3 datasets scored across <strong style={{ color: "#6fa3ef" }}>7 reliability factors</strong>. {user ? "Save to your library!" : <span>5 free searches/day. <span onClick={() => setPage("register")} style={{ color: "#3b82f6", cursor: "pointer", textDecoration: "underline" }}>Sign up</span> to save datasets!</span>}
        </p>
        <button onClick={() => setShowFactor(!showFactor)} style={{ background: "none", border: "1px solid #1e3a8a", borderRadius: 20, padding: "5px 14px", color: "#6fa3ef", fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: "pointer", letterSpacing: 1 }}>
          {showFactor ? "▲ HIDE" : "▼ WHAT MAKES A DATASET RELIABLE?"}
        </button>
        {showFactor && (
          <div style={{ marginTop: 14, background: "rgba(8,15,40,0.97)", border: "1px solid #1e3a8a", borderRadius: 14, padding: "16px 18px", textAlign: "left", maxWidth: 660, margin: "14px auto 0" }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, color: "#6b7a9a", fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>RELIABILITY IS SCORED /10 ACROSS 7 FACTORS:</p>
            <div className="factor-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {Object.entries(FACTOR_META).map(([k, f]) => (
                <div key={k} style={{ padding: "8px 10px", background: "#050b1a", border: "1px solid #0d1b3e", borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#c8d8f0", marginBottom: 2 }}>{f.icon} {f.label}</div>
                  <div style={{ fontSize: 11, color: "#6b7a9a", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="search-row" style={{ maxWidth: 680, width: "100%", margin: "0 auto 46px", display: "flex", gap: 10 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="e.g. medical imaging, sentiment analysis, climate data..."
            disabled={rateInfo?.remaining === 0}
            style={{ ...S.input, paddingLeft: 42, opacity: rateInfo?.remaining === 0 ? 0.5 : 1 }}
            onFocus={e => (e.target.style.borderColor = "#3b82f6")}
            onBlur={e => (e.target.style.borderColor = "#1e3a8a")} />
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 17, opacity: 0.4 }}>⌕</span>
        </div>
        <button onClick={search} disabled={loading || !query.trim() || rateInfo?.remaining === 0}
          style={{ ...S.btn("primary"), whiteSpace: "nowrap", opacity: (loading || rateInfo?.remaining === 0) ? 0.5 : 1, cursor: (loading || rateInfo?.remaining === 0) ? "not-allowed" : "pointer" }}>
          {loading ? "Searching..." : "Search →"}
        </button>
      </div>

      {rateInfo?.remaining === 0 && (
        <div style={{ maxWidth: 680, margin: "-30px auto 30px", padding: "14px 18px", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.3)", borderRadius: 12, textAlign: "center", color: "#FFB800", fontSize: 13 }}>
          🔒 You've used all 5 free searches today. Come back tomorrow!
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ display: "inline-block", width: 42, height: 42, border: "3px solid #1e3a8a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 14, color: "#6b7a9a", fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 1 }}>🌐 LIVE SEARCHING FOR "{searched.toUpperCase()}"...</p>
          <p style={{ color: "#3a4a6a", fontFamily: "'Space Mono',monospace", fontSize: 10 }}>This may take 15–25 seconds</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && <div style={{ padding: 16, background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 12, color: "#ff8a8a", fontSize: 13 }}>{error}</div>}

      {results && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#6b7a9a", letterSpacing: 2 }}>TOP 3 DATASETS FOR</span>
            <span style={{ padding: "3px 12px", background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6", borderRadius: 20, fontSize: 12, color: "#6fa3ef", fontWeight: 700 }}>"{searched}"</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {results.map((ds, i) => {
              const isExpanded = expanded === i;
              const sc = ds.reliabilityScore;
              const rColor = scoreColor(sc);
              const msg = saveMsg[ds.name];

              return (
                <div key={i} style={{ ...S.card, border: `1px solid ${i === 0 ? "#1e3a8a" : "#0d1b3e"}` }}>
                  <div style={{ padding: "6px 20px", background: i === 0 ? "linear-gradient(90deg,rgba(30,58,138,0.5),transparent)" : "rgba(8,14,34,0.5)", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #0d1b3e" }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: rankColors[i], fontFamily: "monospace" }}>#{ds.rank}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: rankColors[i], fontFamily: "'Space Mono',monospace", letterSpacing: 2 }}>{rankLabels[i]}</span>
                    {i === 0 && <span style={{ marginLeft: "auto", fontSize: 10, color: "#3b82f6", fontFamily: "'Space Mono',monospace" }}>★ RECOMMENDED</span>}
                  </div>

                  <div style={{ padding: "16px 20px" }}>
                    <div className="card-inner" style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#e0e8ff" }}>{ds.name}</h2>
                          <span style={{ padding: "2px 8px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, fontSize: 10, color: "#6fa3ef", fontFamily: "monospace" }}>{ds.source}</span>
                        </div>
                        <p style={{ margin: "0 0 10px", color: "#8899bb", fontSize: 13, lineHeight: 1.6 }}>{ds.description}</p>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {(ds.tags || []).map((tag, t) => (
                            <span key={t} style={{ padding: "2px 8px", background: "#0d1b3e", border: "1px solid #1e3a7a", borderRadius: 20, fontSize: 10, color: "#6fa3ef", fontFamily: "monospace" }}>{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ minWidth: 148 }}>
                        <div style={{ padding: "11px 13px", background: "#050b1a", border: `1px solid ${rColor}44`, borderRadius: 12, textAlign: "center", marginBottom: 7 }}>
                          <div style={{ fontSize: 10, color: "#6b7a9a", fontFamily: "'Space Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>RELIABILITY</div>
                          <div style={{ fontSize: 32, fontWeight: 900, color: rColor, fontFamily: "monospace", lineHeight: 1 }}>{sc}<span style={{ fontSize: 13, color: rColor + "88" }}>/10</span></div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: rColor, marginTop: 3 }}>{ds.reliabilityLabel}</div>
                        </div>
                        <ScoreBar score={sc} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
                      {[["SIZE", ds.size], ["FORMAT", ds.format], ["CITATIONS", (ds.citedInPapers || 0).toLocaleString()], ["LICENSE", ds.license], ["UPDATED", ds.lastUpdated]].map(([label, val], idx) => (
                        <div key={idx} style={{ padding: "6px 10px", background: "#0a1228", border: "1px solid #0d1b3e", borderRadius: 8 }}>
                          <div style={{ fontSize: 9, color: "#4a5a7a", fontFamily: "'Space Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#aabcd8" }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <button onClick={() => setExpanded(isExpanded ? null : i)}
                        style={{ ...S.btn("ghost"), padding: "6px 13px", fontSize: 12 }}>
                        {isExpanded ? "▲ Hide Details" : "▼ Factor Breakdown & Papers"}
                      </button>
                      <button onClick={() => saveDataset(ds)}
                        style={{ ...S.btn(msg === "saved" ? "ghost" : "primary"), padding: "6px 13px", fontSize: 12 }}>
                        {msg === "saving" ? "Saving..." : msg === "saved" ? "✓ Saved!" : msg ? msg : "💾 Save"}
                      </button>
                      {user && collections.length > 0 && (
                        <select onChange={e => { if (e.target.value) saveDataset(ds, e.target.value); e.target.value = ""; }}
                          style={{ padding: "6px 10px", background: "#0a1228", border: "1px solid #1e3a8a", borderRadius: 8, color: "#6fa3ef", fontSize: 12, cursor: "pointer" }}>
                          <option value="">+ Add to Collection</option>
                          {collections.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #0d1b3e", padding: "18px 20px", background: "rgba(4,9,22,0.7)" }}>
                      <h3 style={{ margin: "0 0 11px", fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#6fa3ef", letterSpacing: 2 }}>📊 RELIABILITY FACTOR BREAKDOWN (/10)</h3>
                      <div className="factor-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 18 }}>
                        {Object.entries(FACTOR_META).map(([key, meta]) => {
                          const val = (ds.reliabilityFactors || {})[key] || 0;
                          return (
                            <div key={key} style={{ padding: "9px 11px", background: "#080f2a", border: "1px solid #0d1b3e", borderRadius: 9 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#c8d8f0" }}>{meta.icon} {meta.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(val), fontFamily: "monospace" }}>{val}/10</span>
                              </div>
                              <ScoreBar score={val} small />
                              <div style={{ fontSize: 10, color: "#4a5a7a", marginTop: 4, lineHeight: 1.4 }}>{meta.desc}</div>
                            </div>
                          );
                        })}
                      </div>

                      <h3 style={{ margin: "0 0 9px", fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#6fa3ef", letterSpacing: 2 }}>🛡 KEY RELIABILITY NOTES</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                        {(ds.reliabilityReasons || []).map((r, ri) => (
                          <div key={ri} style={{ display: "flex", gap: 8, padding: "9px 11px", background: "#080f2a", border: "1px solid #0d1b3e", borderRadius: 8 }}>
                            <span style={{ color: "#00E5A0", flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 13, color: "#8899bb", lineHeight: 1.5 }}>{r}</span>
                          </div>
                        ))}
                      </div>

                      <h3 style={{ margin: "0 0 9px", fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#6fa3ef", letterSpacing: 2 }}>📚 CITED IN RESEARCH PAPERS</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                        {(ds.papers || []).map((p, pi) => (
                          <div key={pi} style={{ padding: "9px 11px", background: "#080f2a", border: "1px solid #0d1b3e", borderRadius: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#c8d8f0", marginBottom: 3, lineHeight: 1.4 }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: "#6b7a9a", marginBottom: 5 }}>{p.authors} · {p.year}</div>
                            <div style={{ display: "flex", gap: 5 }}>
                              <span style={{ fontSize: 10, padding: "2px 6px", background: "rgba(59,130,246,0.1)", borderRadius: 4, color: "#6fa3ef" }}>{p.venue}</span>
                              <span style={{ fontSize: 10, padding: "2px 6px", background: "rgba(0,229,160,0.1)", borderRadius: 4, color: "#00E5A0" }}>⭐ {(p.citations || 0).toLocaleString()} citations</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <a href={ds.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "block", padding: "11px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: 10, color: "#fff", textDecoration: "none", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                        View Dataset Source →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !results && !error && (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {["image classification", "NLP / sentiment", "medical imaging", "time series", "climate data", "fraud detection"].map(s => (
              <button key={s} onClick={() => setQuery(s)} style={{ padding: "7px 14px", background: "rgba(10,20,50,0.8)", border: "1px solid #1e3a8a", borderRadius: 20, color: "#6fa3ef", fontSize: 12, cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>{s}</button>
            ))}
          </div>
          <p style={{ color: "#2a3a5a", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>← TRY A SAMPLE SEARCH OR TYPE YOUR OWN</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════════════════════
function LoginPage({ setUser, setPage }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true); setError("");
    try {
      const res  = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      setToken(data.token);
      setUser(data.user);
      setPage("search");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ ...S.card, padding: 32 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#e0e8ff" }}>Welcome back</h2>
        <p style={{ margin: "0 0 24px", color: "#6b7a9a", fontSize: 14 }}>Sign in to access your saved datasets</p>

        {error && <div style={{ padding: "10px 14px", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 8, color: "#ff8a8a", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={S.input} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={S.input} onKeyDown={e => e.key === "Enter" && login()} />
        </div>

        <button onClick={login} disabled={loading} style={{ ...S.btn("primary"), width: "100%", marginBottom: 16 }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ color: "#4a5a7a", fontSize: 12 }}>or continue with</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <a href={`${API_BASE}/auth/google`} style={{ ...S.btn("ghost"), flex: 1, textAlign: "center", textDecoration: "none", display: "block", padding: "10px" }}>
            🔵 Google
          </a>
          <a href={`${API_BASE}/auth/github`} style={{ ...S.btn("ghost"), flex: 1, textAlign: "center", textDecoration: "none", display: "block", padding: "10px" }}>
            ⚫ GitHub
          </a>
        </div>

        <p style={{ textAlign: "center", color: "#6b7a9a", fontSize: 13, margin: 0 }}>
          Don't have an account? <span onClick={() => setPage("register")} style={{ color: "#6fa3ef", cursor: "pointer", textDecoration: "underline" }}>Sign up</span>
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
      const res  = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      setToken(data.token);
      setUser(data.user);
      setPage("search");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ ...S.card, padding: 32 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#e0e8ff" }}>Create account</h2>
        <p style={{ margin: "0 0 24px", color: "#6b7a9a", fontSize: 14 }}>Save datasets, create collections, add notes</p>

        {error && <div style={{ padding: "10px 14px", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 8, color: "#ff8a8a", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={S.input} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={S.input} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 characters)" type="password" style={S.input} onKeyDown={e => e.key === "Enter" && register()} />
        </div>

        <button onClick={register} disabled={loading} style={{ ...S.btn("primary"), width: "100%", marginBottom: 16 }}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ color: "#4a5a7a", fontSize: 12 }}>or continue with</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <a href={`${API_BASE}/auth/google`} style={{ ...S.btn("ghost"), flex: 1, textAlign: "center", textDecoration: "none", display: "block", padding: "10px" }}>🔵 Google</a>
          <a href={`${API_BASE}/auth/github`} style={{ ...S.btn("ghost"), flex: 1, textAlign: "center", textDecoration: "none", display: "block", padding: "10px" }}>⚫ GitHub</a>
        </div>

        <p style={{ textAlign: "center", color: "#6b7a9a", fontSize: 13, margin: 0 }}>
          Already have an account? <span onClick={() => setPage("login")} style={{ color: "#6fa3ef", cursor: "pointer", textDecoration: "underline" }}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SAVED / LIBRARY PAGE
// ════════════════════════════════════════════════════════════════════════════
function SavedPage({ user, setPage }) {
  const [collections, setCollections]   = useState([]);
  const [datasets, setDatasets]         = useState([]);
  const [activeCol, setActiveCol]       = useState(null);
  const [newColName, setNewColName]     = useState("");
  const [editingNote, setEditingNote]   = useState(null);
  const [noteText, setNoteText]         = useState("");
  const [loading, setLoading]           = useState(true);
  const [expanded, setExpanded]         = useState(null);

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
    setCollections(Array.isArray(cols) ? cols : []);
    setDatasets(Array.isArray(ds) ? ds : []);
    setLoading(false);
  };

  const createCollection = async () => {
    if (!newColName.trim()) return;
    const res  = await apiFetch("/api/collections", { method: "POST", body: JSON.stringify({ name: newColName.trim() }) });
    const col  = await res.json();
    setCollections(p => [col, ...p]);
    setNewColName("");
  };

  const deleteCollection = async (id) => {
    await apiFetch(`/api/collections/${id}`, { method: "DELETE" });
    setCollections(p => p.filter(c => c._id !== id));
    setDatasets(p => p.filter(d => d.collectionId !== id));
    if (activeCol === id) setActiveCol(null);
  };

  const deleteDataset = async (id) => {
    await apiFetch(`/api/saved/${id}`, { method: "DELETE" });
    setDatasets(p => p.filter(d => d._id !== id));
  };

  const saveNote = async (id) => {
    await apiFetch(`/api/saved/${id}/notes`, { method: "PUT", body: JSON.stringify({ notes: noteText }) });
    setDatasets(p => p.map(d => d._id === id ? { ...d, notes: noteText } : d));
    setEditingNote(null);
  };

  const downloadPdf = (id) => {
    window.open(`${API_BASE}/api/saved/${id}/pdf?token=${getToken()}`, "_blank");
  };

  const filtered = activeCol ? datasets.filter(d => d.collectionId === activeCol) : datasets;
  const scoreColor = (s) => s >= 8 ? "#00E5A0" : s >= 6 ? "#FFB800" : s >= 4 ? "#FF8C42" : "#FF5A5A";

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#e0e8ff" }}>📚 My Library</h1>
        <span style={{ padding: "4px 12px", background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6", borderRadius: 20, fontSize: 12, color: "#6fa3ef" }}>{datasets.length} datasets saved</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>

        {/* Sidebar — Collections */}
        <div>
          <div style={{ ...S.card, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6b7a9a", fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>COLLECTIONS</p>
            <div
              onClick={() => setActiveCol(null)}
              style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: !activeCol ? "rgba(59,130,246,0.15)" : "transparent", border: !activeCol ? "1px solid #3b82f640" : "1px solid transparent", marginBottom: 4, fontSize: 13, color: !activeCol ? "#6fa3ef" : "#8899bb" }}>
              📋 All Datasets ({datasets.length})
            </div>
            {collections.map(col => (
              <div key={col._id}
                onClick={() => setActiveCol(col._id)}
                style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: activeCol === col._id ? "rgba(59,130,246,0.15)" : "transparent", border: activeCol === col._id ? "1px solid #3b82f640" : "1px solid transparent", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: activeCol === col._id ? "#6fa3ef" : "#8899bb" }}>📁 {col.name} ({datasets.filter(d => d.collectionId === col._id).length})</span>
                <button onClick={e => { e.stopPropagation(); deleteCollection(col._id); }} style={{ background: "none", border: "none", color: "#4a5a7a", cursor: "pointer", fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>

          {/* New Collection */}
          <div style={{ ...S.card, padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#6b7a9a", fontFamily: "'Space Mono',monospace" }}>NEW COLLECTION</p>
            <input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Collection name..." style={{ ...S.input, fontSize: 12, padding: "8px 10px", marginBottom: 8 }} onKeyDown={e => e.key === "Enter" && createCollection()} />
            <button onClick={createCollection} style={{ ...S.btn("primary"), width: "100%", padding: "8px", fontSize: 12 }}>+ Create</button>
          </div>
        </div>

        {/* Main — Datasets */}
        <div>
          {filtered.length === 0 ? (
            <div style={{ ...S.card, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#4a5a7a", fontSize: 14 }}>No datasets saved yet.</p>
              <button onClick={() => setPage("search")} style={{ ...S.btn("primary"), marginTop: 12 }}>🔍 Search Datasets</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map((ds, i) => {
                const isExp = expanded === ds._id;
                const rColor = scoreColor(ds.reliabilityScore);
                return (
                  <div key={ds._id} style={S.card}>
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e8ff" }}>{ds.name}</h3>
                            <span style={{ padding: "2px 7px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 5, fontSize: 10, color: "#6fa3ef" }}>{ds.source}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: rColor }}>{ds.reliabilityScore}/10</span>
                          </div>
                          <p style={{ margin: "0 0 8px", color: "#8899bb", fontSize: 12, lineHeight: 1.5 }}>{ds.description?.slice(0, 120)}...</p>
                          {ds.notes && <div style={{ padding: "6px 10px", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)", borderRadius: 6, fontSize: 12, color: "#FFB800", marginBottom: 6 }}>📝 {ds.notes}</div>}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        <button onClick={() => setExpanded(isExp ? null : ds._id)} style={{ ...S.btn("ghost"), padding: "5px 11px", fontSize: 11 }}>
                          {isExp ? "▲ Hide" : "▼ Details"}
                        </button>
                        <button onClick={() => { setEditingNote(ds._id); setNoteText(ds.notes || ""); }} style={{ ...S.btn("ghost"), padding: "5px 11px", fontSize: 11 }}>
                          📝 {ds.notes ? "Edit Note" : "Add Note"}
                        </button>
                        <button onClick={() => downloadPdf(ds._id)} style={{ ...S.btn("ghost"), padding: "5px 11px", fontSize: 11 }}>
                          📄 Download PDF
                        </button>
                        <button onClick={() => deleteDataset(ds._id)} style={{ ...S.btn("danger"), padding: "5px 11px", fontSize: 11 }}>
                          🗑 Remove
                        </button>
                      </div>

                      {/* Note editor */}
                      {editingNote === ds._id && (
                        <div style={{ marginTop: 12 }}>
                          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add your notes about this dataset..."
                            style={{ ...S.input, height: 80, resize: "vertical", fontFamily: "'Syne',sans-serif" }} />
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button onClick={() => saveNote(ds._id)} style={{ ...S.btn("primary"), padding: "6px 14px", fontSize: 12 }}>Save Note</button>
                            <button onClick={() => setEditingNote(null)} style={{ ...S.btn("ghost"), padding: "6px 14px", fontSize: 12 }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {isExp && (
                      <div style={{ borderTop: "1px solid #0d1b3e", padding: "14px 18px", background: "rgba(4,9,22,0.7)" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                          {[["SIZE", ds.size], ["FORMAT", ds.format], ["LICENSE", ds.license], ["UPDATED", ds.lastUpdated]].map(([l, v]) => (
                            <div key={l} style={{ padding: "5px 9px", background: "#0a1228", border: "1px solid #0d1b3e", borderRadius: 7 }}>
                              <div style={{ fontSize: 9, color: "#4a5a7a", fontFamily: "'Space Mono',monospace" }}>{l}</div>
                              <div style={{ fontSize: 11, color: "#aabcd8", fontWeight: 600 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {(ds.papers || []).map((p, pi) => (
                          <div key={pi} style={{ padding: "8px 10px", background: "#080f2a", border: "1px solid #0d1b3e", borderRadius: 8, marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#c8d8f0" }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: "#6b7a9a" }}>{p.authors} · {p.year} · {p.venue}</div>
                          </div>
                        ))}
                        <a href={ds.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 10, padding: "9px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: 8, color: "#fff", textDecoration: "none", textAlign: "center", fontWeight: 700, fontSize: 13 }}>
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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #1e3a8a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
