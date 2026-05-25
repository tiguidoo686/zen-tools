import { useState, useEffect } from "react";

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

async function callAPI(system, content) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} — ${data?.error || JSON.stringify(data)}`);
  return data.text;
}

function buildSYS(projectCtx) {
  return {
    transform: (master, lang, complexity) =>
      `You are an expert at writing prompts for developers. ${projectCtx}${master ? `\n\nProject context:\n${master}` : ""}
Complexity: ${complexity === "small" ? "Small (1-2 files)" : complexity === "medium" ? "Medium (multiple files)" : "Large (architecture change)"}.
Write a structured prompt in ${lang === "en" ? "English" : "French"}:
- Numbered tasks
- Include EVERYTHING needed (UI, logic, save, validation, feedback, errors, integration)
- Mention section/file if provided
- End with checklist
Reply ONLY with the prompt. No intro.`,

    explain: `Explain technical content in simple French to someone who knows nothing about code. Short points, zero jargon, max 2-3 lines per point. End with: "Est-ce que c'est bien ce que tu avais en tête ?"`,

    analyze: `Tu analyses si Claude Code a complété toutes les tâches demandées. Compare le prompt original avec la réponse reçue.

Réponds UNIQUEMENT dans ce format JSON:
{
  "tasks": [
    { "number": 1, "description": "description courte de la tâche", "done": true, "note": "ce qui a été fait ou ce qui manque en 1 ligne" }
  ],
  "summary": "résumé en 1 phrase"
}

Sois strict — une tâche est done:true SEULEMENT si la réponse confirme explicitement qu'elle a été faite.`,

    correction: (lang) => `Write a correction prompt for Claude Code in ${lang === "en" ? "English" : "French"}. Based on the analysis, list ONLY what needs to be fixed as numbered tasks. Be specific. Include validation steps. End with checklist. Reply ONLY with the prompt.`,

    improve: `Tu corriges des demandes qui n'ont pas bien fonctionné avec Claude Code. Réponds en français:
1. POURQUOI ÇA N'A PAS MARCHÉ (2-3 raisons simples)
2. VERSION AMÉLIORÉE (prompt corrigé, numéroté, prêt à utiliser)`,

    explainError: `Tu expliques des erreurs techniques en français simple.
1. CE QUE ÇA VEUT DIRE (2-3 lignes simples)
2. POURQUOI ÇA ARRIVE
3. QUOI DIRE À CLAUDE CODE (prompt exact à copier-coller)`,

    debugConvo: `You are an expert at analyzing problematic conversations between a user and Claude Code (the AI coding tool). ${projectCtx}

When the user pastes a conversation that went wrong, you must:
1. IDENTIFY WHAT WENT WRONG — why did Claude Code misunderstand or do the wrong thing
2. EXPLAIN WHY in simple French (2-3 lines max)
3. GIVE THE EXACT MESSAGE TO SEND TO CLAUDE CODE — a ready-to-copy prompt in English that will fix the situation without starting over

IMPORTANT: Your response is always about fixing the CODE using Claude Code. Always end with a ready-to-copy Claude Code prompt.`,

    sessionSummary: `Tu résumes des sessions de travail avec Claude Code. Génère en français:
📋 CE QUI A ÉTÉ ACCOMPLI
🔄 CE QUI EST EN COURS
⏭️ PROCHAINES ÉTAPES SUGGÉRÉES (2-3 actions concrètes)`,
  };
}

const LIBRARY = [
  { label: "Nouvel écran", icon: "📱", prompt: "Add a new screen called [NAME] to ZenAlpha. Include: navigation setup, basic layout with header, empty state, and connect it to the existing navigation structure." },
  { label: "Corriger un bug", icon: "🐛", prompt: "Fix this bug in ZenAlpha: [DESCRIBE THE BUG]. Find the root cause, fix it without breaking existing functionality, and add a check to prevent it from happening again." },
  { label: "Fonctionnalité IA", icon: "🤖", prompt: "Add this capability to the AI assistant in ZenAlpha: [DESCRIBE CAPABILITY]. Update the AI system prompt, add UI feedback, handle errors gracefully, and test with edge cases." },
  { label: "Composant UI", icon: "🎨", prompt: "Create a reusable UI component for ZenAlpha: [DESCRIBE COMPONENT]. Match the existing design system, make it typed with TypeScript, handle loading/error/empty states." },
  { label: "Sauvegarder données", icon: "💾", prompt: "Add data persistence for [DATA TYPE] in ZenAlpha. Use the existing storage solution, handle errors, add loading states, and ensure data survives app restart." },
  { label: "Optimiser perf", icon: "⚡", prompt: "Optimize the performance of [SCREEN/FEATURE] in ZenAlpha. Identify bottlenecks, reduce unnecessary re-renders, optimize lists if any." },
  { label: "Ajouter navigation", icon: "🗺️", prompt: "Add navigation to [SCREEN] in ZenAlpha. Include back button, proper stack setup, pass necessary params, and handle edge cases." },
  { label: "Intégration API", icon: "🔌", prompt: "Integrate this API call in ZenAlpha: [DESCRIBE WHAT IT DOES]. Add loading state, error handling, retry logic, and display the result properly in the UI." },
];

const TABS = [
  { id: "ancre", icon: "🎯", label: "Ancre" },
  { id: "transform", icon: "✦", label: "Transformer" },
  { id: "analyze", icon: "🔍", label: "Analyser réponse" },
  { id: "improve", icon: "🔧", label: "Améliorer demande" },
  { id: "debug", icon: "💬", label: "Déboguer convo" },
  { id: "error", icon: "⚠️", label: "Expliquer erreur" },
  { id: "imageanalyze", icon: "📸", label: "Analyser" },
  { id: "summary", icon: "📋", label: "Résumé session" },
  { id: "library", icon: "📚", label: "Bibliothèque" },
  { id: "notes", icon: "📝", label: "Notes" },
  { id: "history", icon: "🕐", label: "Historique" },
];

const cs = {
  card: { background: "white", borderRadius: 14, border: "1px solid #e2defc", padding: "1.1rem 1.25rem", marginBottom: 10 },
  lbl: { fontSize: 11, fontWeight: 600, color: "#534AB7", display: "block", marginBottom: 7, letterSpacing: "0.05em" },
  tip: { fontSize: 11, color: "#9e96c0", marginTop: 6 },
  ta: { width: "100%", fontSize: 14, border: "1px solid #ddd9f5", borderRadius: 9, padding: "9px 11px", background: "#faf9ff", color: "#1a1528", fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" },
  pre: { fontSize: 14, lineHeight: 1.75, color: "#1a1528", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", margin: 0 },
  btnMain: (d) => ({ background: d ? "#b8b0e8" : "#534AB7", color: "white", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: d ? "not-allowed" : "pointer", fontFamily: "inherit", width: "100%" }),
  btnSec: { background: "#ede9ff", color: "#534AB7", border: "1px solid #c5bff5", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  btnRed: { background: "transparent", color: "#f87171", border: "1px solid #fca5a5", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  divider: { height: 1, background: "#e2defc", margin: "1rem 0" },
};

function CopyBtn({ text, label = "Copier" }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      style={{ background: ok ? "#e8f5e9" : "#f0eeff", color: ok ? "#2e7d32" : "#534AB7", border: `1px solid ${ok ? "#a5d6a7" : "#c5bff5"}`, borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
      {ok ? "✓ Copié !" : label}
    </button>
  );
}

function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 12, padding: "1rem", marginTop: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#c62828", margin: "0 0 4px" }}>Erreur</p>
      <p style={{ fontSize: 12, color: "#c62828", fontFamily: "monospace", margin: 0 }}>{msg}</p>
    </div>
  );
}

function ContextField({ value, onChange }) {
  return (
    <div style={{ ...cs.card, background: "#fffbeb", border: "1px solid #fde68a" }}>
      <label style={{ ...cs.lbl, color: "#92400e" }}>TA SITUATION (optionnel mais recommandé)</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        placeholder="Explique ce qui se passe, ce qui te frustre, le contexte... Ex: Claude a fait X mais j'avais demandé Y, on travaille sur l'onglet Perso depuis 2 jours..."
        style={{ ...cs.ta, background: "#fffdf0" }} />
      <p style={cs.tip}>Plus tu expliques ta situation, plus la réponse sera précise et utile.</p>
    </div>
  );
}

function ResultBox({ label, content, borderColor = "#c5bff5", bg = "#f5f4ff", labelColor = "#534AB7" }) {
  if (!content) return null;
  return (
    <div style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: "1.1rem 1.25rem", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ ...cs.lbl, color: labelColor, margin: 0 }}>{label}</span>
        <CopyBtn text={content} />
      </div>
      <pre style={cs.pre}>{content}</pre>
    </div>
  );
}

function useAPI() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function run(system, content, onSuccess) {
    setLoading(true); setResult(""); setError("");
    try { const r = await callAPI(system, content); setResult(r); if (onSuccess) onSuccess(r); }
    catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  }
  return { result, setResult, loading, error, run };
}

function TabTransform({ lang, master, onAddHistory, SYS, steps, onLinkPrompt }) {
  const [input, setInput] = useState("");
  const [section, setSection] = useState("");
  const [context, setContext] = useState("");
  const [complexity, setComplexity] = useState("medium");
  const prompt = useAPI();
  const explain = useAPI();

  async function transform() {
    const contextPart = context.trim() ? `\n\nAdditional context from user: ${context.trim()}` : "";
    const content = section.trim() ? `Section/file: ${section.trim()}\n\nIdea: ${input.trim()}${contextPart}` : `${input.trim()}${contextPart}`;
    prompt.run(SYS.transform(master, lang, complexity), content, (r) => onAddHistory("✦ Transformer: " + input.slice(0, 80), r));
    explain.setResult("");
  }

  return (
    <div>
      <div style={cs.card}>
        <label style={cs.lbl}>TON IDÉE (écris comme tu me parles)</label>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) transform(); }}
          placeholder="Ex: Je veux ajouter un bouton pour créer une tâche dans l'onglet perso..." rows={4} style={cs.ta} />
        <p style={cs.tip}>💡 Cmd+Enter pour transformer rapidement</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>SECTION OU FICHIER CONCERNÉ (optionnel)</label>
        <textarea value={section} onChange={e => setSection(e.target.value)} rows={1}
          placeholder="Ex: Onglet Perso, écran Projets, composant TransactionCard..." style={{ ...cs.ta, resize: "none" }} />
      </div>
      <ContextField value={context} onChange={setContext} />
      <div style={cs.card}>
        <label style={cs.lbl}>TAILLE DE LA DEMANDE</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["small", "🟢 Petit"], ["medium", "🟡 Moyen"], ["large", "🔴 Gros"]].map(([v, lbl]) => (
            <button key={v} onClick={() => setComplexity(v)}
              style={{ background: complexity === v ? "#534AB7" : "transparent", color: complexity === v ? "white" : "#534AB7", border: "1px solid #c5bff5", borderRadius: 7, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", flex: 1 }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <button onClick={transform} disabled={prompt.loading || !input.trim()} style={cs.btnMain(prompt.loading || !input.trim())}>
        {prompt.loading ? "⏳ Transformation..." : "✦ Transformer en prompt"}
      </button>
      <ErrBox msg={prompt.error} />
      {prompt.result && (
        <div style={{ ...cs.card, border: "1px solid #c5bff5", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={cs.lbl}>✅ PROMPT PRÊT POUR CLAUDE CODE</span>
            <CopyBtn text={prompt.result} />
          </div>
          <pre style={cs.pre}>{prompt.result}</pre>
          <div style={cs.divider} />
          <button onClick={() => explain.run(SYS.explain, prompt.result)} disabled={explain.loading}
            style={{ ...cs.btnSec, opacity: explain.loading ? 0.6 : 1 }}>
            {explain.loading ? "⏳..." : "🧠 Explique en français simple"}
          </button>
        </div>
      )}
      {explain.result && (
        <div style={{ background: "#f0fff8", border: "1px solid #a5d6a7", borderRadius: 14, padding: "1.1rem 1.25rem", marginTop: 10 }}>
          <span style={{ ...cs.lbl, color: "#1b5e20", display: "block", marginBottom: 8 }}>🧠 CE QUE CLAUDE CODE VA FAIRE</span>
          <pre style={{ ...cs.pre, color: "#1b5e20" }}>{explain.result}</pre>
        </div>
      )}
      {prompt.result && steps && steps.length > 0 && (
        <div style={{ ...cs.card, background: "#f0f9ff", border: "1px solid #bae6fd", marginTop: 10 }}>
          <label style={{ ...cs.lbl, color: "#0369a1" }}>📎 LIER CE PROMPT À UNE ÉTAPE</label>
          <select onChange={e => { if (e.target.value && onLinkPrompt) { onLinkPrompt(e.target.value, prompt.result); e.target.value = ""; } }}
            style={{ ...cs.ta, height: 36, padding: "6px 11px" }}>
            <option value="">Sélectionner une étape…</option>
            {steps.filter(s => s.state !== "done" && !s.completed).map(s => {
              const lid = String(s._lid || s.id);
              return <option key={lid} value={lid}>{s.text.slice(0, 60)}</option>;
            })}
          </select>
          <p style={{ ...cs.tip, marginTop: 4 }}>Le prompt sera visible dans l'Ancre avec une icône 📎 sur l'étape.</p>
        </div>
      )}
    </div>
  );
}

function TabAnalyze({ lang, onAddHistory, SYS }) {
  const [origPrompt, setOrigPrompt] = useState(() => load("za_analyze_orig", ""));
  const [response, setResponse] = useState("");
  const [tasks, setTasks] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const correction = useAPI();
  const [actionQuestion, setActionQuestion] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => { save("za_analyze_orig", origPrompt); }, [origPrompt]);

  async function handleActionQuestion() {
    if (!actionQuestion.trim()) return;
    setActionLoading(true); setActionResult(""); setActionError("");
    try {
      const sys = "Claude Code demande une confirmation ou un choix à l'utilisateur. Explique en 1-2 phrases simples en français ce que Claude Code veut faire, si c'est sûr de dire oui, et exactement quoi taper comme réponse.";
      const ctx = [
        origPrompt.trim() ? `Prompt original: ${origPrompt.trim()}` : "",
        response.trim() ? `Réponse de Claude Code: ${response.trim()}` : "",
        `Claude Code demande maintenant: ${actionQuestion.trim()}`
      ].filter(Boolean).join("\n\n");
      const r = await callAPI(sys, ctx);
      setActionResult(r);
    } catch (e) { setActionError(e.message || "Erreur inattendue"); }
    finally { setActionLoading(false); }
  }

  async function analyze() {
    if (!origPrompt.trim() || !response.trim()) return;
    setLoading(true); setError(null); setTasks(null); setSummary("");
    try {
      const content = `Prompt original:\n${origPrompt}\n\nRéponse de Claude Code:\n${response}`;
      const r = await callAPI(SYS.analyze, content);
      let parsed;
      try {
        const clean = r.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(clean);
      } catch { throw new Error("La réponse n'était pas au format attendu. Réessaie."); }
      setTasks(parsed.tasks || []);
      setSummary(parsed.summary || "");
      onAddHistory("🔍 Analyse: " + origPrompt.slice(0, 80), r);
    } catch (e) { setError(e.message || "Erreur inattendue"); }
    finally { setLoading(false); }
  }

  const missingTasks = tasks ? tasks.filter(t => !t.done) : [];

  return (
    <div>
      <div style={{ ...cs.card, background: "#fff8e1", border: "1px solid #ffe082" }}>
        <p style={{ fontSize: 13, color: "#f57f17", margin: 0 }}>📋 Colle le prompt et la réponse — je vérifie tâche par tâche ce qui a été fait et ce qui manque.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>LE PROMPT ORIGINAL *</label>
        <textarea value={origPrompt} onChange={e => setOrigPrompt(e.target.value)} rows={4}
          placeholder="Colle ici la demande exacte que tu avais envoyée à Claude Code..." style={cs.ta} />
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>LA RÉPONSE DE CLAUDE CODE *</label>
        <textarea value={response} onChange={e => setResponse(e.target.value)} rows={6}
          placeholder="Colle ici ce que Claude Code t'a répondu..." style={cs.ta} />
      </div>
      <button onClick={analyze} disabled={loading || !origPrompt.trim() || !response.trim()} style={cs.btnMain(loading || !origPrompt.trim() || !response.trim())}>
        {loading ? "⏳ Analyse en cours..." : "🔍 Analyser la réponse"}
      </button>
      {error && (
        <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #ffcdd2", marginTop: 10 }}>
          <p style={{ fontSize: 13, color: "#c62828", margin: "0 0 8px" }}>❌ {error}</p>
          <button onClick={analyze} style={cs.btnSec}>Réessayer</button>
        </div>
      )}
      {tasks && (
        <div style={{ marginTop: 12 }}>
          <div style={{ ...cs.card, border: "1px solid #c5bff5", background: "#f5f4ff" }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#534AB7", letterSpacing: "0.05em" }}>
                🔍 RÉSULTAT — {tasks.filter(t => t.done).length}/{tasks.length} tâches complétées
              </span>
            </div>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: i < tasks.length - 1 ? "1px solid #e8e4ff" : "none" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{t.done ? "✅" : "❌"}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: t.done ? "#1b5e20" : "#c62828", margin: "0 0 2px" }}>{t.description}</p>
                  {t.note && <p style={{ fontSize: 12, color: "#7b6fa0", margin: 0 }}>{t.note}</p>}
                </div>
              </div>
            ))}
            {summary && <p style={{ fontSize: 13, color: "#534AB7", margin: "12px 0 0", fontStyle: "italic" }}>{summary}</p>}
          </div>
          {missingTasks.length > 0 && (
            <div style={{ ...cs.card, background: "#ede9ff", border: "1px solid #c5bff5" }}>
              <p style={{ fontSize: 13, color: "#534AB7", margin: "0 0 10px" }}>
                Il manque {missingTasks.length} tâche{missingTasks.length > 1 ? "s" : ""}. Génère le message de correction à envoyer à Claude Code.
              </p>
              <button onClick={() => {
                const missing = missingTasks.map((t, i) => `${i + 1}. ${t.description}${t.note ? " — " + t.note : ""}`).join("\n");
                const corrPrompt = `Ces tâches n'ont pas été complétées. Fais-les maintenant :\n\n${missing}\n\nContexte : ${origPrompt.slice(0, 200)}`;
                correction.run(SYS.correction(lang), corrPrompt, (r) => onAddHistory("🔧 Correction: " + origPrompt.slice(0, 80), r));
              }} disabled={correction.loading} style={cs.btnMain(correction.loading)}>
                {correction.loading ? "⏳ Génération..." : "🔧 Demander ce qui manque"}
              </button>
              <ErrBox msg={correction.error} />
              {correction.result && (
                <div style={{ ...cs.card, border: "2px solid #534AB7", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={cs.lbl}>🔧 MESSAGE À COPIER</span>
                    <CopyBtn text={correction.result} />
                  </div>
                  <pre style={cs.pre}>{correction.result}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Claude Code demande une action ? */}
      <div style={cs.card}>
        <label style={cs.lbl}>CLAUDE CODE DEMANDE UNE ACTION ?</label>
        <p style={cs.tip}>Colle ce que Claude Code te demande (confirmation, choix, question) — je t'explique quoi répondre.</p>
        <textarea value={actionQuestion} onChange={e => setActionQuestion(e.target.value)} rows={3}
          placeholder="Ex: Do you want me to overwrite the existing file? (y/n)&#10;Ex: Should I delete the old component? This action cannot be undone."
          style={{ ...cs.ta, marginBottom: 10 }} />
        {actionError && (
          <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "#c62828", margin: "0 0 6px" }}>❌ {actionError}</p>
            <button onClick={handleActionQuestion} style={cs.btnSec}>Réessayer</button>
          </div>
        )}
        <button onClick={handleActionQuestion} disabled={actionLoading || !actionQuestion.trim()}
          style={{ ...cs.btnMain(actionLoading || !actionQuestion.trim()), width: "auto", padding: "10px 22px" }}>
          {actionLoading ? "⏳ Analyse..." : "💬 Que dois-je répondre ?"}
        </button>
        {actionResult && (
          <div style={{ ...cs.card, background: "#f0fdf4", border: "1px solid #86efac", marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#15803d", letterSpacing: "0.05em" }}>💬 QUOI RÉPONDRE</span>
              <CopyBtn text={actionResult} />
            </div>
            <pre style={{ ...cs.pre, color: "#14532d" }}>{actionResult}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function TabImageAnalyze() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f) {
    if (!f) return;
    setFile(f); setResult(""); setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else { setPreview(null); }
  }

  async function analyze() {
    if (!file) return;
    setLoading(true); setError(null); setResult("");
    try {
      const q = question.trim() || "Explique-moi ce que tu vois dans ce fichier. Qu'est-ce que ça signifie et que dois-je faire ?";
      let content;
      if (file.type.startsWith("image/")) {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        content = [
          { type: "image", source: { type: "base64", media_type: file.type, data: b64 } },
          { type: "text", text: q }
        ];
      } else if (file.type === "application/pdf") {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        content = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: q }
        ];
      } else {
        const text = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.onerror = rej;
          r.readAsText(file);
        });
        content = `${q}\n\nContenu du fichier "${file.name}":\n${text}`;
      }
      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "Tu analyses des fichiers (images, captures d\'écran, documents) pour un entrepreneur non-technique. Explique en français simple : ce que tu vois, ce que ça signifie, et ce qu\'il doit faire. Sois direct et pratique.",
          content
        })
      });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.error || `Erreur ${resp.status}`); }
      const d = await resp.json();
      setResult(d.text);
    } catch (e) { setError(e.message || "Erreur inattendue"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ ...cs.card, background: "#fff8e1", border: "1px solid #ffe082" }}>
        <p style={{ fontSize: 13, color: "#f57f17", margin: 0 }}>📸 Uploade une image, capture d\'écran ou document — je t\'explique ce que ça contient en français simple.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>FICHIER</label>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => document.getElementById("img-file-input").click()}
          style={{ border: `2px dashed ${dragging ? "#534AB7" : "#c5bff5"}`, borderRadius: 12, padding: "2rem 1rem", textAlign: "center", cursor: "pointer", background: dragging ? "#ede9ff" : "#faf9ff", transition: "all .15s" }}>
          {file ? (
            <div>
              {preview && <img src={preview} alt="aperçu" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />}
              <p style={{ fontSize: 13, color: "#534AB7", margin: 0 }}>{file.name} ({(file.size / 1024).toFixed(0)} Ko)</p>
              <p style={{ fontSize: 11, color: "#9e96c0", margin: "4px 0 0" }}>Clique pour changer</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 28, margin: "0 0 8px" }}>📎</p>
              <p style={{ fontSize: 13, color: "#7b6fa0", margin: 0 }}>Glisse un fichier ici ou clique pour choisir</p>
              <p style={{ fontSize: 11, color: "#9e96c0", margin: "4px 0 0" }}>JPG · PNG · WEBP · PDF · TXT</p>
            </div>
          )}
        </div>
        <input id="img-file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.txt,.md,.csv" onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} style={{ display: "none" }} />
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>QU\'EST-CE QUE TU VEUX SAVOIR ? (optionnel)</label>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2}
          placeholder="Ex: Qu\'est-ce que cette erreur veut dire ? Qu\'est-ce que je dois changer ?" style={cs.ta} />
      </div>
      <button onClick={analyze} disabled={loading || !file} style={cs.btnMain(loading || !file)}>
        {loading ? "⏳ Analyse en cours..." : "📸 Analyser"}
      </button>
      {error && (
        <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #ffcdd2", marginTop: 10 }}>
          <p style={{ fontSize: 13, color: "#c62828", margin: "0 0 8px" }}>❌ {error}</p>
          <button onClick={analyze} style={cs.btnSec}>Réessayer</button>
        </div>
      )}
      {result && (
        <div style={{ ...cs.card, border: "1px solid #a5d6a7", background: "#f0fff8", marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#1b5e20", letterSpacing: "0.05em" }}>📸 ANALYSE</span>
            <CopyBtn text={result} />
          </div>
          <pre style={cs.pre}>{result}</pre>
        </div>
      )}
    </div>
  );
}

function TabImprove({ onAddHistory, SYS }) {
  const [bad, setBad] = useState("");
  const [context, setContext] = useState("");
  const improve = useAPI();
  return (
    <div>
      <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #ffcdd2" }}>
        <p style={{ fontSize: 13, color: "#c62828", margin: 0 }}>🔧 Une demande qui n'a pas bien fonctionné ? Colle-la ici.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>LA DEMANDE QUI N'A PAS BIEN FONCTIONNÉ</label>
        <textarea value={bad} onChange={e => setBad(e.target.value)} rows={6}
          placeholder="Colle ici la demande qui n'a pas donné le bon résultat..." style={cs.ta} />
      </div>
      <ContextField value={context} onChange={setContext} />
      <button onClick={() => improve.run(SYS.improve, context.trim() ? `${bad}\n\nContexte: ${context}` : bad, (r) => onAddHistory("🔧 Amélioration: " + bad.slice(0, 80), r))} disabled={improve.loading || !bad.trim()} style={cs.btnMain(improve.loading || !bad.trim())}>
        {improve.loading ? "⏳ Analyse..." : "🔧 Améliorer ma demande"}
      </button>
      <ErrBox msg={improve.error} />
      <ResultBox label="🔧 DEMANDE AMÉLIORÉE" content={improve.result} />
    </div>
  );
}

function TabDebug({ onAddHistory, SYS }) {
  const [convo, setConvo] = useState("");
  const [context, setContext] = useState("");
  const debug = useAPI();
  return (
    <div>
      <div style={{ ...cs.card, background: "#f0f4ff", border: "1px solid #c7d2fe" }}>
        <p style={{ fontSize: 13, color: "#3730a3", margin: 0 }}>💬 Colle une portion de conversation problématique. J'identifie le problème et te donne exactement quoi écrire.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>LA PORTION DE CONVERSATION PROBLÉMATIQUE</label>
        <textarea value={convo} onChange={e => setConvo(e.target.value)} rows={8}
          placeholder={"Moi : Ajoute un bouton rouge\nClaude : J'ai ajouté un bouton bleu...\nMoi : Non c'est pas ça\nClaude : ..."} style={cs.ta} />
      </div>
      <ContextField value={context} onChange={setContext} />
      <button onClick={() => debug.run(SYS.debugConvo, context.trim() ? `${convo}\n\nContexte additionnel: ${context}` : convo, (r) => onAddHistory("💬 Debug: " + convo.slice(0, 80), r))} disabled={debug.loading || !convo.trim()} style={cs.btnMain(debug.loading || !convo.trim())}>
        {debug.loading ? "⏳ Analyse..." : "💬 Déboguer cette conversation"}
      </button>
      <ErrBox msg={debug.error} />
      {debug.result && (
        <div style={{ ...cs.card, border: "1px solid #c7d2fe", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ ...cs.lbl, color: "#3730a3", margin: 0 }}>💬 ANALYSE + QUOI ÉCRIRE</span>
            <CopyBtn text={debug.result} />
          </div>
          <pre style={cs.pre}>{debug.result}</pre>
        </div>
      )}
    </div>
  );
}

function TabError({ onAddHistory, SYS }) {
  const [error, setError] = useState("");
  const [context, setContext] = useState("");
  const explain = useAPI();
  return (
    <div>
      <div style={{ ...cs.card, background: "#fff0f0", border: "1px solid #fca5a5" }}>
        <p style={{ fontSize: 13, color: "#c62828", margin: 0 }}>⚠️ Colle un message d'erreur — je t'explique en français simple et te donne quoi dire à Claude Code.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>LE MESSAGE D'ERREUR</label>
        <textarea value={error} onChange={e => setError(e.target.value)} rows={5}
          placeholder={"TypeError: Cannot read properties of undefined...\nau fichier TaskList.tsx:42..."} style={{ ...cs.ta, fontFamily: "monospace", fontSize: 13 }} />
      </div>
      <ContextField value={context} onChange={setContext} />
      <button onClick={() => explain.run(SYS.explainError, context.trim() ? `${error}\n\nContexte: ${context}` : error, (r) => onAddHistory("⚠️ Erreur: " + error.slice(0, 80), r))} disabled={explain.loading || !error.trim()} style={cs.btnMain(explain.loading || !error.trim())}>
        {explain.loading ? "⏳ Analyse..." : "⚠️ Expliquer cette erreur"}
      </button>
      <ErrBox msg={explain.error} />
      {explain.result && (
        <div style={{ ...cs.card, border: "1px solid #fca5a5", marginTop: 12, background: "#fff8f8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ ...cs.lbl, color: "#c62828", margin: 0 }}>⚠️ EXPLICATION + SOLUTION</span>
            <CopyBtn text={explain.result} />
          </div>
          <pre style={cs.pre}>{explain.result}</pre>
        </div>
      )}
    </div>
  );
}

function TabSummary({ onAddHistory, SYS }) {
  const [session, setSession] = useState("");
  const [context, setContext] = useState("");
  const summary = useAPI();
  return (
    <div>
      <div style={{ ...cs.card, background: "#f0fff8", border: "1px solid #a5d6a7" }}>
        <p style={{ fontSize: 13, color: "#1b5e20", margin: 0 }}>📋 Colle le contenu de ta session. Je génère un résumé et les prochaines étapes.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>CONTENU DE LA SESSION</label>
        <textarea value={session} onChange={e => setSession(e.target.value)} rows={8}
          placeholder="Colle ici les messages importants de ta session Claude Code..." style={cs.ta} />
      </div>
      <ContextField value={context} onChange={setContext} />
      <button onClick={() => summary.run(SYS.sessionSummary, context.trim() ? `${session}\n\nContexte: ${context}` : session, (r) => onAddHistory("📋 Résumé de session", r))} disabled={summary.loading || !session.trim()} style={cs.btnMain(summary.loading || !session.trim())}>
        {summary.loading ? "⏳ Résumé..." : "📋 Générer le résumé"}
      </button>
      <ErrBox msg={summary.error} />
      <ResultBox label="📋 RÉSUMÉ DE SESSION" content={summary.result} borderColor="#a5d6a7" bg="#f0fff8" labelColor="#1b5e20" />
    </div>
  );
}

function TabLibrary({ onUse }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "#7b6fa0", marginBottom: 12 }}>Prompts pré-faits pour ZenAlpha. Copie et adapte les [crochets].</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10 }}>
        {LIBRARY.map((item, i) => (
          <div key={i} style={cs.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1528" }}>{item.icon} {item.label}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <CopyBtn text={item.prompt} />
                <button onClick={() => onUse(item.prompt)}
                  style={{ background: "#534AB7", color: "white", border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  Utiliser →
                </button>
              </div>
            </div>
            <pre style={{ ...cs.pre, fontSize: 12, color: "#7b6fa0", background: "#faf9ff", border: "1px solid #e2defc", borderRadius: 8, padding: "8px 10px", fontFamily: "monospace" }}>{item.prompt}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabNotes() {
  const [notes, setNotes] = useState(() => load("za_notes", ""));
  useEffect(() => { save("za_notes", notes); }, [notes]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontSize: 13, color: "#7b6fa0", margin: 0 }}>📝 Bloc-notes — sauvegardé automatiquement.</p>
        <button onClick={() => { if (window.confirm("Effacer toutes les notes ?")) { setNotes(""); save("za_notes", ""); } }} style={cs.btnRed}>🗑️ Effacer</button>
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={20}
        placeholder={"Tes notes ici...\nIdées, rappels, liens importants, todo..."}
        style={{ ...cs.ta, minHeight: 400 }} />
    </div>
  );
}

function TabHistory({ history, loading, error, onClear }) {
  const debugUrl = window.location.origin + "/api/history";
  const standalone = typeof window.navigator.standalone !== "undefined"
    ? String(window.navigator.standalone)
    : typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches
      ? "true (matchMedia)"
      : "false";
  const fetchStatus = loading ? "loading..." : error ? "error" : "success";
  const debugPanel = (
    <div style={{ background: "#1a1528", color: "#a0e0a0", fontFamily: "monospace", fontSize: 11, borderRadius: 8, padding: "10px 14px", marginBottom: 14, lineHeight: 1.7 }}>
      <div style={{ color: "#fff", fontWeight: 700, marginBottom: 4 }}>🔬 DEBUG — Historique</div>
      <div><span style={{ color: "#9e96c0" }}>URL:</span> {debugUrl}</div>
      <div><span style={{ color: "#9e96c0" }}>Status:</span> <span style={{ color: fetchStatus === "error" ? "#ff7070" : fetchStatus === "success" ? "#a0e0a0" : "#ffe080" }}>{fetchStatus}</span></div>
      <div><span style={{ color: "#9e96c0" }}>Erreur:</span> {error || "—"}</div>
      <div><span style={{ color: "#9e96c0" }}>Entrées:</span> {history.length}</div>
      <div><span style={{ color: "#9e96c0" }}>standalone:</span> {standalone}</div>
    </div>
  );
  function exportHistory() {
    const text = history.map(h => {
      const d = new Date(h.created_at);
      const date = d.toLocaleDateString("fr-CA");
      const time = d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
      return `[${time} — ${date}]\n\nIDÉE: ${h.prompt}\n\nPROMPT:\n${h.result}\n\n${"─".repeat(60)}`;
    }).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "historique-prompts-zenalpha.txt"; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      {debugPanel}
      {loading && (
        <div style={{ ...cs.card, textAlign: "center", padding: "2.5rem" }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>⏳</p>
          <p style={{ color: "#7b6fa0", fontSize: 14 }}>Chargement de l'historique...</p>
        </div>
      )}
      {error && !loading && (
        <div style={{ ...cs.card, textAlign: "center", padding: "2.5rem", borderLeft: "3px solid #e05a5a" }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>⚠️</p>
          <p style={{ color: "#c0392b", fontSize: 14, marginBottom: 4 }}>Impossible de charger l'historique.</p>
          <p style={{ color: "#9e96c0", fontSize: 12 }}>{error}</p>
        </div>
      )}
      {!loading && !error && (
        <div>
          {history.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
              <button onClick={exportHistory} style={{ ...cs.btnSec, fontSize: 12, padding: "6px 14px" }}>📥 Exporter (.txt)</button>
              <button onClick={onClear} style={cs.btnRed}>🗑️ Effacer</button>
            </div>
          )}
          {history.length === 0 ? (
            <div style={{ ...cs.card, textAlign: "center", padding: "2.5rem" }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>🕐</p>
              <p style={{ fontSize: 14, color: "#7b6fa0" }}>Aucun historique. Transforme une demande pour commencer.</p>
            </div>
          ) : history.map(h => {
            const d = new Date(h.created_at);
            const date = d.toLocaleDateString("fr-CA");
            const time = d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={h.id} style={cs.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#9e96c0" }}>🕐 {time} — {date}</span>
                  <CopyBtn text={h.result} label="Copier le prompt" />
                </div>
                <p style={{ fontSize: 14, color: "#1a1528", margin: 0 }}>📝 {h.prompt}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// SESSION BANNER — always visible across all tabs
// ─────────────────────────────────────────────────────────
function VictoryBanner({ state }) {
  if (!state) return null;
  const { stepText, done, total } = state;
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: "#16a34a", color: "white", borderRadius: 14, padding: "14px 22px",
      zIndex: 9999, boxShadow: "0 8px 32px rgba(22,163,74,0.45)",
      maxWidth: "90vw", textAlign: "center", pointerEvents: "none",
      animation: "victorybounce 0.4s cubic-bezier(.36,.07,.19,.97)"
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 22 }}>🎉</p>
      <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700 }}>Bravo ! {done}/{total} étapes complétées</p>
      <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{stepText.slice(0, 55)}</p>
    </div>
  );
}

function SessionBanner({ session, steps, elapsed, timerReminder, onGoToAncre }) {
  const completed = steps.filter(s => s.state === "done" || s.completed).length;
  const total = steps.length;
  return (
    <div>
      <div style={{ background: "#064e3b", borderBottom: "2px solid #059669", padding: "8px 1.5rem", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>🎯</span>
        <span style={{ fontSize: 13, color: "#d1fae5", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session.objective.length > 80 ? session.objective.slice(0, 80) + "…" : session.objective}
        </span>
        {elapsed && elapsed !== "00:00" && (
          <span style={{ fontSize: 11, color: "#6ee7b7", whiteSpace: "nowrap", flexShrink: 0 }}>⏱ {elapsed}</span>
        )}
        {total > 0 && (
          <span style={{ fontSize: 12, color: "#6ee7b7", background: "rgba(6,78,59,0.8)", padding: "2px 10px", borderRadius: 20, border: "1px solid #059669", whiteSpace: "nowrap", flexShrink: 0 }}>
            {completed}/{total} étapes
          </span>
        )}
        <button onClick={onGoToAncre}
          style={{ background: "#059669", color: "white", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
          Voir l'ancre
        </button>
      </div>
      {timerReminder && (
        <div style={{ background: "#1c1917", borderBottom: "1px solid #44403c", padding: "6px 1.5rem", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#fbbf24" }}>⏰ Tu travailles sur : <strong>{session.objective.slice(0, 40)}</strong>. Prochaine étape : {timerReminder.slice(0, 50)}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SESSION HISTORY SECTION — shared by TabAncre
// ─────────────────────────────────────────────────────────
function SessionHistorySection({ history, expandedSummary, onExpand }) {
  if (!history.length) return null;
  return (
    <div style={cs.card}>
      <label style={cs.lbl}>🕐 SESSIONS PRÉCÉDENTES</label>
      {history.map(s => {
        const dateStr = new Date(s.started_at || s.created_at).toLocaleDateString("fr-CA");
        const isExp = expandedSummary === s.id;
        return (
          <div key={s.id} style={{ borderBottom: "1px solid #f0eeff", padding: "10px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#9e96c0" }}>{dateStr}</span>
                  <span style={{ background: s.status === "completed" ? "#dcfce7" : "#fef9c3", color: s.status === "completed" ? "#15803d" : "#854d0e", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                    {s.status === "completed" ? "✓ Terminée" : "⏳ Active"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#1a1528", lineHeight: 1.4 }}>
                  {(s.objective || "").length > 80 ? s.objective.slice(0, 80) + "…" : s.objective}
                </p>
              </div>
              {s.summary && (
                <button onClick={() => onExpand(isExp ? null : s.id)} style={{ ...cs.btnSec, fontSize: 11, padding: "4px 10px", whiteSpace: "nowrap" }}>
                  {isExp ? "Masquer" : "Voir résumé"}
                </button>
              )}
            </div>
            {isExp && s.summary && (
              <div style={{ marginTop: 8, background: "#f5f4ff", borderRadius: 8, padding: "10px 12px" }}>
                <pre style={{ ...cs.pre, fontSize: 12 }}>{s.summary}</pre>
                <button onClick={() => navigator.clipboard.writeText(s.summary)} style={{ ...cs.btnSec, fontSize: 11, marginTop: 8 }}>📋 Copier</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// QUICK CAPTURE COMPONENT
// ─────────────────────────────────────────────────────────
function QuickCapture({ session, steps, onAddStep, onAddToParkingLot }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function capture() {
    const t = text.trim(); if (!t) return;
    setText("");
    setLoading(true); setFeedback(null);
    if (!session) {
      const notes = JSON.parse(localStorage.getItem("za_quick_notes") || "[]");
      notes.unshift({ text: t, created_at: new Date().toISOString() });
      localStorage.setItem("za_quick_notes", JSON.stringify(notes.slice(0, 20)));
      setFeedback("📝 Noté (aucune session active)");
      setTimeout(() => setFeedback(null), 2000);
      setLoading(false);
      return;
    }
    try {
      const sys = "Tu classes une idée capturée rapidement pour une session de travail. Réponds UNIQUEMENT avec un seul mot: ETAPE ou PARKING";
      const content = `Objectif de session: ${session.objective}\n\nIdée capturée: ${t}`;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: sys, content }) });
      const d = await res.json();
      const verdict = (d.text || "PARKING").trim().toUpperCase();
      if (verdict.includes("ETAPE") || verdict.includes("ÉTAPE")) {
        await onAddStep(t);
        setFeedback("✅ Ajouté aux étapes");
      } else {
        await onAddToParkingLot(t);
        setFeedback("🅿️ Ajouté au parking lot");
      }
    } catch {
      await onAddToParkingLot(t);
      setFeedback("🅿️ Ajouté au parking lot");
    }
    setTimeout(() => setFeedback(null), 2000);
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "2px solid #e2defc", padding: "8px 1rem", zIndex: 200, display: "flex", gap: 8, alignItems: "center" }}>
      {feedback && (
        <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "#1a1528", color: "white", borderRadius: 8, padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap", marginBottom: 4 }}>{feedback}</div>
      )}
      <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
      <input value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && text.trim() && !loading) capture(); }}
        placeholder={session ? "Capture rapide — Entrée pour ajouter..." : "Capture rapide (sans session = note)"}
        style={{ flex: 1, fontSize: 13, border: "1px solid #e2defc", borderRadius: 8, padding: "8px 12px", fontFamily: "inherit", background: "#faf9ff", outline: "none" }} />
      {text.trim() && (
        <button onClick={capture} disabled={loading}
          style={{ background: loading ? "#b8b0e8" : "#534AB7", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          {loading ? "…" : "+"}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB ANCRE — FEATURE PRINCIPALE
// ─────────────────────────────────────────────────────────
function TabAncre({
  session, steps, parkingLot, sessionHistory,
  sessionLoading, sessionError, elapsed, timerReminder, linkedPrompts,
  onStartSession, onEndSession,
  onAddStep, onCycleStep, onDeleteStep, onUpdateBlocked,
  onAddToParkingLot, onDeleteParkingLotItem, onClearParkingLot,
}) {
  const [objective, setObjective] = useState("");
  const [emotionalState, setEmotionalState] = useState("good");
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");
  const [expandedPrompt, setExpandedPrompt] = useState(null);
  const [newStep, setNewStep] = useState("");
  const [stepLoading, setStepLoading] = useState(false);
  const [blockingReason, setBlockingReason] = useState({});
  const [distractText, setDistractText] = useState("");
  const [distractCtx, setDistractCtx] = useState("");
  const [distractResult, setDistractResult] = useState(null);
  const [distractLoading, setDistractLoading] = useState(false);
  const [distractError, setDistractError] = useState("");
  const [expandedPark, setExpandedPark] = useState(null);
  const [clearParkConfirm, setClearParkConfirm] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [expandedSummary, setExpandedSummary] = useState(null);
  const [whereAmILoading, setWhereAmILoading] = useState(false);
  const [whereAmIText, setWhereAmIText] = useState("");
  const [whereAmIError, setWhereAmIError] = useState("");
  // Smart paste
  const [pasteTarget, setPasteTarget] = useState(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState("");
  const [pastePreview, setPastePreview] = useState(null);
  const [pasteConfirmed, setPasteConfirmed] = useState(false);
  // Natural language adjust
  const [adjustText, setAdjustText] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustResult, setAdjustResult] = useState(null);
  const [adjustError, setAdjustError] = useState("");

  const completedCount = steps.filter(s => s.state === "done" || s.completed).length;
  const pct = steps.length > 0 ? Math.round(completedCount / steps.length * 100) : 0;
  const lastSession = sessionHistory.find(s => s.next_session_context);

  async function handleStart() {
    if (!objective.trim()) return;
    setStartLoading(true); setStartError("");
    try { await onStartSession(objective.trim(), emotionalState); }
    catch (err) { setStartError((err.message || "Erreur.") + " — réessaye."); }
    setStartLoading(false);
  }

  async function handleAddStep() {
    const t = newStep.trim(); if (!t) return;
    setStepLoading(true);
    try { await onAddStep(t); setNewStep(""); } catch {}
    setStepLoading(false);
  }

  async function handleWhereAmI() {
    if (!session) return;
    setWhereAmILoading(true); setWhereAmIText(""); setWhereAmIError("");
    try {
      const done = steps.filter(s => s.state === "done" || s.completed).map(s => s.text).join(", ") || "Aucune";
      const todo = steps.filter(s => s.state !== "done" && !s.completed).map(s => s.text).join(", ") || "Aucune";
      const sys = "Résume en 2 lignes max où en est l'utilisateur dans sa session de travail. Sois ultra direct.";
      const content = `Objectif: ${session.objective}\nComplétées: ${done}\nReste: ${todo}`;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: sys, content }) });
      if (!res.ok) throw new Error("Erreur serveur");
      const d = await res.json();
      setWhereAmIText(d.text);
    } catch (err) { setWhereAmIError(err.message || "Erreur"); }
    setWhereAmILoading(false);
  }

  async function handleSmartPaste() {
    if (!pasteText.trim()) return;
    setPasteLoading(true); setPasteError(""); setPastePreview(null);
    try {
      const sys = `Tu analyses une liste d'éléments et tu les tries pour une session de travail.
ÉTAPE = action concrète à faire MAINTENANT pendant cette session.
PARKING = idée future, à faire plus tard, ou pas directement lié à l'objectif.
Réponds UNIQUEMENT en JSON valide: {"steps":["item"],"parking":["item"]}`;
      const content = `Objectif de session: ${session?.objective || "Non défini"}\n\nListe à trier:\n${pasteText}`;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: sys, content }) });
      if (!res.ok) throw new Error("Erreur serveur");
      const d = await res.json();
      const clean = d.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      setPastePreview({ steps: parsed.steps || [], parking: parsed.parking || [] });
    } catch (err) { setPasteError("Erreur de tri: " + (err.message || "Réessaie.")); }
    setPasteLoading(false);
  }

  function moveItem(from, to, idx) {
    if (!pastePreview) return;
    const item = pastePreview[from][idx];
    setPastePreview(prev => ({
      ...prev,
      [from]: prev[from].filter((_, i) => i !== idx),
      [to]: [...prev[to], item]
    }));
  }

  async function confirmPaste() {
    if (!pastePreview) return;
    for (const text of pastePreview.steps) await onAddStep(text);
    for (const content of pastePreview.parking) await onAddToParkingLot(content);
    setPasteTarget(null); setPasteText(""); setPastePreview(null); setPasteConfirmed(true);
    setTimeout(() => setPasteConfirmed(false), 3000);
  }

  async function handleNLAdjust() {
    if (!adjustText.trim() || !pastePreview) return;
    setAdjustLoading(true); setAdjustResult(null); setAdjustError("");
    try {
      const sys = `Tu appliques des modifications en langage naturel à deux listes (étapes et parking lot).
Réponds UNIQUEMENT en JSON: {"steps":[...],"parking":[...],"changes":"ce qui a changé en 1 phrase"}`;
      const content = `Étapes: ${JSON.stringify(pastePreview.steps)}\nParking: ${JSON.stringify(pastePreview.parking)}\nInstruction: ${adjustText}`;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: sys, content }) });
      if (!res.ok) throw new Error("Erreur serveur");
      const d = await res.json();
      const clean = d.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      setAdjustResult(parsed);
    } catch (err) { setAdjustError(err.message || "Erreur"); }
    setAdjustLoading(false);
  }

  async function handleCheckDistraction() {
    if (!distractText.trim() || !session) return;
    setDistractLoading(true); setDistractResult(null); setDistractError("");
    try {
      const obj = session.objective;
      const sys = "Tu es un coach de focus pour quelqu'un avec TDAH qui développe une app. L'utilisateur a un objectif de session précis. Analyse si le nouveau message de Claude Code est directement lié à cet objectif ou une distraction.\n\nRéponds UNIQUEMENT dans ce format :\n\n🎯 LIÉ ou ⚠️ DISTRACTION\n\nPOURQUOI (1 phrase max, très directe)\n\nQUOI FAIRE :\n[Si LIÉ] : Maintenant ou Après l'objectif principal — explique en 1 phrase\n[Si DISTRACTION] : Copie ce message exact dans Claude Code :\n'---MESSAGE À COPIER---\nMerci, je note ça pour plus tard. Pour l'instant restons concentrés sur : " + obj + ". Peux-tu continuer avec ça ?\n---FIN DU MESSAGE---'\n\nSois ultra direct. Maximum 6 lignes au total.";
      const content = "Objectif : " + obj + "\n\nMessage Claude Code :\n" + distractText + (distractCtx.trim() ? "\n\nContexte : " + distractCtx : "");
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: sys, content }) });
      if (!res.ok) throw new Error("Erreur serveur " + res.status);
      const d = await res.json();
      setDistractResult(d.text);
    } catch (err) { setDistractError((err.message || "Erreur.") + " — réessaye."); }
    setDistractLoading(false);
  }

  function extractCopyMsg(text) {
    const m = text.match(/---MESSAGE À COPIER---\n([\s\S]*?)---FIN DU MESSAGE---/);
    return m ? m[1].trim() : null;
  }

  async function handleEndSession() {
    setSummaryLoading(true); setSummaryError(""); setSummaryText("");
    try {
      const done = steps.filter(s => s.state === "done" || s.completed).map(s => "- " + s.text).join("\n") || "Aucune";
      const todo = steps.filter(s => s.state !== "done" && !s.completed).map(s => "- " + s.text).join("\n") || "Aucune";
      const park = parkingLot.map(p => "- " + p.content).join("\n") || "Aucune";
      const sys = "Tu résumes des sessions de travail avec Claude Code. Génère en français:\n\n✅ ACCOMPLI\n⬜ RESTE À FAIRE\n🅿️ PARKING LOT\n⏭️ PROCHAINE ACTION PRIORITAIRE (1 action concrète)";
      const content = "Objectif : " + session.objective + "\n\nÉtapes complétées :\n" + done + "\n\nÉtapes non complétées :\n" + todo + "\n\nParking lot :\n" + park;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: sys, content }) });
      if (!res.ok) throw new Error("Erreur serveur");
      const d = await res.json();
      setSummaryText(d.text);
      await onEndSession(d.text);
    } catch (err) { setSummaryError((err.message || "Erreur.") + " — réessaye."); }
    setSummaryLoading(false);
  }

  const stateIcon = (s) => {
    const st = s.state || (s.completed ? "done" : "todo");
    return st === "done" ? "✅" : st === "blocked" ? "🔴" : "⬜";
  };
  const stateLabel = (s) => {
    const st = s.state || (s.completed ? "done" : "todo");
    return st === "done" ? "Complétée" : st === "blocked" ? "Bloquée" : "À faire";
  };

  const isDistraction = distractResult && distractResult.includes("⚠️ DISTRACTION");
  const copyMsg = distractResult ? extractCopyMsg(distractResult) : null;

  // ── SMART PASTE MODAL ──
  if (pasteTarget && !pastePreview) {
    return (
      <div style={cs.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <label style={cs.lbl}>📋 COLLER UNE LISTE — Tri automatique IA</label>
          <button onClick={() => { setPasteTarget(null); setPasteText(""); setPasteError(""); }} style={{ background: "none", border: "none", color: "#7b6fa0", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <p style={{ ...cs.tip, marginBottom: 10 }}>Colle n'importe quelle liste — numérotée, à puces, ou texte libre. L'IA va trier ce qui va dans les Étapes vs le Parking lot.</p>
        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={8}
          placeholder={"1. Ajouter le bouton de connexion\n2. Peut-être refactoriser le layout plus tard\n3. Corriger le bug de navigation\n- Idée pour une future fonctionnalité..."}
          style={cs.ta} />
        {pasteError && (
          <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
            <p style={{ fontSize: 13, color: "#c62828", margin: "0 0 6px" }}>❌ {pasteError}</p>
            <button onClick={handleSmartPaste} style={cs.btnSec}>Réessayer</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={handleSmartPaste} disabled={pasteLoading || !pasteText.trim()} style={{ ...cs.btnMain(pasteLoading || !pasteText.trim()), width: "auto", padding: "11px 22px" }}>
            {pasteLoading ? "⏳ Tri en cours…" : "🧠 Trier automatiquement"}
          </button>
          <button onClick={() => { setPasteTarget(null); setPasteText(""); }} style={cs.btnSec}>Annuler</button>
        </div>
      </div>
    );
  }

  // ── PASTE PREVIEW ──
  if (pastePreview) {
    return (
      <div>
        <div style={cs.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={cs.lbl}>🔍 APERÇU DU TRI — Déplace les items si besoin</label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#059669", margin: "0 0 8px" }}>📋 ÉTAPES ({pastePreview.steps.length})</p>
              {pastePreview.steps.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 8px", background: "#f0fdf4", borderRadius: 7, marginBottom: 4, border: "1px solid #bbf7d0" }}>
                  <p style={{ fontSize: 12, color: "#14532d", flex: 1, margin: 0, lineHeight: 1.4 }}>{item}</p>
                  <button onClick={() => moveItem("steps", "parking", i)} title="Envoyer au parking" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#7b6fa0", flexShrink: 0 }}>→🅿️</button>
                </div>
              ))}
              {pastePreview.steps.length === 0 && <p style={{ fontSize: 12, color: "#9e96c0" }}>Vide</p>}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", margin: "0 0 8px" }}>🅿️ PARKING ({pastePreview.parking.length})</p>
              {pastePreview.parking.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 8px", background: "#faf5ff", borderRadius: 7, marginBottom: 4, border: "1px solid #ddd6fe" }}>
                  <p style={{ fontSize: 12, color: "#4c1d95", flex: 1, margin: 0, lineHeight: 1.4 }}>{item}</p>
                  <button onClick={() => moveItem("parking", "steps", i)} title="Envoyer aux étapes" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#7b6fa0", flexShrink: 0 }}>→📋</button>
                </div>
              ))}
              {pastePreview.parking.length === 0 && <p style={{ fontSize: 12, color: "#9e96c0" }}>Vide</p>}
            </div>
          </div>
        </div>
        <div style={cs.card}>
          <label style={cs.lbl}>🗣️ MODIFIER QUELQUE CHOSE ? (optionnel)</label>
          <p style={{ ...cs.tip, marginBottom: 8 }}>Ex: "Met le point 3 dans le parking lot" ou "Le point 2 est urgent"</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={adjustText} onChange={e => setAdjustText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && adjustText.trim()) handleNLAdjust(); }}
              placeholder="Décris ta modification en français…"
              style={{ ...cs.ta, resize: "none", height: 38, padding: "8px 11px", flex: 1 }} />
            <button onClick={handleNLAdjust} disabled={adjustLoading || !adjustText.trim()}
              style={{ background: adjustLoading || !adjustText.trim() ? "#b8b0e8" : "#534AB7", color: "white", border: "none", borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              {adjustLoading ? "…" : "Appliquer"}
            </button>
          </div>
          {adjustError && <p style={{ fontSize: 13, color: "#c62828", marginTop: 6 }}>❌ {adjustError} <button onClick={handleNLAdjust} style={{ color: "#534AB7", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Réessayer</button></p>}
          {adjustResult && (
            <div style={{ background: "#ede9ff", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
              <p style={{ fontSize: 12, color: "#534AB7", margin: "0 0 6px" }}>📝 {adjustResult.changes}</p>
              <button onClick={() => { setPastePreview({ steps: adjustResult.steps, parking: adjustResult.parking }); setAdjustResult(null); setAdjustText(""); }} style={{ ...cs.btnSec, fontSize: 12 }}>Appliquer les changements</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={confirmPaste} style={{ ...cs.btnMain(false), flex: 1 }}>✅ Confirmer et ajouter tout</button>
          <button onClick={() => { setPastePreview(null); setPasteTarget(null); setPasteText(""); }} style={cs.btnSec}>✗ Annuler</button>
        </div>
      </div>
    );
  }

  // ── NO SESSION ──
  if (!session) {
    return (
      <div>
        {pasteConfirmed && <div style={{ ...cs.card, background: "#f0fdf4", border: "1px solid #86efac" }}><p style={{ fontSize: 13, color: "#15803d", margin: 0 }}>✅ Éléments ajoutés avec succès !</p></div>}
        {lastSession?.next_session_context && (
          <div style={{ ...cs.card, background: "#ede9ff", border: "1px solid #c5bff5" }}>
            <label style={{ ...cs.lbl, color: "#534AB7" }}>⏭️ REPRENDRE OÙ TU T'AS ARRÊTÉ</label>
            <pre style={{ ...cs.pre, fontSize: 12, marginBottom: 10 }}>{lastSession.next_session_context.slice(0, 300)}</pre>
            <button onClick={() => {
              const match = lastSession.next_session_context.match(/⏭️[^\n]*\n([^\n]+)/);
              setObjective(match ? match[1].trim() : lastSession.objective || "");
            }} style={{ ...cs.btnSec, fontSize: 12 }}>Utiliser comme objectif</button>
          </div>
        )}
        <div style={cs.card}>
          <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "#1a1528" }}>🎯 Ancre de session</h2>
          <p style={{ ...cs.tip, marginBottom: 14 }}>Définis ton état et ton objectif avant de commencer.</p>
          <label style={cs.lbl}>COMMENT TU TE SENS ?</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["good", "🟢 En forme"], ["tired", "🟡 Fatigué"], ["overwhelmed", "🔴 Dépassé"]].map(([st, lbl]) => (
              <button key={st} onClick={() => setEmotionalState(st)}
                style={{ background: emotionalState === st ? "#534AB7" : "transparent", color: emotionalState === st ? "white" : "#534AB7", border: "1px solid #c5bff5", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", flex: 1, transition: "all .12s" }}>
                {lbl}
              </button>
            ))}
          </div>
          <label style={cs.lbl}>MON OBJECTIF DE SESSION *</label>
          <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3}
            placeholder="Qu'est-ce que tu veux accomplir ? Ex: Ajouter l'écran de profil avec photo et nom modifiable"
            style={cs.ta} onKeyDown={e => e.ctrlKey && e.key === "Enter" && handleStart()} />
          {emotionalState === "overwhelmed" && (
            <p style={{ fontSize: 12, color: "#7c3aed", marginTop: 6, padding: "6px 10px", background: "#faf5ff", borderRadius: 7, border: "1px solid #ddd6fe" }}>
              🧡 Mode Dépassé activé — Claude va décomposer ton objectif en sous-étapes très petites automatiquement.
            </p>
          )}
          {startError && (
            <p style={{ color: "#ef4444", fontSize: 13, marginTop: 6 }}>
              {startError} <button onClick={handleStart} style={{ color: "#534AB7", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Réessayer</button>
            </p>
          )}
          {sessionError && <p style={{ color: "#c97c2a", fontSize: 12, marginTop: 4 }}>⚠️ {sessionError}</p>}
          <button onClick={handleStart} disabled={!objective.trim() || startLoading}
            style={{ ...cs.btnMain(!objective.trim() || startLoading), marginTop: 12, width: "auto", padding: "11px 28px" }}>
            {startLoading ? "Démarrage…" : "🚀 Démarrer la session"}
          </button>
        </div>
        <SessionHistorySection history={sessionHistory} expandedSummary={expandedSummary} onExpand={setExpandedSummary} />
      </div>
    );
  }

  // ── ACTIVE SESSION ──
  return (
    <div>
      {/* Objectif + progression + timer */}
      <div style={{ ...cs.card, background: "#f0fdf4", border: "2px solid #86efac" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <label style={{ ...cs.lbl, color: "#15803d", margin: 0 }}>🎯 OBJECTIF EN COURS</label>
              {elapsed && elapsed !== "00:00" && (
                <span style={{ fontSize: 11, color: "#059669", background: "#dcfce7", padding: "1px 8px", borderRadius: 99 }}>⏱ {elapsed}</span>
              )}
              {session.emotional_state === "overwhelmed" && (
                <span style={{ fontSize: 11, color: "#7c3aed", background: "#faf5ff", padding: "1px 8px", borderRadius: 99, border: "1px solid #ddd6fe" }}>🔴 Mode doux</span>
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#14532d", margin: 0, lineHeight: 1.5 }}>{session.objective}</p>
          </div>
          {!endConfirm && (
            <button onClick={() => setEndConfirm(true)} style={{ ...cs.btnRed, whiteSpace: "nowrap" }}>Terminer la session</button>
          )}
        </div>
        {steps.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#15803d" }}>{completedCount}/{steps.length} étapes</span>
              <span style={{ fontSize: 12, color: "#15803d" }}>{pct}%</span>
            </div>
            <div style={{ background: "#dcfce7", borderRadius: 99, height: 7 }}>
              <div style={{ background: "#16a34a", borderRadius: 99, height: 7, width: pct + "%", transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={handleWhereAmI} disabled={whereAmILoading}
            style={{ ...cs.btnSec, fontSize: 12, opacity: whereAmILoading ? 0.6 : 1 }}>
            {whereAmILoading ? "⏳…" : "📍 Où j'en étais ?"}
          </button>
        </div>
        {whereAmIError && <p style={{ fontSize: 12, color: "#c62828", margin: "6px 0 0" }}>❌ {whereAmIError} <button onClick={handleWhereAmI} style={{ color: "#534AB7", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 12 }}>Réessayer</button></p>}
        {whereAmIText && <div style={{ marginTop: 8, background: "#dcfce7", borderRadius: 8, padding: "8px 12px" }}><pre style={{ ...cs.pre, fontSize: 12, color: "#14532d" }}>{whereAmIText}</pre></div>}
      </div>

      {/* Fin de session */}
      {endConfirm && (
        <div style={{ ...cs.card, border: "2px solid #fca5a5", background: "#fff1f2" }}>
          {summaryLoading ? (
            <p style={{ color: "#7b6fa0", fontSize: 14 }}>⏳ Génération du résumé en cours…</p>
          ) : summaryText ? (
            <>
              <label style={{ ...cs.lbl, color: "#dc2626" }}>📋 RÉSUMÉ DE SESSION</label>
              <pre style={{ ...cs.pre, marginBottom: 10 }}>{summaryText}</pre>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => navigator.clipboard.writeText(summaryText)} style={cs.btnSec}>📋 Copier</button>
                <button onClick={() => { setEndConfirm(false); setSummaryText(""); }} style={cs.btnSec}>Fermer</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: "#dc2626", fontWeight: 600, margin: "0 0 8px" }}>Terminer et résumer la session ?</p>
              <p style={{ ...cs.tip, marginBottom: 10 }}>Un résumé structuré sera généré et sauvegardé pour ta prochaine session.</p>
              {summaryError && (
                <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>
                  {summaryError} <button onClick={handleEndSession} style={{ color: "#534AB7", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Réessayer</button>
                </p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={handleEndSession} style={{ ...cs.btnMain(false), width: "auto", padding: "10px 22px", background: "#dc2626" }}>
                  ✓ Terminer et résumer
                </button>
                <button onClick={() => { setEndConfirm(false); setSummaryError(""); }} style={cs.btnSec}>Annuler</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Étapes */}
      <div style={cs.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <label style={{ ...cs.lbl, margin: 0 }}>📋 ÉTAPES DE L'OBJECTIF</label>
          <button onClick={() => { setPasteTarget("steps"); setPasteText(""); setPastePreview(null); setPasteError(""); }}
            style={{ ...cs.btnSec, fontSize: 11, padding: "4px 10px" }}>📋 Coller une liste</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddStep()}
            placeholder="Ajouter une étape… (Entrée pour valider)"
            style={{ ...cs.ta, resize: "none", height: 38, padding: "8px 11px", flex: 1 }} />
          <button onClick={handleAddStep} disabled={!newStep.trim() || stepLoading}
            style={{ ...cs.btnMain(!newStep.trim() || stepLoading), width: 44, padding: 0, fontSize: 20, flexShrink: 0 }}>
            {stepLoading ? "…" : "+"}
          </button>
        </div>
        {steps.length === 0 && <p style={cs.tip}>Aucune étape — décompose ton objectif en sous-tâches.</p>}
        {steps.map(step => {
          const lid = step._lid || step.id;
          const st = step.state || (step.completed ? "done" : "todo");
          const isBlocked = st === "blocked";
          const isDone = st === "done";
          const hasLinked = linkedPrompts && linkedPrompts[String(lid)];
          return (
            <div key={lid} style={{ padding: "10px 0", borderBottom: "1px solid #f0eeff" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <button onClick={() => onCycleStep(lid)} title={`État: ${stateLabel(step)} — cliquer pour changer`}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, flexShrink: 0, padding: 0, lineHeight: 1 }}>
                  {stateIcon(step)}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, color: isDone ? "#9e96c0" : isBlocked ? "#dc2626" : "#1a1528", textDecoration: isDone ? "line-through" : "none", lineHeight: 1.4 }}>{step.text}</p>
                  {isDone && step.completed_at && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9e96c0" }}>
                      ✓ {new Date(step.completed_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {isBlocked && (
                    <input value={blockingReason[lid] || step.blocked_reason || ""}
                      onChange={e => {
                        setBlockingReason(prev => ({ ...prev, [lid]: e.target.value }));
                      }}
                      onBlur={e => { if (e.target.value !== step.blocked_reason) onUpdateBlocked(lid, e.target.value); }}
                      placeholder="Bloqué par quoi ?"
                      style={{ ...cs.ta, fontSize: 12, marginTop: 6, padding: "5px 9px", height: "auto", resize: "none", borderColor: "#fca5a5", background: "#fff1f2" }} />
                  )}
                  {hasLinked && expandedPrompt === lid && (
                    <div style={{ marginTop: 8, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 12px" }}>
                      <pre style={{ ...cs.pre, fontSize: 12 }}>{linkedPrompts[String(lid)]}</pre>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {hasLinked && (
                    <button onClick={() => setExpandedPrompt(expandedPrompt === lid ? null : lid)}
                      title="Voir le prompt lié" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px" }}>
                      📎
                    </button>
                  )}
                  <button onClick={() => onDeleteStep(lid)} style={{ ...cs.btnRed, padding: "3px 9px", fontSize: 12 }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vérificateur de distraction */}
      <div style={cs.card}>
        <label style={cs.lbl}>🧠 VÉRIFICATEUR DE DISTRACTION</label>
        <p style={cs.tip}>Colle ce que Claude Code vient de dire pour savoir si c'est lié à ton objectif.</p>
        <textarea value={distractText} onChange={e => setDistractText(e.target.value)} rows={4}
          placeholder="Colle ici ce que Claude Code vient de dire…"
          style={{ ...cs.ta, marginBottom: 8 }} />
        <textarea value={distractCtx} onChange={e => setDistractCtx(e.target.value)} rows={2}
          placeholder="Contexte supplémentaire (optionnel)"
          style={{ ...cs.ta, marginBottom: 10, fontSize: 12 }} />
        {distractError && (
          <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>
            {distractError} <button onClick={handleCheckDistraction} style={{ color: "#534AB7", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Réessayer</button>
          </p>
        )}
        <button onClick={handleCheckDistraction} disabled={!distractText.trim() || distractLoading}
          style={{ ...cs.btnMain(!distractText.trim() || distractLoading), width: "auto", padding: "10px 22px" }}>
          {distractLoading ? "Analyse en cours…" : "🎯 Est-ce lié à mon objectif ?"}
        </button>
        {distractResult && (
          <div style={{ marginTop: 12, background: isDistraction ? "#fff7ed" : "#f0fdf4", border: "1px solid " + (isDistraction ? "#fb923c" : "#86efac"), borderRadius: 10, padding: "12px 14px" }}>
            <pre style={{ ...cs.pre, fontSize: 13 }}>{distractResult}</pre>
            {(isDistraction || copyMsg) && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {isDistraction && copyMsg && (
                  <button onClick={() => navigator.clipboard.writeText(copyMsg)} style={{ ...cs.btnSec, fontSize: 12 }}>📋 Copier le message</button>
                )}
                {isDistraction && (
                  <button onClick={() => { onAddToParkingLot(distractText.slice(0, 300)); setDistractText(""); setDistractResult(null); }}
                    style={{ ...cs.btnSec, fontSize: 12 }}>🅿️ Ajouter au parking lot</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Parking lot */}
      <div style={cs.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <label style={{ ...cs.lbl, margin: 0 }}>
            🅿️ PARKING LOT
            {parkingLot.length > 0 && <span style={{ background: "#534AB7", color: "white", borderRadius: 99, fontSize: 10, padding: "1px 6px", marginLeft: 6 }}>{parkingLot.length}</span>}
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => { setPasteTarget("parking"); setPasteText(""); setPastePreview(null); setPasteError(""); }}
              style={{ ...cs.btnSec, fontSize: 11, padding: "4px 10px" }}>📋 Coller une liste</button>
            {parkingLot.length > 0 && (
              <>
                <button onClick={() => navigator.clipboard.writeText(parkingLot.map((p, i) => (i+1) + ". " + p.content).join("\n"))} style={{ ...cs.btnSec, fontSize: 11, padding: "5px 10px" }}>📋 Tout copier</button>
                {clearParkConfirm ? (
                  <>
                    <button onClick={() => { onClearParkingLot(); setClearParkConfirm(false); }} style={cs.btnRed}>Confirmer</button>
                    <button onClick={() => setClearParkConfirm(false)} style={cs.btnSec}>Annuler</button>
                  </>
                ) : (
                  <button onClick={() => setClearParkConfirm(true)} style={cs.btnRed}>🗑️ Vider</button>
                )}
              </>
            )}
          </div>
        </div>
        {parkingLot.length === 0 && <p style={cs.tip}>Parking lot vide — les distractions et idées futures apparaissent ici.</p>}
        {parkingLot.map(item => {
          const lid = item._lid || item.id;
          const time = new Date(item.created_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
          const isExp = expandedPark === lid;
          const preview = !isExp && item.content.length > 100 ? item.content.slice(0, 100) + "…" : item.content;
          return (
            <div key={lid} style={{ borderBottom: "1px solid #f0eeff", padding: "9px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#9e96c0", flexShrink: 0, marginTop: 2 }}>{time}</span>
                <p style={{ margin: 0, fontSize: 13, color: "#1a1528", flex: 1, lineHeight: 1.4 }}>{preview}</p>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {item.content.length > 100 && (
                    <button onClick={() => setExpandedPark(isExp ? null : lid)} style={{ ...cs.btnSec, fontSize: 10, padding: "3px 7px" }}>{isExp ? "↑" : "↓"}</button>
                  )}
                  <button onClick={() => navigator.clipboard.writeText(item.content)} style={{ ...cs.btnSec, fontSize: 10, padding: "3px 7px" }}>📋</button>
                  <button onClick={() => onDeleteParkingLotItem(lid)} style={{ ...cs.btnRed, fontSize: 10, padding: "3px 7px" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historique */}
      <SessionHistorySection history={sessionHistory} expandedSummary={expandedSummary} onExpand={setExpandedSummary} />
    </div>
  );
}

export default function Transformateur() {
  const [tab, setTab] = useState("ancre");
  const [showSettings, setShowSettings] = useState(false);
  const [lang, setLang] = useState(() => load("za_lang", "en"));
  const [master, setMaster] = useState(() => load("za_master", ""));
  const [showMaster, setShowMaster] = useState(false);
  const [projectMode, setProjectMode] = useState(() => load("za_project_mode", "zenalpha"));
  const [projectDesc, setProjectDesc] = useState(() => load("za_project_desc", ""));
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [transformInput, setTransformInput] = useState("");

  // ── Ancre session state ──
  const [session, setSession] = useState(() => { const s = load("za_session", null); return s && s.status === "active" ? s : null; });
  const [steps, setSteps] = useState(() => load("za_steps", []));
  const [parkingLot, setParkingLot] = useState(() => load("za_parking_lot", []));
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [linkedPrompts, setLinkedPrompts] = useState(() => load("za_linked_prompts", {}));
  const [celebrationState, setCelebrationState] = useState(null);
  const [elapsed, setElapsed] = useState("00:00");
  const [timerReminder, setTimerReminder] = useState(null);

  useEffect(() => save("za_lang", lang), [lang]);
  useEffect(() => save("za_project_mode", projectMode), [projectMode]);
  useEffect(() => save("za_project_desc", projectDesc), [projectDesc]);
  useEffect(() => { save("za_session", session); }, [session]);
  useEffect(() => { save("za_steps", steps); }, [steps]);
  useEffect(() => { save("za_parking_lot", parkingLot); }, [parkingLot]);
  useEffect(() => { save("za_linked_prompts", linkedPrompts); }, [linkedPrompts]);

  // Timer
  useEffect(() => {
    if (!session) { setElapsed("00:00"); setTimerReminder(null); return; }
    const startTime = new Date(session.started_at_timer || session.started_at || session.created_at).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
      if (diff >= 900) {
        const noDone = steps.every(s => s.state !== "done" && !s.completed);
        const firstTodo = steps.find(s => s.state !== "done" && !s.completed);
        if (noDone && firstTodo) setTimerReminder(firstTodo.text);
        else setTimerReminder(null);
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [session, steps]);

  const projectCtx = projectMode === "zenalpha"
    ? "The user is building ZenAlpha, a React Native/Expo app designed for someone with ADHD."
    : projectDesc.trim()
      ? `The user is working on this project: ${projectDesc.trim()}`
      : "The user is a software developer.";

  const SYS = buildSYS(projectCtx);

  async function fetchHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error(`Erreur serveur ${res.status}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(err.message || "Erreur réseau. Vérifiez votre connexion.");
    }
    setHistoryLoading(false);
  }

  useEffect(() => { fetchHistory(); }, []);
  useEffect(() => { initSessionHistory(); }, []);


  async function initSessionHistory() {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Erreur serveur " + res.status);
      const data = await res.json();
      setSessionHistory(Array.isArray(data) ? data : []);
      const activeInDB = Array.isArray(data) ? data.find(s => s.status === "active") : null;
      if (activeInDB && session && session.id === activeInDB.id) {
        try {
          const sr = await fetch("/api/steps/" + activeInDB.id);
          if (sr.ok) { const sd = await sr.json(); if (Array.isArray(sd)) setSteps(sd.map(s => ({ ...s, _lid: s.id }))); }
          const pr = await fetch("/api/parking/" + activeInDB.id);
          if (pr.ok) { const pd = await pr.json(); if (Array.isArray(pd)) setParkingLot(pd.map(p => ({ ...p, _lid: p.id }))); }
        } catch {}
      }
    } catch (err) { setSessionError(err.message); }
  }

  async function startSession(objective, emotional_state = "good") {
    setSessionLoading(true); setSessionError(null);
    const local = { id: null, objective, emotional_state, started_at: new Date().toISOString(), started_at_timer: new Date().toISOString(), status: "active" };
    setSession(local);
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objective, emotional_state }) });
      if (!res.ok) throw new Error("Erreur serveur " + res.status);
      const data = await res.json();
      setSession(data);
      // If overwhelmed, auto-break objective into smaller steps
      if (emotional_state === "overwhelmed") {
        try {
          const sys = `Tu décomposes un objectif de travail en sous-étapes très petites et concrètes pour quelqu'un qui se sent dépassé. Maximum 5 étapes. Réponds UNIQUEMENT avec un JSON: {"steps":["étape 1","étape 2",...]}`;
          const r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: sys, content: "Objectif: " + objective }) });
          if (r.ok) {
            const d = await r.json();
            const clean = d.text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
            const parsed = JSON.parse(clean);
            for (const text of (parsed.steps || [])) {
              await addStep(text);
            }
          }
        } catch {}
      }
    } catch (err) { setSessionError("Supabase indisponible — session sauvegardée localement. " + err.message); }
    setSessionLoading(false);
  }

  async function endSession(summary) {
    const updates = { status: "completed", completed_at: new Date().toISOString(), summary, next_session_context: summary };
    const finished = session ? { ...session, ...updates } : null;
    if (session?.id) {
      try { await fetch("/api/sessions/" + session.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) }); } catch {}
    }
    if (finished) setSessionHistory(prev => [finished, ...prev.filter(s => s.id !== finished.id)].slice(0, 5));
    setSession(null); setSteps([]); setParkingLot([]); setLinkedPrompts({});
    save("za_session", null); save("za_steps", []); save("za_parking_lot", []); save("za_linked_prompts", {});
    setTimerReminder(null); setElapsed("00:00");
  }

  async function addStep(text) {
    const lid = Date.now();
    const s = { _lid: lid, id: null, session_id: session?.id, text, completed: false, completed_at: null, created_at: new Date().toISOString() };
    setSteps(prev => [...prev, s]);
    if (session?.id) {
      try {
        const res = await fetch("/api/steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: session.id, text }) });
        if (res.ok) { const d = await res.json(); setSteps(prev => prev.map(x => x._lid === lid ? { ...d, _lid: lid } : x)); }
      } catch {}
    }
  }

  async function cycleStepState(lid) {
    const step = steps.find(s => (s._lid || s.id) === lid);
    if (!step) return;
    const cur = step.state || (step.completed ? "done" : "todo");
    const next = cur === "todo" ? "blocked" : cur === "blocked" ? "done" : "todo";
    const completed = next === "done";
    const completed_at = completed ? new Date().toISOString() : null;
    setSteps(prev => prev.map(s => (s._lid || s.id) === lid ? { ...s, state: next, completed, completed_at } : s));
    if (next === "done") {
      const doneCount = steps.filter(s => (s._lid || s.id) !== lid && (s.state === "done" || s.completed)).length + 1;
      setCelebrationState({ stepText: step.text, done: doneCount, total: steps.length });
      setTimeout(() => setCelebrationState(null), 4000);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
          osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.35);
        });
      } catch {}
    }
    if (step.id) {
      try { await fetch("/api/steps/" + step.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: next, completed, completed_at }) }); } catch {}
    }
  }

  async function updateStepBlocked(lid, blocked_reason) {
    setSteps(prev => prev.map(s => (s._lid || s.id) === lid ? { ...s, blocked_reason } : s));
    const step = steps.find(s => (s._lid || s.id) === lid);
    if (step?.id) {
      try { await fetch("/api/steps/" + step.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocked_reason }) }); } catch {}
    }
  }

  function linkPromptToStep(lid, promptText) {
    setLinkedPrompts(prev => ({ ...prev, [String(lid)]: promptText }));
  }

  async function deleteStep(lid) {
    const step = steps.find(s => (s._lid || s.id) === lid);
    setSteps(prev => prev.filter(s => (s._lid || s.id) !== lid));
    if (step?.id) { try { await fetch("/api/steps/" + step.id, { method: "DELETE" }); } catch {} }
  }

  async function addToParkingLot(content) {
    const lid = Date.now();
    const item = { _lid: lid, id: null, session_id: session?.id, content, created_at: new Date().toISOString() };
    setParkingLot(prev => [...prev, item]);
    if (session?.id) {
      try {
        const res = await fetch("/api/parking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: session.id, content }) });
        if (res.ok) { const d = await res.json(); setParkingLot(prev => prev.map(p => p._lid === lid ? { ...d, _lid: lid } : p)); }
      } catch {}
    }
  }

  async function deleteParkingLotItem(lid) {
    const item = parkingLot.find(p => (p._lid || p.id) === lid);
    setParkingLot(prev => prev.filter(p => (p._lid || p.id) !== lid));
    if (item?.id) { try { await fetch("/api/parking/" + item.id, { method: "DELETE" }); } catch {} }
  }

  async function clearParkingLot() {
    setParkingLot([]);
    if (session?.id) { try { await fetch("/api/parking/session/" + session.id, { method: "DELETE" }); } catch {} }
  }

  async function addToHistory(prompt, result) {
    const short = prompt.slice(0, 100) + (prompt.length > 100 ? "..." : "");
    const newEntry = { id: Date.now(), prompt: short, result, created_at: new Date().toISOString() };
    setHistory(prev => [newEntry, ...prev].slice(0, 20));
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: short, result }),
      });
    } catch {}
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", fontFamily: "system-ui,sans-serif", paddingBottom: 56 }}>
      <style>{`@keyframes victorybounce{0%{transform:translateX(-50%) scale(0.7);opacity:0}60%{transform:translateX(-50%) scale(1.08)}100%{transform:translateX(-50%) scale(1);opacity:1}}`}</style>
      <VictoryBanner state={celebrationState} />
      <QuickCapture session={session} steps={steps} onAddStep={addStep} onAddToParkingLot={addToParkingLot} />
      <div style={{ background: "#534AB7", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "#c4b5fd", margin: 0 }}>
          {projectMode === "zenalpha" ? "🏗️ ZenAlpha" : "🌐 Autre projet"} · {master ? "✓ MASTER.md" : "⚠️ sans MASTER.md"} · {lang === "en" ? "English" : "Français"}
        </p>
        <button onClick={() => setShowSettings(!showSettings)}
          style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          ⚙️ Réglages
        </button>
      </div>
      {showSettings && (
        <div style={{ background: "#ede9ff", borderBottom: "1px solid #c5bff5", padding: "1rem 1.5rem" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={cs.lbl}>MODE DE PROJET</label>
              <div style={{ display: "flex", gap: 8, marginBottom: projectMode === "generic" ? 8 : 0 }}>
                {[["zenalpha", "🏗️ ZenAlpha"], ["generic", "🌐 Autre projet"]].map(([m, lbl]) => (
                  <button key={m} onClick={() => setProjectMode(m)}
                    style={{ background: projectMode === m ? "#534AB7" : "transparent", color: projectMode === m ? "white" : "#534AB7", border: "1px solid #c5bff5", borderRadius: 7, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    {lbl}
                  </button>
                ))}
              </div>
              {projectMode === "generic" && (
                <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)}
                  rows={2} placeholder="Décris ton projet... Ex: App iOS de gestion de finances personnelles en Swift"
                  style={cs.ta} />
              )}
            </div>
            <div>
              <label style={cs.lbl}>LANGUE</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["fr", "🇫🇷 Français"], ["en", "🇬🇧 English (recommandé)"]].map(([l, lbl]) => (
                  <button key={l} onClick={() => setLang(l)}
                    style={{ background: lang === l ? "#534AB7" : "transparent", color: lang === l ? "white" : "#534AB7", border: "1px solid #c5bff5", borderRadius: 7, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: showMaster ? 8 : 0 }}>
                <label style={{ ...cs.lbl, margin: 0 }}>MASTER.MD {master ? "✓" : "— non configuré"}</label>
                <button onClick={() => setShowMaster(!showMaster)} style={{ fontSize: 11, color: "#534AB7", cursor: "pointer", textDecoration: "underline", background: "none", border: "none", fontFamily: "inherit" }}>
                  {showMaster ? "Masquer" : master ? "Modifier" : "Ajouter"}
                </button>
                {master && <button onClick={() => { setMaster(""); save("za_master", ""); }} style={{ fontSize: 11, color: "#f87171", cursor: "pointer", textDecoration: "underline", background: "none", border: "none", fontFamily: "inherit" }}>Effacer</button>}
              </div>
              {showMaster && (
                <textarea value={master} onChange={e => { setMaster(e.target.value); save("za_master", e.target.value); }}
                  rows={4} placeholder="Colle ton MASTER.md ici..." style={cs.ta} />
              )}
            </div>
          </div>
        </div>
      )}
      {session && <SessionBanner session={session} steps={steps} elapsed={elapsed} timerReminder={timerReminder} onGoToAncre={() => setTab("ancre")} />}
      <div style={{ background: "white", borderBottom: "1px solid #e2defc", overflowX: "auto" }}>
        <div style={{ display: "flex", padding: "0 1rem", minWidth: "max-content" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #534AB7" : "2px solid transparent", color: tab === t.id ? "#534AB7" : "#7b6fa0", padding: "11px 12px", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
              {t.icon} {t.label}
              {t.id === "history" && history.length > 0 && (
                <span style={{ background: "#534AB7", color: "white", borderRadius: 99, fontSize: 10, padding: "1px 6px" }}>{history.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {tab === "ancre" && <TabAncre session={session} steps={steps} parkingLot={parkingLot} sessionHistory={sessionHistory} sessionLoading={sessionLoading} sessionError={sessionError} elapsed={elapsed} timerReminder={timerReminder} linkedPrompts={linkedPrompts} onStartSession={startSession} onEndSession={endSession} onAddStep={addStep} onCycleStep={cycleStepState} onDeleteStep={deleteStep} onUpdateBlocked={updateStepBlocked} onAddToParkingLot={addToParkingLot} onDeleteParkingLotItem={deleteParkingLotItem} onClearParkingLot={clearParkingLot} />}
        {tab === "transform" && <TabTransform lang={lang} master={master} onAddHistory={addToHistory} SYS={SYS} steps={steps} onLinkPrompt={linkPromptToStep} />}
        {tab === "analyze" && <TabAnalyze lang={lang} onAddHistory={addToHistory} SYS={SYS} />}
        {tab === "improve" && <TabImprove onAddHistory={addToHistory} SYS={SYS} />}
        {tab === "debug" && <TabDebug onAddHistory={addToHistory} SYS={SYS} />}
        {tab === "error" && <TabError onAddHistory={addToHistory} SYS={SYS} />}
        {tab === "imageanalyze" && <TabImageAnalyze />}
        {tab === "summary" && <TabSummary onAddHistory={addToHistory} SYS={SYS} />}
        {tab === "library" && <TabLibrary onUse={(p) => { setTransformInput(p); setTab("transform"); }} />}
        {tab === "notes" && <TabNotes />}
        {tab === "history" && <TabHistory history={history} loading={historyLoading} error={historyError} onClear={() => { if (window.confirm("Effacer tout l'historique ?")) setHistory([]); }} />}
      </div>
    </div>
  );
}
