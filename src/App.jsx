import { useState, useEffect } from "react";

// ── Point this at your deployed Railway backend URL ───────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

const FACTOR_META = {
  citationCount:     { label: "Citation Count",     icon: "📚", desc: "How many published papers have cited or used this dataset" },
  sourceCredibility: { label: "Source Credibility", icon: "🏛",  desc: "Trustworthiness of the institution or organisation that published it" },
  documentation:     { label: "Documentation",      icon: "📋", desc: "Quality of data cards, metadata, column descriptions and labels" },
  licenseClarity:    { label: "License Clarity",    icon: "⚖️", desc: "Whether it has a clear, open license allowing research use" },
  communityAdoption: { label: "Community Adoption", icon: "🌐", desc: "How widely used it is across the ML and research community" },
  maintenance:       { label: "Maintenance",        icon: "🔧", desc: "How actively the dataset is maintained and kept up to date" },
  biasAndDiversity:  { label: "Bias & Diversity",   icon: "⚖",  desc: "How representative, balanced and free from demographic bias the data is" },
};

const MAX_SEARCHES_PER_DAY = 5;

export default function DatasetFinder() {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [expandedDataset, setExpanded]  = useState(null);
  const [searched, setSearched]         = useState("");
  const [showFactorInfo, setShowFactor] = useState(false);
  const [rateInfo, setRateInfo]         = useState(null); // { remaining, used, max }

  // Fetch rate limit info on mount
  useEffect(() => {
    fetch(API_BASE + "/api/rate-limit")
      .then((r) => r.json())
      .then(setRateInfo)
      .catch(() => {});
  }, []);

  const searchDatasets = async () => {
    if (!query.trim() || loading) return;
    if (rateInfo && rateInfo.remaining === 0) {
      setError("You've used all 5 free searches today. Come back tomorrow!");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setSearched(query);
    setExpanded(null);

    try {
      const res = await fetch(API_BASE + "/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed. Please try again.");
        return;
      }

      setResults(data.datasets);
      setRateInfo({ remaining: data.remaining, used: data.used, max: data.max });
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey  = (e) => e.key === "Enter" && searchDatasets();
  const scoreColor = (s) => s >= 8 ? "#00E5A0" : s >= 6 ? "#FFB800" : s >= 4 ? "#FF8C42" : "#FF5A5A";
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const rankLabels = ["BEST MATCH", "2ND BEST", "3RD BEST"];

  const ScoreBar = ({ score, small }) => {
    const color = scoreColor(score);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: small ? 4 : 6, background: "#0d1b3e", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (score / 10 * 100) + "%", background: "linear-gradient(90deg," + color + "88," + color + ")", borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: small ? 11 : 13, fontWeight: 700, color, fontFamily: "monospace", minWidth: 28 }}>{score}</span>
      </div>
    );
  };

  // Search count pill colours
  const remaining  = rateInfo?.remaining ?? MAX_SEARCHES_PER_DAY;
  const pillColor  = remaining > 2 ? "#00E5A0" : remaining > 0 ? "#FFB800" : "#FF5A5A";

  return (
    <div style={{ minHeight: "100vh", maxWidth: "100vw", overflowX: "hidden", background: "#050b1a", color: "#e0e8ff", fontFamily: "'Syne', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(30,58,138,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,0.07) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", padding: "50px 20px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ padding: "5px 14px", background: "rgba(30,58,138,0.3)", border: "1px solid #1e3a8a", borderRadius: 20, fontSize: 11, color: "#6fa3ef", fontFamily: "'Space Mono',monospace", letterSpacing: 2 }}>
              ◆ LIVE AI-POWERED DATASET DISCOVERY
            </div>
            {/* Search counter */}
            {rateInfo && (
              <div style={{ padding: "5px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid " + pillColor + "66", borderRadius: 20, fontSize: 11, color: pillColor, fontFamily: "'Space Mono',monospace" }}>
                {rateInfo.remaining}/{rateInfo.max} SEARCHES LEFT TODAY
              </div>
            )}
          </div>

          <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 800, lineHeight: 1.05, margin: "0 0 12px", background: "linear-gradient(135deg,#e0e8ff 0%,#6fa3ef 50%,#3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Find the Right Dataset.<br />Backed by Science.
          </h1>
          <p style={{ color: "#6b7a9a", fontSize: 14, maxWidth: 460, margin: "0 auto 14px", lineHeight: 1.7 }}>
            Search any topic — get the top 3 datasets scored across <strong style={{ color: "#6fa3ef" }}>7 reliability factors</strong>, with real research papers. <span style={{ color: "#3a4a6a" }}>5 free searches/day.</span>
          </p>

          <button onClick={() => setShowFactor(!showFactorInfo)} style={{ background: "none", border: "1px solid #1e3a8a", borderRadius: 20, padding: "5px 14px", color: "#6fa3ef", fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: "pointer", letterSpacing: 1 }}>
            {showFactorInfo ? "▲ HIDE" : "▼ WHAT MAKES A DATASET RELIABLE?"}
          </button>

          {showFactorInfo && (
            <div style={{ marginTop: 14, background: "rgba(8,15,40,0.97)", border: "1px solid #1e3a8a", borderRadius: 14, padding: "16px 18px", textAlign: "left", maxWidth: 660, margin: "14px auto 0" }}>
              <p style={{ margin: "0 0 10px", fontSize: 10, color: "#6b7a9a", fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>RELIABILITY IS SCORED /10 ACROSS 7 FACTORS:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {Object.entries(FACTOR_META).map(([k, f]) => (
                  <div key={k} style={{ padding: "8px 10px", background: "#050b1a", border: "1px solid #0d1b3e", borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#c8d8f0", marginBottom: 2 }}>{f.icon} {f.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7a9a", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 10, color: "#3a4a6a", fontFamily: "'Space Mono',monospace" }}>FINAL SCORE = WEIGHTED AVERAGE OF ALL 7 FACTORS (/10)</p>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div style={{ maxWidth: 680, margin: "0 auto 46px", display: "flex", gap: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKey}
              placeholder="e.g. medical imaging, sentiment analysis, climate data..."
              disabled={rateInfo?.remaining === 0}
              style={{ width: "100%", padding: "14px 16px 14px 42px", background: rateInfo?.remaining === 0 ? "rgba(5,10,20,0.6)" : "rgba(10,20,50,0.85)", border: "1px solid #1e3a8a", borderRadius: 12, color: "#e0e8ff", fontSize: 14, fontFamily: "'Syne',sans-serif", outline: "none", boxSizing: "border-box", opacity: rateInfo?.remaining === 0 ? 0.5 : 1 }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#1e3a8a")} />
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 17, opacity: 0.4 }}>⌕</span>
          </div>
          <button onClick={searchDatasets} disabled={loading || !query.trim() || rateInfo?.remaining === 0}
            style={{ padding: "14px 22px", background: (loading || rateInfo?.remaining === 0) ? "#1e3a8a" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: (loading || rateInfo?.remaining === 0) ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: rateInfo?.remaining === 0 ? 0.5 : 1 }}>
            {loading ? "Searching..." : "Search →"}
          </button>
        </div>

        {/* Rate limit exhausted banner */}
        {rateInfo?.remaining === 0 && (
          <div style={{ maxWidth: 680, margin: "-30px auto 30px", padding: "14px 18px", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.3)", borderRadius: 12, textAlign: "center", color: "#FFB800", fontSize: 13 }}>
            🔒 You've used all 5 free searches today. Resets at midnight. Come back tomorrow!
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ display: "inline-block", width: 42, height: 42, border: "3px solid #1e3a8a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ marginTop: 14, color: "#6b7a9a", fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 1 }}>🌐 LIVE SEARCHING THE WEB FOR "{searched.toUpperCase()}"...</p>
            <p style={{ color: "#3a4a6a", fontFamily: "'Space Mono',monospace", fontSize: 10 }}>This may take 15–25 seconds while AI browses the internet</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: 16, background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 12, color: "#ff8a8a", fontSize: 13 }}>{error}</div>
        )}

        {/* Results */}
        {results && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#6b7a9a", letterSpacing: 2 }}>TOP 3 DATASETS FOR</span>
              <span style={{ padding: "3px 12px", background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6", borderRadius: 20, fontSize: 12, color: "#6fa3ef", fontWeight: 700 }}>"{searched}"</span>
              {rateInfo && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: pillColor, fontFamily: "'Space Mono',monospace" }}>{rateInfo.remaining} searches left today</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {results.map((ds, i) => {
                const isExpanded = expandedDataset === i;
                const sc = ds.reliabilityScore;
                const rColor = scoreColor(sc);

                return (
                  <div key={i} style={{ background: "rgba(8,15,40,0.92)", border: "1px solid " + (i === 0 ? "#1e3a8a" : "#0d1b3e"), borderRadius: 16, overflow: "hidden" }}>

                    <div style={{ padding: "6px 20px", background: i === 0 ? "linear-gradient(90deg,rgba(30,58,138,0.5),transparent)" : "rgba(8,14,34,0.5)", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #0d1b3e" }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: rankColors[i], fontFamily: "monospace" }}>#{ds.rank}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: rankColors[i], fontFamily: "'Space Mono',monospace", letterSpacing: 2 }}>{rankLabels[i]}</span>
                      {i === 0 && <span style={{ marginLeft: "auto", fontSize: 10, color: "#3b82f6", fontFamily: "'Space Mono',monospace" }}>★ RECOMMENDED</span>}
                    </div>

                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
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
                          <div style={{ padding: "11px 13px", background: "#050b1a", border: "1px solid " + rColor + "44", borderRadius: 12, textAlign: "center", marginBottom: 7 }}>
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

                      <button onClick={() => setExpanded(isExpanded ? null : i)}
                        style={{ marginTop: 11, padding: "6px 13px", background: "transparent", border: "1px solid #1e3a8a", borderRadius: 8, color: "#6fa3ef", fontSize: 12, fontFamily: "'Syne',sans-serif", cursor: "pointer" }}>
                        {isExpanded ? "▲ Hide Details" : "▼ Factor Breakdown, Papers & Analysis"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #0d1b3e", padding: "18px 20px", background: "rgba(4,9,22,0.7)" }}>

                        <h3 style={{ margin: "0 0 11px", fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#6fa3ef", letterSpacing: 2 }}>📊 RELIABILITY FACTOR BREAKDOWN (/10)</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 18 }}>
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
                          style={{ display: "block", padding: "11px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: 10, color: "#fff", textDecoration: "none", textAlign: "center", fontWeight: 700, fontSize: 14, fontFamily: "'Syne',sans-serif" }}>
                          View Dataset Source →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ textAlign: "center", marginTop: 28, color: "#2a3a5a", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>
              🌐 Live web search · Results from Kaggle, HuggingFace, PapersWithCode & more
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !results && !error && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {["image classification", "NLP / sentiment", "medical imaging", "time series", "climate data", "fraud detection"].map((s) => (
                <button key={s} onClick={() => setQuery(s)} style={{ padding: "7px 14px", background: "rgba(10,20,50,0.8)", border: "1px solid #1e3a8a", borderRadius: 20, color: "#6fa3ef", fontSize: 12, cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>{s}</button>
              ))}
            </div>
            <p style={{ color: "#2a3a5a", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>← TRY A SAMPLE SEARCH OR TYPE YOUR OWN</p>
          </div>
        )}
      </div>
    </div>
  );
}
