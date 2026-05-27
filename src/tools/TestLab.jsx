import { useState, useEffect } from "react";

const CATEGORIES = {
  completeness:       { label: "Complétude",            icon: "✅" },
  file_integrity:     { label: "Intégrité des fichiers", icon: "📄" },
  architecture:       { label: "Architecture",           icon: "🏗" },
  dependencies:       { label: "Dépendances",            icon: "📦" },
  logic:              { label: "Logique",                icon: "🧠" },
  missing_pieces:     { label: "Pièces manquantes",      icon: "🔍" },
  dangerous_patterns: { label: "Patterns dangereux",     icon: "⚠️" },
};

const cs = {
  card: { background: "white", borderRadius: 14, border: "1px solid #e2defc", padding: "1.1rem 1.25rem", marginBottom: 10 },
  lbl: { fontSize: 11, fontWeight: 600, color: "#534AB7", display: "block", marginBottom: 7, letterSpacing: "0.05em" },
  ta: { width: "100%", fontSize: 14, border: "1px solid #ddd9f5", borderRadius: 9, padding: "9px 11px", background: "#faf9ff", color: "#1a1528", fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" },
  btn: (dis) => ({ background: dis ? "#b8b0e8" : "#534AB7", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit" }),
  btnSec: { background: "#ede9ff", color: "#534AB7", border: "1px solid #c5bff5", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  btnRed: { background: "#fff0f0", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 9, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── CategorySection ──────────────────────────────────────────────────────────
function CategorySection({ catKey, tests }) {
  const [open, setOpen] = useState(true);
  const cat = CATEGORIES[catKey];
  if (!tests?.length) return null;
  const passed = tests.filter(t => t.status === "pass").length;
  return (
    <div style={{ ...cs.card, marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{cat?.icon || "•"}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#534AB7", flex: 1 }}>{cat?.label || catKey}</span>
        <span style={{ fontSize: 12, color: passed === tests.length ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{passed}/{tests.length}</span>
        <span style={{ fontSize: 12, color: "#9e96c0", marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {tests.map((t, i) => (
            <div key={i} style={{
              background: t.status === "pass" ? "#f0fdf4" : t.status === "fail" ? "#fff0f0" : "#fffbeb",
              border: `1px solid ${t.status === "pass" ? "#bbf7d0" : t.status === "fail" ? "#fca5a5" : "#fde68a"}`,
              borderRadius: 8, padding: "8px 12px"
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {t.status === "pass" ? "✅" : t.status === "fail" ? "❌" : "⚠️"}
                </span>
                <div>
                  <p style={{ fontSize: 13, color: "#1a1528", margin: "0 0 2px", fontWeight: 500 }}>{t.label}</p>
                  {t.detail && <p style={{ fontSize: 12, color: "#7b6fa0", margin: 0 }}>{t.detail}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GuidanceMode ─────────────────────────────────────────────────────────────
function GuidanceMode({ result, repairMessage, onClose }) {
  const [step, setStep] = useState(0);
  const problems = (result?.problems || []).slice(0, 5);
  const total = problems.length;
  if (!total) return null;
  const problem = problems[step];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 20, padding: "2rem", maxWidth: 500, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#534AB7", margin: 0 }}>Mode guidage — {step + 1}/{total}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9e96c0" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {problems.map((_, i) => (
            <div key={i} onClick={() => setStep(i)}
              style={{ height: 6, flex: 1, borderRadius: 99, background: i <= step ? "#534AB7" : "#e2defc", cursor: "pointer", transition: "background 0.2s" }} />
          ))}
        </div>
        <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 10, padding: "1rem", marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 6px" }}>{problem?.title || "Problème"}</p>
          <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>{problem?.description}</p>
        </div>
        {problem?.fix && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1rem", marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d", margin: "0 0 4px" }}>CORRECTION SUGGÉRÉE</p>
            <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>{problem.fix}</p>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            style={{ ...cs.btnSec, opacity: step === 0 ? 0.5 : 1 }}>← Précédent</button>
          {step < total - 1
            ? <button onClick={() => setStep(s => s + 1)} style={cs.btn(false)}>Suivant →</button>
            : <button onClick={onClose} style={{ ...cs.btn(false), background: "#16a34a" }}>Terminer ✓</button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── HistoryPanel ─────────────────────────────────────────────────────────────
function HistoryPanel({ onClose, onLoad }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/test-lab/history")
      .then(r => r.json())
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ background: "white", width: "min(420px, 100vw)", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid #e2defc", flexShrink: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#534AB7", margin: 0 }}>Historique des analyses</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9e96c0" }}>✕</button>
        </div>
        <div style={{ flex: 1, padding: "1rem" }}>
          {loading && <p style={{ color: "#9e96c0", textAlign: "center", marginTop: 40 }}>⏳ Chargement...</p>}
          {!loading && !entries.length && <p style={{ color: "#9e96c0", textAlign: "center", marginTop: 40 }}>Aucune analyse enregistrée.</p>}
          {entries.map(e => (
            <div key={e.id} style={{ ...cs.card, cursor: "pointer" }} onClick={() => { onLoad(e); onClose(); }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: e.verdict === "PASS" ? "#16a34a" : "#dc2626" }}>
                  {e.verdict === "PASS" ? "✅ PASSÉ" : "❌ PROBLÈMES"} — {e.score_passed}/{e.score_total}
                </span>
                <span style={{ fontSize: 11, color: "#9e96c0" }}>
                  {new Date(e.created_at).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#7b6fa0", margin: 0 }}>{e.prompt_summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main TestLab ─────────────────────────────────────────────────────────────
export default function TestLab() {
  const [promptInput, setPromptInput] = useState(() => load("testlab_last_input", {}).prompt || "");
  const [responseInput, setResponseInput] = useState(() => load("testlab_last_input", {}).response || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repairMessage, setRepairMessage] = useState("");
  const [showRepair, setShowRepair] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    save("testlab_last_input", { prompt: promptInput, response: responseInput });
  }, [promptInput, responseInput]);

  async function analyze() {
    if (!promptInput.trim() || !responseInput.trim()) return;
    setLoading(true); setError(""); setResult(null); setRepairMessage(""); setShowRepair(false);
    try {
      const res = await fetch("/api/test-lab/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptInput, response: responseInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setResult(data);
      if (data.repair_message) { setRepairMessage(data.repair_message); setShowRepair(data.verdict !== "PASS"); }
    } catch (e) { setError(e.message || "Erreur de connexion"); }
    setLoading(false);
  }

  async function regenerateRepair() {
    if (!result) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/test-lab/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptInput, response: responseInput, repairOnly: true }),
      });
      const data = await res.json();
      const msg = data.repair_message || result.repair_message || "";
      setRepairMessage(msg);
      setShowRepair(true);
    } catch { setRepairMessage(result?.repair_message || ""); setShowRepair(true); }
    setRegenerating(false);
  }

  function copyRepair() {
    const msg = repairMessage || result?.repair_message || "";
    if (!msg) return;
    navigator.clipboard.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function clear() {
    setPromptInput(""); setResponseInput(""); setResult(null); setError("");
    setRepairMessage(""); setShowRepair(false); setCopied(false);
    save("testlab_last_input", { prompt: "", response: "" });
  }

  function loadFromHistory(entry) {
    setResult({
      score: { passed: entry.score_passed, total: entry.score_total },
      verdict: entry.verdict,
      problems: entry.problems || [],
      repair_message: entry.repair_message || "",
      tests: {},
    });
    if (entry.repair_message) { setRepairMessage(entry.repair_message); setShowRepair(true); }
  }

  const score = result?.score;
  const verdictPass = result?.verdict === "PASS";
  const canAnalyze = promptInput.trim().length > 0 && responseInput.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", fontFamily: "system-ui,sans-serif", paddingBottom: 60 }}>
      {showGuidance && result && (
        <GuidanceMode result={result} repairMessage={repairMessage || result?.repair_message} onClose={() => setShowGuidance(false)} />
      )}
      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} onLoad={loadFromHistory} />
      )}

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.25rem 1rem" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#534AB7", margin: "0 0 2px" }}>🧪 Test Lab</h2>
            <p style={{ fontSize: 12, color: "#9e96c0", margin: 0 }}>Analyse la réponse de Claude Code en 7 catégories</p>
          </div>
          <button onClick={() => setShowHistory(true)} style={cs.btnSec}>🕐 Historique</button>
        </div>

        <div style={cs.card}>
          <label style={cs.lbl}>TON PROMPT (ce que tu as demandé à Claude Code)</label>
          <textarea
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            rows={4}
            placeholder="Colle ici ton prompt original envoyé à Claude Code..."
            style={cs.ta}
          />
        </div>

        <div style={cs.card}>
          <label style={cs.lbl}>RÉPONSE CLAUDE CODE</label>
          <textarea
            value={responseInput}
            onChange={e => setResponseInput(e.target.value)}
            rows={8}
            placeholder="Colle ici la réponse complète de Claude Code..."
            style={cs.ta}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={analyze} disabled={loading || !canAnalyze}
            style={{ ...cs.btn(loading || !canAnalyze), flex: 1, minWidth: 160, fontSize: 15 }}>
            {loading ? "⏳ Analyse en cours..." : "🔍 Analyser (7 catégories)"}
          </button>
          {(result || promptInput || responseInput) && (
            <button onClick={clear} style={cs.btnSec}>Vider</button>
          )}
        </div>

        {error && (
          <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #fca5a5" }}>
            <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>❌ {error}</p>
          </div>
        )}

        {result && (
          <div>
            <div style={{
              ...cs.card,
              background: verdictPass ? "#f0fdf4" : "#fff0f0",
              border: `2px solid ${verdictPass ? "#16a34a" : "#dc2626"}`,
              marginBottom: 14
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 900, color: verdictPass ? "#16a34a" : "#dc2626", margin: "0 0 4px" }}>
                    {verdictPass ? "✅ RÉPONSE COMPLÈTE" : "❌ PROBLÈMES DÉTECTÉS"}
                  </p>
                  {score && (
                    <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>
                      {score.passed} / {score.total} catégories OK
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {!verdictPass && (
                    <button onClick={() => setShowGuidance(true)} style={{ ...cs.btn(false), background: "#7c3aed", fontSize: 13 }}>
                      🎯 Mode guidage
                    </button>
                  )}
                  <button onClick={regenerateRepair} disabled={regenerating}
                    style={{ ...cs.btn(regenerating), fontSize: 13 }}>
                    {regenerating ? "⏳..." : "🔧 Réparer"}
                  </button>
                </div>
              </div>
              {score && (
                <div style={{ marginTop: 12, height: 8, background: verdictPass ? "#bbf7d0" : "#fca5a5", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(score.passed / score.total) * 100}%`, background: verdictPass ? "#16a34a" : "#dc2626", borderRadius: 99, transition: "width 0.4s" }} />
                </div>
              )}
            </div>

            {result.tests && Object.entries(result.tests).map(([catKey, tests]) => (
              <CategorySection key={catKey} catKey={catKey} tests={tests} />
            ))}

            {result.problems?.length > 0 && (
              <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #fca5a5", marginTop: 8 }}>
                <label style={{ ...cs.lbl, color: "#dc2626" }}>PROBLÈMES PRINCIPAUX — {result.problems.length}</label>
                {result.problems.map((p, i) => (
                  <div key={i} style={{ borderLeft: "3px solid #dc2626", paddingLeft: 10, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1528", margin: "0 0 2px" }}>{p.title}</p>
                    <p style={{ fontSize: 12, color: "#7b6fa0", margin: 0 }}>{p.description}</p>
                  </div>
                ))}
              </div>
            )}

            {showRepair && (repairMessage || result.repair_message) && (
              <div style={{ ...cs.card, background: "#f5f4ff", border: "2px solid #534AB7", marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ ...cs.lbl, color: "#534AB7", margin: 0 }}>🔧 MESSAGE DE RÉPARATION — copie-colle à Claude Code</label>
                  <button onClick={copyRepair}
                    style={{ ...cs.btnSec, fontSize: 12, padding: "4px 12px", background: copied ? "#f0fdf4" : undefined, color: copied ? "#16a34a" : undefined }}>
                    {copied ? "✓ Copié" : "Copier"}
                  </button>
                </div>
                <p style={{ fontSize: 14, color: "#1a1528", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {repairMessage || result.repair_message}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
