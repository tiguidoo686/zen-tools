import { useState, useEffect, useRef, useCallback } from "react";
import { TEST_SUITES, CATEGORY_ICONS } from "../data/testSuites.js";
import { runTest, runSuite, runAll as runAllSuites, getIsRunningAll } from "../services/testRunner.js";
import { eventBus } from "../services/eventBus.js";

// ─── Animations injected once ─────────────────────────────────────────────────
const STYLE_ID = "testlab-animations";
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.innerHTML = `
    @keyframes tl-running { 0%,100%{opacity:1} 50%{opacity:0.3} }
    @keyframes tl-redDot  { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes tl-yellow  { 0%{background:#fef08a} 100%{background:transparent} }
    @keyframes tl-greenFlash { 0%{background:#86efac} 100%{background:transparent} }
  `;
  document.head.appendChild(s);
}

// ─── Audio chime ──────────────────────────────────────────────────────────────
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(ts) {
  if (!ts) return "jamais";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5000) return "à l'instant";
  if (diff < 60000) return `il y a ${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
  return "hier";
}

function syntaxColor(key, val) {
  if (val === null) return "#ef4444";
  if (typeof val === "boolean") return val ? "#22c55e" : "#ef4444";
  if (typeof val === "number") return "#f59e0b";
  if (typeof val === "string") return "#86efac";
  return "#e2e8f0";
}

function JsonViewer({ data }) {
  if (!data) return null;
  try {
    const entries = typeof data === "object" ? Object.entries(data) : null;
    if (!entries) return <pre style={{ fontSize: 11, color: "#e2e8f0", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{String(data)}</pre>;
    return (
      <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6 }}>
        {"{"}
        {entries.map(([k, v]) => (
          <div key={k} style={{ paddingLeft: 12 }}>
            <span style={{ color: "#93c5fd" }}>"{k}"</span>
            <span style={{ color: "#e2e8f0" }}>: </span>
            <span style={{ color: syntaxColor(k, v) }}>{v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : JSON.stringify(v)}</span>
          </div>
        ))}
        {"}"}
      </div>
    );
  } catch {
    return <pre style={{ fontSize: 11, color: "#e2e8f0", margin: 0 }}>{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, small }) {
  const cfg = {
    PASS:    { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "PASSÉ",     anim: undefined },
    FAIL:    { bg: "#fff0f0", color: "#dc2626", border: "#fca5a5", label: "ÉCHOUÉ",    anim: undefined },
    RUNNING: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "EN COURS",  anim: "tl-running 1s ease-in-out infinite" },
    PENDING: { bg: "#f9fafb", color: "#6b7280", border: "#d1d5db", label: "EN ATTENTE", anim: undefined },
  }[status] || { bg: "#f9fafb", color: "#6b7280", border: "#d1d5db", label: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: small ? "1px 6px" : "2px 8px", fontSize: small ? 10 : 11, fontWeight: 700, animation: cfg.anim, display: "inline-block", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.status === "PASS" ? "#166534" : "#7f1d1d", color: "white", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", maxWidth: 300, lineHeight: 1.4 }}>
          {t.status === "PASS" ? "✅" : "❌"} {t.name}
        </div>
      ))}
    </div>
  );
}

// ─── Left column ──────────────────────────────────────────────────────────────
function LeftColumn({ suites, selectedCatId, onSelect, testResults }) {
  const total = suites.reduce((s, suite) => s + suite.tests.length, 0);
  const passed = suites.reduce((s, suite) => s + suite.tests.filter(t => testResults[t.id]?.status === "PASS").length, 0);
  return (
    <div style={{ background: "#1a1a2e", borderRight: "1px solid #2a2a40", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid #2a2a40" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", margin: "0 0 2px", letterSpacing: "0.06em" }}>CATÉGORIES</p>
        <p style={{ fontSize: 11, color: "#7b6fa0", margin: 0 }}>{passed}/{total} tests passés</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {suites.map(suite => {
          const suitePassed = suite.tests.filter(t => testResults[t.id]?.status === "PASS").length;
          const suiteFailed = suite.tests.filter(t => testResults[t.id]?.status === "FAIL").length;
          const selected = selectedCatId === suite.id;
          return (
            <button key={suite.id} onClick={() => onSelect(suite.id)}
              style={{ width: "100%", textAlign: "left", background: selected ? "#2a2a40" : "transparent", border: selected ? "1px solid #534AB7" : "1px solid transparent", borderRadius: 8, padding: "8px 10px", cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{suite.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: selected ? "white" : "#c4b5fd", fontWeight: selected ? 700 : 400, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{suite.name}</p>
                <p style={{ fontSize: 10, color: "#7b6fa0", margin: 0 }}>
                  {suitePassed > 0 && <span style={{ color: "#22c55e" }}>{suitePassed}✓ </span>}
                  {suiteFailed > 0 && <span style={{ color: "#ef4444" }}>{suiteFailed}✗ </span>}
                  {suite.tests.length} tests
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Center column ────────────────────────────────────────────────────────────
function CenterColumn({ suites, selectedCatId, selectedTestId, testResults, runningSet, runAllProgress, failBanner, onSelectTest, onRunTest, onRunSuite, onRunAll, onDismissBanner, isRunning }) {
  const suite = suites.find(s => s.id === selectedCatId);
  const tests = suite
    ? [...suite.tests].sort((a, b) => {
        const order = { FAIL: 0, RUNNING: 1, PENDING: 2, PASS: 3 };
        const aO = order[runningSet.has(a.id) ? "RUNNING" : (testResults[a.id]?.status || "PENDING")] ?? 4;
        const bO = order[runningSet.has(b.id) ? "RUNNING" : (testResults[b.id]?.status || "PENDING")] ?? 4;
        return aO - bO;
      })
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#f5f4ff", overflow: "hidden" }}>
      {/* Fail banner */}
      {failBanner && (
        <div style={{ background: "#dc2626", color: "white", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>⚠️ {failBanner.count} test{failBanner.count > 1 ? "s" : ""} échoué{failBanner.count > 1 ? "s" : ""} — {failBanner.category}</span>
          <button onClick={onDismissBanner} style={{ background: "none", border: "none", color: "white", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ background: "white", borderBottom: "1px solid #e2defc", padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <button onClick={onRunAll} disabled={isRunning}
          style={{ background: isRunning ? "#b8b0e8" : "#534AB7", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: isRunning ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {isRunning ? "⏳ En cours..." : "▶ Run All"}
        </button>
        {suite && (
          <button onClick={() => onRunSuite(suite)} disabled={isRunning}
            style={{ background: "#ede9ff", color: "#534AB7", border: "1px solid #c5bff5", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: isRunning ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isRunning ? 0.6 : 1 }}>
            ▶ {suite.name} uniquement
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9e96c0" }}>
          {suite ? `${tests.length} tests` : `${suites.reduce((s, x) => s + x.tests.length, 0)} tests total`}
        </span>
      </div>

      {/* Progress bar */}
      {runAllProgress && (
        <div style={{ background: "white", padding: "8px 14px", borderBottom: "1px solid #e2defc", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#534AB7", fontWeight: 600 }}>Exécution en cours...</span>
            <span style={{ fontSize: 12, color: "#534AB7" }}>{runAllProgress.current} / {runAllProgress.total} tests complétés</span>
          </div>
          <div style={{ height: 6, background: "#e2defc", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${runAllProgress.total > 0 ? (runAllProgress.current / runAllProgress.total) * 100 : 0}%`, background: "#534AB7", borderRadius: 99, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Test list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {!selectedCatId && (
          <div style={{ textAlign: "center", color: "#9e96c0", padding: "40px 20px" }}>
            <p style={{ fontSize: 14 }}>Sélectionne une catégorie à gauche<br />ou lance <strong>Run All</strong> pour exécuter tous les tests.</p>
          </div>
        )}
        {tests.map(test => {
          const isRunning = runningSet.has(test.id);
          const result = testResults[test.id];
          const status = isRunning ? "RUNNING" : (result?.status || "PENDING");
          return (
            <div key={test.id} onClick={() => onSelectTest(test.id)}
              style={{
                background: selectedTestId === test.id ? "#ede9ff" : "white",
                border: `1px solid ${selectedTestId === test.id ? "#534AB7" : "#e2defc"}`,
                borderRadius: 10, padding: "10px 12px", marginBottom: 6, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
              }}>
              <StatusBadge status={status} small />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1528", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{test.name}</p>
                {result?.timestamp && <p style={{ fontSize: 11, color: "#9e96c0", margin: 0 }}>{relativeTime(result.timestamp)}</p>}
              </div>
              <button onClick={e => { e.stopPropagation(); onRunTest(test); }} disabled={isRunning}
                style={{ background: "#ede9ff", color: "#534AB7", border: "1px solid #c5bff5", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: isRunning ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                ▶
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Right drawer ─────────────────────────────────────────────────────────────
function RightDrawer({ testCase, run, onRunTest, onGenerateTest, isRunning }) {
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [genInput, setGenInput] = useState("");
  const [generating, setGenerating] = useState(false);

  if (!testCase) {
    return (
      <div style={{ background: "#0d0d14", borderLeft: "1px solid #2a2a40", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#7b6fa0", textAlign: "center" }}>
        <p style={{ fontSize: 24, marginBottom: 8 }}>🧪</p>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>Sélectionne un test dans la liste centrale pour voir ses détails ici.</p>
        <div style={{ width: "100%", marginTop: 24, borderTop: "1px solid #2a2a40", paddingTop: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 10, letterSpacing: "0.05em" }}>GÉNÉRER UN TEST</p>
          <textarea value={genInput} onChange={e => setGenInput(e.target.value)} rows={3}
            placeholder="Décris la fonctionnalité à tester..."
            style={{ width: "100%", fontSize: 12, background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
          <button onClick={async () => { if (!genInput.trim()) return; setGenerating(true); await onGenerateTest(genInput.trim()); setGenInput(""); setGenerating(false); }}
            disabled={generating || !genInput.trim()}
            style={{ marginTop: 8, width: "100%", background: generating ? "#2a2a40" : "#534AB7", color: "white", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {generating ? "⏳ Génération..." : "✨ Auto-générer"}
          </button>
        </div>
      </div>
    );
  }

  function copyFullReport() {
    const report = JSON.stringify({ test: testCase.name, status: run?.status, failReason: run?.failReason, stepResults: run?.stepResults }, null, 2);
    navigator.clipboard.writeText(report).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function exportToMasterMd() {
    const section = run?.status === "PASS" ? 7 : 10;
    const sectionTitle = run?.status === "PASS" ? "Ce qui fonctionne" : "Bugs connus";
    const text = `\n### Section ${section} — ${sectionTitle}\n**Test**: ${testCase.name}\n**Statut**: ${run?.status || "PENDING"}\n**Date**: ${run?.timestamp ? new Date(run.timestamp).toLocaleString("fr-CA") : "—"}\n${run?.failReason ? `**Raison**: ${run.failReason}\n` : ""}`;
    fetch("/testlab/export-master", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text, section }) })
      .catch(() => {});
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  const stepResults = run?.stepResults || [];

  return (
    <div style={{ background: "#0d0d14", borderLeft: "1px solid #2a2a40", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a40", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "white", margin: 0, lineHeight: 1.4 }}>{testCase.name}</p>
          {run && <StatusBadge status={run.status} />}
        </div>
        {run?.durationMs && <p style={{ fontSize: 11, color: "#7b6fa0", margin: 0 }}>Durée: {run.durationMs}ms · {relativeTime(run.timestamp)}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => onRunTest(testCase)} disabled={isRunning}
            style={{ flex: 1, background: isRunning ? "#2a2a40" : "#534AB7", color: "white", border: "none", borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: isRunning ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {isRunning ? "⏳..." : "▶ Relancer"}
          </button>
          {run && <>
            <button onClick={copyFullReport}
              style={{ flex: 1, background: copied ? "#166534" : "#1a1a2e", color: copied ? "#86efac" : "#c4b5fd", border: "1px solid #2a2a40", borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {copied ? "✅ Copié !" : "📋 Copier rapport"}
            </button>
            <button onClick={exportToMasterMd}
              style={{ flex: 1, background: exported ? "#166534" : "#1a1a2e", color: exported ? "#86efac" : "#c4b5fd", border: "1px solid #2a2a40", borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {exported ? "✅ Exporté vers MASTER.md" : "📝 MASTER.md"}
            </button>
          </>}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {/* Fail reason */}
        {run?.failReason && (
          <div style={{ background: "#7f1d1d", border: "1px solid #dc2626", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5", margin: "0 0 4px" }}>RAISON DE L'ÉCHEC</p>
            <p style={{ fontSize: 13, color: "#fef2f2", margin: 0, lineHeight: 1.5 }}>{run.failReason}</p>
          </div>
        )}

        {/* Steps */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", margin: "0 0 8px", letterSpacing: "0.06em" }}>ÉTAPES</p>
        {testCase.steps?.map((step, i) => {
          const sr = stepResults.find(r => r.order === step.order) || stepResults[i];
          const pass = sr?.pass;
          const hasResult = sr !== undefined;
          return (
            <div key={step.order} style={{ background: hasResult ? (pass ? "#052e16" : "#450a0a") : "#1a1a2e", border: `1px solid ${hasResult ? (pass ? "#166534" : "#991b1b") : "#2a2a40"}`, borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{hasResult ? (pass ? "✅" : "❌") : "⏳"}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "#e2e8f0", margin: "0 0 2px", fontWeight: 500 }}>Étape {step.order}: {step.description}</p>
                  {sr?.failReason && <p style={{ fontSize: 11, color: "#fca5a5", margin: "2px 0 0" }}>{sr.failReason}</p>}
                  {sr?.durationMs && <p style={{ fontSize: 10, color: "#7b6fa0", margin: "2px 0 0" }}>{sr.durationMs}ms</p>}
                  {sr?.missingColumns?.length > 0 && (
                    <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>Colonnes manquantes: {sr.missingColumns.join(", ")}</p>
                  )}
                  {sr?.forbiddenFound?.length > 0 && (
                    <p style={{ fontSize: 11, color: "#f97316", margin: "2px 0 0" }}>Valeurs interdites: {sr.forbiddenFound.join(", ")}</p>
                  )}
                </div>
              </div>
              {sr?.rawPayload && (
                <div style={{ background: "#0d0d14", borderRadius: 6, padding: "6px 8px", marginTop: 8 }}>
                  <p style={{ fontSize: 10, color: "#7b6fa0", margin: "0 0 4px" }}>RAW SUPABASE / API</p>
                  <JsonViewer data={sr.rawPayload} />
                </div>
              )}
            </div>
          );
        })}

        {/* Expected result */}
        <div style={{ background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", margin: "0 0 6px", letterSpacing: "0.06em" }}>RÉSULTAT ATTENDU</p>
          <p style={{ fontSize: 12, color: "#e2e8f0", margin: 0, lineHeight: 1.6 }}>{testCase.expectedResult?.description}</p>
          {testCase.expectedResult?.supabaseTable && (
            <p style={{ fontSize: 11, color: "#7b6fa0", margin: "6px 0 0" }}>Table: <code style={{ color: "#a78bfa" }}>{testCase.expectedResult.supabaseTable}</code></p>
          )}
          {testCase.expectedResult?.requiredColumns?.length > 0 && (
            <p style={{ fontSize: 11, color: "#7b6fa0", margin: "4px 0 0" }}>Colonnes requises: <span style={{ color: "#22c55e" }}>{testCase.expectedResult.requiredColumns.join(", ")}</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────
function SummaryBar({ suites, testResults, lastRunTs, flash }) {
  const total = suites.reduce((s, x) => s + x.tests.length, 0);
  const passed = Object.values(testResults).filter(r => r.status === "PASS").length;
  const failed = Object.values(testResults).filter(r => r.status === "FAIL").length;
  return (
    <div style={{ background: flash ? undefined : "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 10, padding: "10px 16px", margin: "10px 10px 0", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", animation: flash ? "tl-greenFlash 1.5s ease-out" : undefined, flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: passed > 0 ? "#22c55e" : "#7b6fa0" }}>✓ {passed} passés</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: failed > 0 ? "#ef4444" : "#7b6fa0" }}>✗ {failed} échecs</span>
      <span style={{ fontSize: 13, color: "#7b6fa0" }}>⏳ {total - passed - failed} en attente</span>
      {lastRunTs && <span style={{ fontSize: 12, color: "#7b6fa0", marginLeft: "auto" }}>Dernière exécution {relativeTime(lastRunTs)}</span>}
    </div>
  );
}

// ─── Main TestLab ─────────────────────────────────────────────────────────────
export default function TestLab() {
  const [suites, setSuites] = useState(TEST_SUITES);
  const [selectedCatId, setSelectedCatId] = useState(TEST_SUITES[0]?.id || null);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [runningSet, setRunningSet] = useState(new Set());
  const [runAllProgress, setRunAllProgress] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [autoCaptureOn, setAutoCaptureOn] = useState(false);
  const [highlightedTestId, setHighlightedTestId] = useState(null);
  const [failBanner, setFailBanner] = useState(null);
  const [summaryFlash, setSummaryFlash] = useState(false);
  const lastRunTsRef = useRef(null);
  const [lastRunTs, setLastRunTs] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const allSuites = suites;

  // Auto-capture listener
  useEffect(() => {
    if (!autoCaptureOn) return;
    const unsub = eventBus.on("testCaptured", (testCase) => {
      const newTest = { ...testCase, id: `auto-${Date.now()}`, category: "auto" };
      setSuites(prev => {
        const has = prev.find(s => s.id === "auto-generated");
        if (has) return prev.map(s => s.id === "auto-generated" ? { ...s, tests: [newTest, ...s.tests] } : s);
        return [...prev, { id: "auto-generated", name: "Auto-générés", icon: "🤖", tests: [newTest] }];
      });
      setHighlightedTestId(newTest.id);
      setTimeout(() => setHighlightedTestId(null), 2000);
      playChime();
    });
    return unsub;
  }, [autoCaptureOn]);

  // Real-time event listener for individual test completions (updates summary bar live)
  useEffect(() => {
    const unsub = eventBus.on("testCompleted", ({ testCase, run }) => {
      setTestResults(prev => ({ ...prev, [testCase.id]: run }));
      addToast(testCase.name, run.status);
    });
    return unsub;
  }, []);

  function addToast(name, status) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, name, status }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function handleRunTest(testCase) {
    setIsRunning(true);
    setRunningSet(prev => new Set([...prev, testCase.id]));
    await runTest(testCase); // result handled via eventBus
    setRunningSet(prev => { const s = new Set(prev); s.delete(testCase.id); return s; });
    setIsRunning(false);
    lastRunTsRef.current = Date.now();
    setLastRunTs(lastRunTsRef.current);
  }

  async function handleRunSuite(suite) {
    if (getIsRunningAll()) return;
    const total = suite.tests.length;
    let current = 0;
    setIsRunning(true);
    setRunAllProgress({ current: 0, total });
    const newResults = {};

    for (const test of suite.tests) {
      setRunningSet(prev => new Set([...prev, test.id]));
      const run = await runTest(test);
      newResults[test.id] = run;
      setRunningSet(prev => { const s = new Set(prev); s.delete(test.id); return s; });
      current++;
      setRunAllProgress({ current, total });
    }

    setRunAllProgress(null);
    setIsRunning(false);
    lastRunTsRef.current = Date.now();
    setLastRunTs(lastRunTsRef.current);

    const failed = suite.tests.filter(t => newResults[t.id]?.status === "FAIL");
    if (failed.length > 0) setFailBanner({ count: failed.length, category: suite.name });
  }

  async function handleRunAll() {
    if (getIsRunningAll()) {
      alert("Une exécution complète est déjà en cours. Veuillez attendre qu'elle se termine.");
      return;
    }
    const total = allSuites.reduce((s, x) => s + x.tests.length, 0);
    let current = 0;
    setIsRunning(true);
    setRunAllProgress({ current: 0, total });
    const newResults = {};

    for (const suite of allSuites) {
      for (const test of suite.tests) {
        setRunningSet(prev => new Set([...prev, test.id]));
        const run = await runTest(test);
        newResults[test.id] = run;
        setRunningSet(prev => { const s = new Set(prev); s.delete(test.id); return s; });
        current++;
        setRunAllProgress({ current, total });
      }
    }

    setRunAllProgress(null);
    setIsRunning(false);
    lastRunTsRef.current = Date.now();
    setLastRunTs(lastRunTsRef.current);

    const totalFailed = Object.values(newResults).filter(r => r.status === "FAIL").length;
    if (totalFailed === 0) {
      setSummaryFlash(true);
      setTimeout(() => setSummaryFlash(false), 1500);
    } else {
      const failedCategories = [...new Set(
        allSuites.flatMap(s => s.tests).filter(t => newResults[t.id]?.status === "FAIL").map(t => t.category)
      )].join(", ");
      setFailBanner({ count: totalFailed, category: failedCategories });
    }
  }

  async function handleGenerateTest(description) {
    try {
      const res = await fetch("/testlab/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureDescription: description }),
      });
      if (!res.ok) return;
      const testCase = await res.json();
      eventBus.emit("testCaptured", testCase);
    } catch {}
  }

  const selectedSuite = allSuites.find(s => s.id === selectedCatId);
  const selectedTest = selectedSuite?.tests.find(t => t.id === selectedTestId)
    || allSuites.flatMap(s => s.tests).find(t => t.id === selectedTestId);
  const selectedRun = selectedTestId ? testResults[selectedTestId] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", background: "#0d0d14", fontFamily: "system-ui, sans-serif" }}>
      {/* Auto-capture bar */}
      <div style={{ background: "#1a1a2e", borderBottom: "1px solid #2a2a40", padding: "8px 14px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={() => setAutoCaptureOn(v => !v)}
          style={{ background: autoCaptureOn ? "#450a0a" : "#1a1a2e", color: autoCaptureOn ? "#fca5a5" : "#7b6fa0", border: `1px solid ${autoCaptureOn ? "#dc2626" : "#2a2a40"}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          {autoCaptureOn && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block", animation: "tl-redDot 1s ease-in-out infinite" }} />}
          🔴 Auto-capture {autoCaptureOn ? "ON" : "OFF"}
        </button>
        <span style={{ fontSize: 11, color: "#7b6fa0" }}>
          {autoCaptureOn ? "Mode actif — les nouveaux tests sont capturés automatiquement" : "Active pour capturer les tests des autres panneaux"}
        </span>
      </div>

      {/* Summary bar */}
      <SummaryBar suites={allSuites} testResults={testResults} lastRunTs={lastRunTs} flash={summaryFlash} />

      {/* 3-column grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 400px", overflow: "hidden", marginTop: 10 }}>
        <LeftColumn suites={allSuites} selectedCatId={selectedCatId} onSelect={id => { setSelectedCatId(id); setSelectedTestId(null); }} testResults={testResults} />
        <CenterColumn
          suites={allSuites}
          selectedCatId={selectedCatId}
          selectedTestId={selectedTestId}
          testResults={testResults}
          runningSet={runningSet}
          runAllProgress={runAllProgress}
          failBanner={failBanner}
          onSelectTest={setSelectedTestId}
          onRunTest={handleRunTest}
          onRunSuite={handleRunSuite}
          onRunAll={handleRunAll}
          onDismissBanner={() => setFailBanner(null)}
          isRunning={isRunning}
          highlightedTestId={highlightedTestId}
        />
        <RightDrawer
          testCase={selectedTest}
          run={selectedRun}
          onRunTest={handleRunTest}
          onGenerateTest={handleGenerateTest}
          isRunning={selectedTestId ? runningSet.has(selectedTestId) : false}
        />
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
