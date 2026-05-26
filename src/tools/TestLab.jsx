import { useState, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const MODULES = [
  "Heures / Paie",
  "Factures QuickBooks",
  "Rappels TDAH",
  "Emails Microsoft Graph",
  "Clock In/Out GPS",
  "Mini Chat",
  "Vider Tête",
  "Rapports PDF/CSV",
  "Dext",
  "Calendrier Outlook",
  "Dashboard",
  "Anti-procrastination INCUP",
];

const PREBUILD_ITEMS = [
  { id: "pb1", label: "Metro test passé — aucune erreur dans la console Expo" },
  { id: "pb2", label: "Aucune erreur console dans le navigateur" },
  { id: "pb3", label: "Tous les nouveaux endpoints testés avec données SANDBOX" },
  { id: "pb4", label: "États UI vérifiés : chargement, erreur, vide, succès" },
  { id: "pb5", label: "Aucune donnée [ZEN_TEST] dans les tables de production" },
  { id: "pb6", label: "MASTER.md mis à jour avec les changements" },
];

const MODES = {
  sandbox: { label: "🧪 SANDBOX", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", desc: "Toutes les écritures vont à des enregistrements de test isolés uniquement." },
  readonly: { label: "👁️ LECTURE SEULE", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", desc: "Lis les vraies données pour validation visuelle — zéro écriture." },
  dryrun: { label: "🔒 DRY RUN", color: "#92400e", bg: "#fffbeb", border: "#fde68a", desc: "Simule chaque action, journalise ce qui se passerait — ne valide rien." },
};

const cs = {
  card: { background: "white", borderRadius: 14, border: "1px solid #e2defc", padding: "1.1rem 1.25rem", marginBottom: 10 },
  lbl: { fontSize: 11, fontWeight: 600, color: "#534AB7", display: "block", marginBottom: 7, letterSpacing: "0.05em" },
  ta: { width: "100%", fontSize: 14, border: "1px solid #ddd9f5", borderRadius: 9, padding: "9px 11px", background: "#faf9ff", color: "#1a1528", fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" },
  btn: (dis) => ({ background: dis ? "#b8b0e8" : "#534AB7", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit" }),
  btnSec: { background: "#ede9ff", color: "#534AB7", border: "1px solid #c5bff5", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  btnRed: { background: "#fff0f0", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 9, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  btnGreen: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 9, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  pre: { fontSize: 13, lineHeight: 1.7, color: "#1a1528", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", margin: 0 },
};

async function callAPI(system, content) {
  const res = await fetch("/api/claude", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Erreur API");
  return data.text;
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
function ConfirmModal({ modal, onClose }) {
  const [typed, setTyped] = useState("");
  if (!modal) return null;
  const needsType = modal.requireType;
  const canConfirm = !needsType || typed === "SUPPRIMER";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 18, padding: "2rem", maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", margin: "0 0 12px" }}>{modal.title}</h3>
        <p style={{ fontSize: 14, color: "#374151", margin: "0 0 16px", lineHeight: 1.6 }}>{modal.message}</p>
        {modal.preview && (
          <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.75rem", marginBottom: 14, maxHeight: 200, overflowY: "auto" }}>
            {modal.preview.map((item, i) => (
              <p key={i} style={{ fontSize: 12, color: "#7f1d1d", margin: "2px 0", fontFamily: "monospace" }}>{item}</p>
            ))}
          </div>
        )}
        {needsType && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Tape <strong>SUPPRIMER</strong> pour confirmer :</p>
            <input value={typed} onChange={e => setTyped(e.target.value)}
              style={{ ...cs.ta, background: "#fff0f0", border: "1px solid #fca5a5" }}
              placeholder="SUPPRIMER" />
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={cs.btnSec}>Annuler</button>
          <button onClick={() => { if (canConfirm) { modal.onConfirm(); onClose(); } }}
            disabled={!canConfirm}
            style={{ ...cs.btnRed, opacity: canConfirm ? 1 : 0.5, cursor: canConfirm ? "pointer" : "not-allowed", fontWeight: 700 }}>
            {modal.confirmLabel || "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SafetyBanner ─────────────────────────────────────────────────────────────
function SafetyBanner({ mode }) {
  const m = MODES[mode];
  const bannerBg = mode === "sandbox" ? "#16a34a" : mode === "readonly" ? "#0369a1" : "#92400e";
  const msg = mode === "sandbox"
    ? "🧪 MODE TEST ACTIF — Aucune vraie donnée ne sera modifiée. Préfixe [ZEN_TEST] obligatoire."
    : mode === "readonly"
    ? "👁️ LECTURE SEULE — Tes vraies données sont visibles mais protégées. Zéro écriture."
    : "🔒 DRY RUN — Simulation uniquement. Aucune action n'est validée en base.";
  return (
    <div style={{ background: bannerBg, color: "white", padding: "0.65rem 1.25rem", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", textAlign: "center", flexShrink: 0 }}>
      {msg}
    </div>
  );
}

// ─── ModeSelector ─────────────────────────────────────────────────────────────
function ModeSelector({ mode, onModeChange }) {
  return (
    <div style={{ ...cs.card, background: "#0d0d14", border: "1px solid #2a2a40" }}>
      <label style={{ ...cs.lbl, color: "#c4b5fd" }}>ENVIRONNEMENT DE TEST</label>
      <div style={{ display: "flex", gap: 8 }}>
        {Object.entries(MODES).map(([key, m]) => (
          <button key={key} onClick={() => onModeChange(key)}
            style={{
              flex: 1, background: mode === key ? m.bg : "transparent",
              color: mode === key ? m.color : "#7b6fa0",
              border: `1px solid ${mode === key ? m.border : "#2a2a40"}`,
              borderRadius: 9, padding: "8px 6px", fontSize: 12, fontWeight: mode === key ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit"
            }}>
            {m.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#7b6fa0", margin: "8px 0 0" }}>{MODES[mode].desc}</p>
    </div>
  );
}

// ─── ChecklistView ────────────────────────────────────────────────────────────
function ChecklistView({ checklist, session, onUpdateItem }) {
  if (!checklist) return null;
  const total = checklist.categories.reduce((s, c) => s + c.items.length, 0);
  const passed = session ? Object.values(session).filter(v => v.status === "pass").length : 0;
  const failed = session ? Object.values(session).filter(v => v.status === "fail").length : 0;
  const skipped = session ? Object.values(session).filter(v => v.status === "skip").length : 0;

  const RISK_COLORS = { high: "#dc2626", medium: "#d97706", low: "#16a34a" };
  const STATUS_STYLE = {
    pending: { bg: "transparent", color: "#9e96c0", border: "#e2defc", label: "En attente" },
    pass: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "✓ PASSÉ" },
    fail: { bg: "#fff0f0", color: "#dc2626", border: "#fca5a5", label: "✗ ÉCHOUÉ" },
    skip: { bg: "#f9fafb", color: "#6b7280", border: "#d1d5db", label: "→ IGNORÉ" },
  };

  return (
    <div>
      <div style={{ ...cs.card, background: "#0d0d14", border: "1px solid #2a2a40", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#c4b5fd" }}>📋 {total} tests · </span>
          <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>✓ {passed} passés</span>
          <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>✗ {failed} échoués</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>→ {skipped} ignorés</span>
        </div>
        {total > 0 && (
          <div style={{ marginTop: 10, height: 6, background: "#1a1a2e", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((passed + failed + skipped) / total) * 100}%`, background: failed > 0 ? "#dc2626" : "#16a34a", borderRadius: 99, transition: "width 0.3s" }} />
          </div>
        )}
      </div>

      {checklist.categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#534AB7", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {cat.name} ({cat.items.length})
          </h3>
          {cat.items.map(item => {
            const st = session?.[item.id] || { status: "pending", notes: "" };
            const sty = STATUS_STYLE[st.status];
            return (
              <div key={item.id} style={{ ...cs.card, border: `1px solid ${sty.border}`, background: sty.bg, padding: "0.9rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: RISK_COLORS[item.risk] || "#9e96c0", border: `1px solid ${RISK_COLORS[item.risk] || "#9e96c0"}`, borderRadius: 4, padding: "1px 5px", flexShrink: 0, marginTop: 1 }}>
                    {item.risk?.toUpperCase() || "?"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1528", margin: "0 0 4px" }}>{item.instruction}</p>
                    <p style={{ fontSize: 12, color: "#7b6fa0", margin: "0 0 8px" }}>→ Attendu : {item.expected}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: st.status === "fail" || st.status !== "pending" ? 8 : 0 }}>
                      {["pass", "fail", "skip"].map(s => (
                        <button key={s} onClick={() => onUpdateItem(item.id, s, st.notes)}
                          style={{
                            background: st.status === s ? (s === "pass" ? "#16a34a" : s === "fail" ? "#dc2626" : "#6b7280") : "white",
                            color: st.status === s ? "white" : (s === "pass" ? "#16a34a" : s === "fail" ? "#dc2626" : "#6b7280"),
                            border: `1px solid ${s === "pass" ? "#bbf7d0" : s === "fail" ? "#fca5a5" : "#d1d5db"}`,
                            borderRadius: 7, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
                          }}>
                          {s === "pass" ? "✓ PASSÉ" : s === "fail" ? "✗ ÉCHOUÉ" : "→ IGNORER"}
                        </button>
                      ))}
                    </div>
                    {(st.status === "fail" || st.status === "pass") && (
                      <textarea value={st.notes || ""} onChange={e => onUpdateItem(item.id, st.status, e.target.value)}
                        placeholder={st.status === "fail" ? "Décris ce qui s'est passé..." : "Notes optionnelles..."}
                        rows={2} style={{ ...cs.ta, fontSize: 12, marginTop: 4 }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── StepRunner ───────────────────────────────────────────────────────────────
function StepRunner({ checklist, session, onUpdateItem, onFinish }) {
  const allItems = checklist.categories.flatMap(c => c.items.map(i => ({ ...i, category: c.name })));
  const [step, setStep] = useState(() => {
    const firstPending = allItems.findIndex(i => !session[i.id] || session[i.id].status === "pending");
    return Math.max(0, firstPending);
  });
  const [notes, setNotes] = useState("");

  const item = allItems[step];
  const total = allItems.length;
  const done = Object.values(session).filter(v => v.status !== "pending").length;
  const pct = Math.round((done / total) * 100);

  if (!item) return (
    <div style={{ ...cs.card, textAlign: "center", padding: "2rem" }}>
      <p style={{ fontSize: 18, fontWeight: 800, color: "#16a34a", marginBottom: 12 }}>✅ Tous les tests ont été passés !</p>
      <button onClick={onFinish} style={cs.btn(false)}>Voir le rapport final</button>
    </div>
  );

  function go(status) {
    onUpdateItem(item.id, status, notes);
    setNotes("");
    if (step < total - 1) setStep(step + 1);
    else onFinish();
  }

  return (
    <div>
      <div style={{ ...cs.card, background: "#0d0d14", border: "1px solid #2a2a40" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#c4b5fd" }}>Étape {step + 1} / {total}</span>
          <span style={{ fontSize: 12, color: "#c4b5fd" }}>{pct}% complété</span>
        </div>
        <div style={{ height: 6, background: "#1a1a2e", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#534AB7", borderRadius: 99, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ ...cs.card, border: "1px solid #c5bff5" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: "#7b6fa0", background: "#f5f4ff", border: "1px solid #e2defc", borderRadius: 5, padding: "2px 8px" }}>{item.category}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: item.risk === "high" ? "#dc2626" : item.risk === "medium" ? "#d97706" : "#16a34a", border: "1px solid currentColor", borderRadius: 4, padding: "1px 6px" }}>{(item.risk || "low").toUpperCase()}</span>
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1528", margin: "0 0 10px" }}>{item.instruction}</h2>
        <div style={{ background: "#f5f4ff", border: "1px solid #e2defc", borderRadius: 9, padding: "0.75rem 1rem", marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: "#534AB7", fontWeight: 600, margin: "0 0 4px" }}>RÉSULTAT ATTENDU</p>
          <p style={{ fontSize: 13, color: "#1a1528", margin: 0 }}>{item.expected}</p>
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes / ce qui s'est passé (optionnel)..." rows={2} style={cs.ta} />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => go("pass")} style={{ ...cs.btnGreen, flex: 1, fontWeight: 700, fontSize: 15 }}>✓ PASSÉ</button>
          <button onClick={() => go("fail")} style={{ ...cs.btnRed, flex: 1, fontWeight: 700, fontSize: 15 }}>✗ ÉCHOUÉ</button>
          <button onClick={() => go("skip")} style={{ ...cs.btnSec, fontWeight: 600 }}>→ IGNORER</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{ ...cs.btnSec, opacity: step === 0 ? 0.5 : 1 }}>← Précédent</button>
        <button onClick={() => setStep(Math.min(total - 1, step + 1))} style={cs.btnSec}>Suivant →</button>
      </div>
    </div>
  );
}

// ─── TestReport ───────────────────────────────────────────────────────────────
function TestReport({ checklist, session, module, onReset }) {
  const allItems = checklist.categories.flatMap(c => c.items.map(i => ({ ...i, category: c.name })));
  const passed = allItems.filter(i => session[i.id]?.status === "pass").length;
  const failed = allItems.filter(i => session[i.id]?.status === "fail").length;
  const skipped = allItems.filter(i => session[i.id]?.status === "skip").length;
  const total = allItems.length;
  const ready = failed === 0 && passed > 0;

  return (
    <div>
      <div style={{ ...cs.card, background: ready ? "#f0fdf4" : "#fff0f0", border: `2px solid ${ready ? "#16a34a" : "#dc2626"}`, padding: "1.5rem" }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: ready ? "#16a34a" : "#dc2626", margin: "0 0 8px" }}>
          {ready ? "✅ PRÊT POUR LE TERRAIN" : "❌ BLOQUÉ — Corriger ces points d'abord"}
        </h2>
        <p style={{ fontSize: 14, color: "#374151", margin: "0 0 16px" }}>Module : <strong>{module}</strong> · {total} tests</p>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>✓ {passed} passés</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#dc2626" }}>✗ {failed} échoués</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#6b7280" }}>→ {skipped} ignorés</span>
        </div>
      </div>

      {failed > 0 && (
        <div style={cs.card}>
          <label style={{ ...cs.lbl, color: "#dc2626" }}>POINTS EN ÉCHEC — À CORRIGER</label>
          {allItems.filter(i => session[i.id]?.status === "fail").map(item => (
            <div key={item.id} style={{ borderLeft: "3px solid #dc2626", paddingLeft: 12, marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1528", margin: "0 0 2px" }}>{item.instruction}</p>
              {session[item.id]?.notes && <p style={{ fontSize: 12, color: "#7b6fa0", margin: 0 }}>Notes : {session[item.id].notes}</p>}
            </div>
          ))}
        </div>
      )}

      <button onClick={onReset} style={{ ...cs.btnSec, width: "100%", marginTop: 4 }}>Nouveau test</button>
    </div>
  );
}

// ─── PreBuildGate ─────────────────────────────────────────────────────────────
function PreBuildGate() {
  const [checks, setChecks] = useState(() => PREBUILD_ITEMS.map(i => ({ ...i, checked: false })));
  const allDone = checks.every(c => c.checked);
  const doneCount = checks.filter(c => c.checked).length;

  return (
    <div>
      {!allDone && (
        <div style={{ background: "#dc2626", color: "white", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 14, fontWeight: 700, fontSize: 14 }}>
          🚫 Ne construis pas encore. {checks.length - doneCount} point{checks.length - doneCount > 1 ? "s sont" : " est"} en échec.
        </div>
      )}
      {allDone && (
        <div style={{ background: "#16a34a", color: "white", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 14, fontWeight: 700, fontSize: 14 }}>
          ✅ Validation pré-build complète — tu peux builder !
        </div>
      )}
      <div style={cs.card}>
        <label style={cs.lbl}>VALIDATION PRÉ-BUILD — {doneCount}/{checks.length} complétés</label>
        <div style={{ height: 6, background: "#f5f4ff", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ height: "100%", width: `${(doneCount / checks.length) * 100}%`, background: allDone ? "#16a34a" : "#534AB7", borderRadius: 99, transition: "width 0.3s" }} />
        </div>
        {checks.map(item => (
          <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "10px 0", borderBottom: "1px solid #f5f4ff" }}>
            <input type="checkbox" checked={item.checked} onChange={e => setChecks(prev => prev.map(c => c.id === item.id ? { ...c, checked: e.target.checked } : c))}
              style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "#534AB7" }} />
            <span style={{ fontSize: 14, color: item.checked ? "#16a34a" : "#374151", textDecoration: item.checked ? "line-through" : "none", lineHeight: 1.5 }}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
      <button onClick={() => setChecks(PREBUILD_ITEMS.map(i => ({ ...i, checked: false })))} style={{ ...cs.btnSec, fontSize: 12 }}>
        Réinitialiser
      </button>
    </div>
  );
}

// ─── WhatBroke ────────────────────────────────────────────────────────────────
function WhatBroke() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function analyze() {
    if (!input.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const sys = `Tu es un expert QA pour ZenAlpha, une app de gestion de construction React Native. L'utilisateur est Guillaume, entrepreneur TDAH.
Il décrit un bug ou comportement inattendu en français. Tu dois répondre UNIQUEMENT en JSON valide:
{
  "cause": "explication en français simple, sans jargon technique (2-3 phrases max)",
  "steps": ["étape 1 pour reproduire le bug", "étape 2", ...],
  "checklist": [
    { "id": "c1", "instruction": "vérification à faire", "expected": "ce qu'on devrait voir" }
  ]
}
Maximum 5 étapes, 6 items checklist. Reste simple, concret, actionnable.`;
      const raw = await callAPI(sys, `Bug décrit par Guillaume: ${input}`);
      const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) { setError(e.message || "Erreur d'analyse"); }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ ...cs.card, background: "#fff8e1", border: "1px solid #ffe082" }}>
        <p style={{ fontSize: 13, color: "#f57f17", margin: 0 }}>🔍 Décris en français ce qui ne marche pas — je génère les étapes exactes pour reproduire et confirmer le bug.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>CE QUI NE MARCHE PAS</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder="Ex: Quand je clock in sur iPhone, ça me dit 'erreur réseau' mais ma connexion marche..." style={cs.ta} />
      </div>
      <button onClick={analyze} disabled={loading || !input.trim()} style={{ ...cs.btn(loading || !input.trim()), width: "100%", marginBottom: 10 }}>
        {loading ? "⏳ Analyse..." : "🔍 Analyser le bug"}
      </button>
      {error && <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #fca5a5" }}><p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>❌ {error}</p></div>}
      {result && (
        <div>
          <div style={{ ...cs.card, background: "#fffbeb", border: "1px solid #fde68a" }}>
            <label style={{ ...cs.lbl, color: "#92400e" }}>CAUSE PROBABLE</label>
            <p style={{ fontSize: 14, color: "#78350f", margin: 0 }}>{result.cause}</p>
          </div>
          {result.steps?.length > 0 && (
            <div style={cs.card}>
              <label style={cs.lbl}>ÉTAPES POUR REPRODUIRE</label>
              {result.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#534AB7", flexShrink: 0, minWidth: 20 }}>{i + 1}.</span>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{s}</p>
                </div>
              ))}
            </div>
          )}
          {result.checklist?.length > 0 && (
            <div style={cs.card}>
              <label style={cs.lbl}>CHECKLIST DE VÉRIFICATION AVANT DE DEMANDER À CLAUDE CODE</label>
              {result.checklist.map((item, i) => (
                <div key={item.id || i} style={{ borderBottom: "1px solid #f5f4ff", paddingBottom: 10, marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1528", margin: "0 0 2px" }}>☐ {item.instruction}</p>
                  <p style={{ fontSize: 12, color: "#7b6fa0", margin: 0 }}>→ {item.expected}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TestHistory ──────────────────────────────────────────────────────────────
function TestHistory({ history, loading }) {
  if (loading) return <p style={{ color: "#9e96c0", fontSize: 13, textAlign: "center" }}>⏳ Chargement...</p>;
  if (!history.length) return (
    <div style={{ ...cs.card, textAlign: "center", color: "#9e96c0", padding: "2rem" }}>
      <p>Aucune session de test enregistrée. Lance ton premier test !</p>
    </div>
  );
  return (
    <div>
      {history.map(h => {
        let data = null;
        try { data = JSON.parse(h.next_session_context || h.summary || "{}"); } catch {}
        const passed = data?.passed ?? "?";
        const failed = data?.failed ?? "?";
        const module = data?.module || h.objective?.replace("[ZEN_TEST] ", "") || "?";
        const verdict = data?.verdict;
        return (
          <div key={h.id} style={{ ...cs.card, border: `1px solid ${failed > 0 ? "#fca5a5" : "#bbf7d0"}`, background: failed > 0 ? "#fff0f0" : "#f0fdf4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1528", margin: "0 0 4px" }}>{module}</p>
                <p style={{ fontSize: 12, color: "#7b6fa0", margin: 0 }}>
                  {new Date(h.created_at).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: failed > 0 ? "#dc2626" : "#16a34a" }}>
                  {failed > 0 ? "❌ BLOQUÉ" : "✅ PRÊT"}
                </span>
                <p style={{ fontSize: 12, color: "#7b6fa0", margin: "2px 0 0" }}>✓{passed} ✗{failed}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main TestLab ─────────────────────────────────────────────────────────────
export default function TestLab() {
  const [testMode, setTestMode] = useState("sandbox");
  const [view, setView] = useState("generator");
  const [pendingMode, setPendingMode] = useState(null);
  const [modal, setModal] = useState(null);

  // Generator state
  const [selectedModule, setSelectedModule] = useState("");
  const [checklist, setChecklist] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Test session state
  const [sessionItems, setSessionItems] = useState({});
  const [runnerMode, setRunnerMode] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Purge state
  const [purgeRecords, setPurgeRecords] = useState(null);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  useEffect(() => {
    if (view === "history") loadHistory();
    if (view === "purge") { setPurgeRecords(null); setPurgeResult(null); }
  }, [view]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.filter(s => s.objective?.startsWith("[ZEN_TEST]")));
      }
    } catch {}
    setHistoryLoading(false);
  }

  function handleModeChange(newMode) {
    if (newMode === testMode) return;
    if (testMode === "sandbox" && newMode !== "sandbox") {
      setModal({
        title: "⚠️ Changement de mode",
        message: `Tu es sur le point de passer en mode "${MODES[newMode].label}". ${newMode !== "readonly" ? "Ceci écrira sur tes vraies données. Es-tu certain ?" : "Tu pourras voir les vraies données mais pas les modifier."}`,
        confirmLabel: "Oui, changer de mode",
        onConfirm: () => setTestMode(newMode),
      });
    } else {
      setTestMode(newMode);
    }
  }

  async function generateChecklist() {
    if (!selectedModule) return;
    setGenerating(true); setGenError(""); setChecklist(null); setSessionItems({}); setRunnerMode(false); setShowReport(false);
    try {
      const res = await fetch("/api/test-checklist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: selectedModule, mode: testMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setChecklist(data);
      const initial = {};
      (data.categories || []).forEach(c => c.items.forEach(i => { initial[i.id] = { status: "pending", notes: "" }; }));
      setSessionItems(initial);
    } catch (e) { setGenError(e.message || "Erreur de génération"); }
    setGenerating(false);
  }

  function updateItem(itemId, status, notes) {
    setSessionItems(prev => ({ ...prev, [itemId]: { status, notes: notes ?? prev[itemId]?.notes ?? "" } }));
  }

  async function loadPurgePreview() {
    setPurgeLoading(true); setPurgeResult(null);
    try {
      const res = await fetch("/api/test-records");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setPurgeRecords(data);
    } catch (e) { setPurgeRecords({ error: e.message }); }
    setPurgeLoading(false);
  }

  async function executePurge() {
    try {
      const res = await fetch("/api/test-records", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setPurgeResult(data);
      setPurgeRecords({ sessions: [], history: [], total: 0 });
    } catch (e) { setPurgeResult({ error: e.message }); }
  }

  async function finishSession() {
    setShowReport(true);
    setRunnerMode(false);
    const allItems = checklist.categories.flatMap(c => c.items.map(i => ({ ...i })));
    const passed = allItems.filter(i => sessionItems[i.id]?.status === "pass").length;
    const failed = allItems.filter(i => sessionItems[i.id]?.status === "fail").length;
    const skipped = allItems.filter(i => sessionItems[i.id]?.status === "skip").length;
    const verdict = failed === 0 && passed > 0 ? "READY" : "BLOCKED";
    const payload = { module: selectedModule, passed, failed, skipped, verdict, items: sessionItems, checklist };
    try {
      await fetch("/api/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: `[ZEN_TEST] ${selectedModule}`,
          emotional_state: "good",
          status: "completed",
        }),
      });
      const sessions = await (await fetch("/api/sessions")).json();
      const sess = sessions.find(s => s.objective === `[ZEN_TEST] ${selectedModule}`);
      if (sess) {
        await fetch("/api/sessions/" + sess.id, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed", summary: `${passed}/${allItems.length} passés`, next_session_context: JSON.stringify(payload) }),
        });
      }
    } catch {}
  }

  const VIEWS = [
    { id: "generator", label: "📋 Générer" },
    { id: "prebuild", label: "🚦 Pre-Build" },
    { id: "whatbroke", label: "🔍 Debug Rapide" },
    { id: "history", label: "🕐 Historique" },
    { id: "purge", label: "🗑️ Purger" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", fontFamily: "system-ui,sans-serif", paddingBottom: 40 }}>
      <ConfirmModal modal={modal} onClose={() => setModal(null)} />
      <SafetyBanner mode={testMode} />

      <div style={{ background: "white", borderBottom: "1px solid #e2defc", overflowX: "auto" }}>
        <div style={{ display: "flex", padding: "0 1rem", minWidth: "max-content" }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => { setView(v.id); setRunnerMode(false); setShowReport(false); }}
              style={{ background: "none", border: "none", borderBottom: view === v.id ? "2px solid #534AB7" : "2px solid transparent", color: view === v.id ? "#534AB7" : "#7b6fa0", padding: "11px 14px", fontSize: 13, fontWeight: view === v.id ? 600 : 400, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.25rem 1rem" }}>
        <ModeSelector mode={testMode} onModeChange={handleModeChange} />

        {/* ── GENERATOR VIEW ── */}
        {view === "generator" && !runnerMode && !showReport && (
          <div>
            <div style={cs.card}>
              <label style={cs.lbl}>MODULE À TESTER</label>
              <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}
                style={{ ...cs.ta, height: 40, padding: "6px 11px" }}>
                <option value="">Sélectionner un module...</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button onClick={generateChecklist} disabled={generating || !selectedModule}
              style={{ ...cs.btn(generating || !selectedModule), width: "100%", marginBottom: 10 }}>
              {generating ? "⏳ Génération en cours..." : "📋 Générer la checklist de tests"}
            </button>
            {genError && (
              <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #fca5a5" }}>
                <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 8px" }}>❌ {genError}</p>
                <button onClick={generateChecklist} style={cs.btnSec}>Réessayer</button>
              </div>
            )}
            {checklist && (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <button onClick={() => setRunnerMode(true)}
                    style={{ ...cs.btn(false), flex: 2 }}>
                    ▶ Démarrer la session de test (étape par étape)
                  </button>
                  <button onClick={() => setShowReport(true)} style={{ ...cs.btnSec }}>Voir rapport</button>
                </div>
                <ChecklistView checklist={checklist} session={sessionItems} onUpdateItem={updateItem} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP RUNNER ── */}
        {view === "generator" && runnerMode && checklist && !showReport && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setRunnerMode(false)} style={cs.btnSec}>← Retour à la liste</button>
              <button onClick={finishSession} style={{ ...cs.btnSec, marginLeft: "auto" }}>Terminer et voir le rapport</button>
            </div>
            <StepRunner checklist={checklist} session={sessionItems} onUpdateItem={updateItem} onFinish={finishSession} />
          </div>
        )}

        {/* ── TEST REPORT ── */}
        {view === "generator" && showReport && checklist && (
          <TestReport
            checklist={checklist}
            session={sessionItems}
            module={selectedModule}
            onReset={() => { setChecklist(null); setSessionItems({}); setShowReport(false); setSelectedModule(""); }}
          />
        )}

        {/* ── PRE-BUILD GATE ── */}
        {view === "prebuild" && <PreBuildGate />}

        {/* ── WHAT BROKE ── */}
        {view === "whatbroke" && <WhatBroke />}

        {/* ── HISTORY ── */}
        {view === "history" && <TestHistory history={history} loading={historyLoading} />}

        {/* ── PURGE ── */}
        {view === "purge" && (
          <div>
            <div style={{ ...cs.card, background: "#0d0d14", border: "1px solid #dc2626" }}>
              <label style={{ ...cs.lbl, color: "#fca5a5" }}>PURGER LES DONNÉES DE TEST</label>
              <p style={{ fontSize: 13, color: "#9e96c0", margin: "0 0 14px" }}>
                Supprime tous les enregistrements avec le préfixe [ZEN_TEST] dans zen_sessions et zen_tools_history. Les actions et étapes liées sont supprimées en cascade. Cette action est irréversible.
              </p>
              <button onClick={loadPurgePreview} disabled={purgeLoading}
                style={{ ...cs.btnRed, width: "100%", fontWeight: 700, padding: "11px 20px", fontSize: 14 }}>
                {purgeLoading ? "⏳ Chargement..." : "🔍 Voir les enregistrements à supprimer"}
              </button>
            </div>

            {purgeRecords && !purgeRecords.error && (
              <div style={cs.card}>
                <label style={cs.lbl}>ENREGISTREMENTS TROUVÉS — {purgeRecords.total} au total</label>
                {purgeRecords.total === 0 ? (
                  <p style={{ fontSize: 13, color: "#16a34a", margin: 0 }}>✓ Aucun enregistrement de test à supprimer.</p>
                ) : (
                  <>
                    <p style={{ fontSize: 12, color: "#7b6fa0", marginBottom: 12 }}>
                      Sessions : <strong>{purgeRecords.sessions?.length || 0}</strong> · Historique : <strong>{purgeRecords.history?.length || 0}</strong>
                    </p>
                    <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.75rem", marginBottom: 14, maxHeight: 200, overflowY: "auto" }}>
                      {(purgeRecords.sessions || []).map(s => (
                        <p key={s.id} style={{ fontSize: 12, color: "#7f1d1d", margin: "2px 0", fontFamily: "monospace" }}>
                          [SESSION] {s.objective} ({new Date(s.created_at).toLocaleDateString("fr-CA")})
                        </p>
                      ))}
                      {(purgeRecords.history || []).map(h => (
                        <p key={h.id} style={{ fontSize: 12, color: "#7f1d1d", margin: "2px 0", fontFamily: "monospace" }}>
                          [HISTORIQUE] {(h.prompt || "").slice(0, 70)} ({new Date(h.created_at).toLocaleDateString("fr-CA")})
                        </p>
                      ))}
                    </div>
                    <button onClick={() => setModal({
                      title: "🗑️ Confirmer la purge",
                      message: `Tu es sur le point de supprimer ${purgeRecords.total} enregistrement(s) de test. Cette action est irréversible.`,
                      preview: [
                        ...(purgeRecords.sessions || []).map(s => `[SESSION] ${s.objective} (${new Date(s.created_at).toLocaleDateString("fr-CA")})`),
                        ...(purgeRecords.history || []).map(h => `[HISTORIQUE] ${(h.prompt || "").slice(0, 60)} (${new Date(h.created_at).toLocaleDateString("fr-CA")})`),
                      ],
                      requireType: true,
                      confirmLabel: "🗑️ Supprimer définitivement",
                      onConfirm: executePurge,
                    })}
                      style={{ ...cs.btnRed, width: "100%", fontWeight: 700, padding: "11px 20px", fontSize: 14 }}>
                      🗑️ Purger {purgeRecords.total} enregistrement(s)
                    </button>
                  </>
                )}
              </div>
            )}

            {purgeRecords?.error && (
              <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #fca5a5" }}>
                <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>❌ {purgeRecords.error}</p>
              </div>
            )}

            {purgeResult && !purgeResult.error && (
              <div style={{ ...cs.card, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#16a34a", margin: "0 0 6px" }}>✅ Purge terminée</p>
                <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
                  {purgeResult.deleted} enregistrement(s) supprimé(s) — Sessions : {purgeResult.sessions} · Historique : {purgeResult.history} · Restants : 0
                </p>
              </div>
            )}

            {purgeResult?.error && (
              <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #fca5a5" }}>
                <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>❌ Erreur lors de la purge : {purgeResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
