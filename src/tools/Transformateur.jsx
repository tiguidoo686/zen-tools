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

const SYS = {
  transform: (master, lang, complexity) =>
    `You are an expert at writing prompts for developers. The user is building ZenAlpha, a React Native/Expo app with an AI named Lia, designed for someone with ADHD.${master ? `\n\nProject context:\n${master}` : ""}
Complexity: ${complexity === "small" ? "Small (1-2 files)" : complexity === "medium" ? "Medium (multiple files)" : "Large (architecture change)"}.
Write a structured prompt in ${lang === "en" ? "English" : "French"}:
- Numbered tasks
- Include EVERYTHING needed (UI, logic, save, validation, feedback, errors, integration)
- Mention section/file if provided
- End with checklist
Reply ONLY with the prompt. No intro.`,

  explain: `Explain technical content in simple French to someone who knows nothing about code. Short points, zero jargon, max 2-3 lines per point. End with: "Est-ce que c'est bien ce que tu avais en tête ?"`,

  analyze: `You verify if Claude Code did what was asked. Reply in French, 3 sections:
✅ CE QUI A ÉTÉ FAIT
⚠️ CE QUI SEMBLE MANQUER
🔍 CE QUE TU DEVRAIS VÉRIFIER
Direct, simple, max 4 points per section.`,

  correction: (lang) => `Write a correction prompt for Claude Code in ${lang === "en" ? "English" : "French"}. Based on the analysis, list ONLY what needs to be fixed as numbered tasks. Be specific. Include validation steps. End with checklist. Reply ONLY with the prompt.`,

  improve: `Tu corriges des demandes qui n'ont pas bien fonctionné avec Claude Code. Réponds en français:
1. POURQUOI ÇA N'A PAS MARCHÉ (2-3 raisons simples)
2. VERSION AMÉLIORÉE (prompt corrigé, numéroté, prêt à utiliser)`,

  urgent: `Fix urgent ZenAlpha (React Native/Expo) problems fast. Give minimum viable Claude Code prompt to unblock. Be concise, direct, actionable.`,

  explainError: `Tu expliques des erreurs techniques en français simple.
1. CE QUE ÇA VEUT DIRE (2-3 lignes simples)
2. POURQUOI ÇA ARRIVE
3. QUOI DIRE À CLAUDE CODE (prompt exact à copier-coller)`,

  debugConvo: `Tu analyses des conversations problématiques avec Claude Code. Explique:
1. CE QUI A MAL TOURNÉ
2. POURQUOI (français simple)
3. EXACTEMENT QUOI ÉCRIRE À CLAUDE CODE pour recadrer sans recommencer
Donne le message exact à copier-coller à la fin.`,

  sessionSummary: `Tu résumes des sessions de travail avec Claude Code. Génère en français:
📋 CE QUI A ÉTÉ ACCOMPLI
🔄 CE QUI EST EN COURS
⏭️ PROCHAINES ÉTAPES SUGGÉRÉES (2-3 actions concrètes)`,
};

const LIBRARY = [
  { label: "Nouvel écran", icon: "📱", prompt: "Add a new screen called [NAME] to ZenAlpha. Include: navigation setup, basic layout with header, empty state, and connect it to the existing navigation structure." },
  { label: "Corriger un bug", icon: "🐛", prompt: "Fix this bug in ZenAlpha: [DESCRIBE THE BUG]. Find the root cause, fix it without breaking existing functionality, and add a check to prevent it from happening again." },
  { label: "Fonctionnalité Lia", icon: "🤖", prompt: "Add this capability to Lia (the AI in ZenAlpha): [DESCRIBE CAPABILITY]. Update the AI system prompt, add UI feedback, handle errors gracefully, and test with edge cases." },
  { label: "Composant UI", icon: "🎨", prompt: "Create a reusable UI component for ZenAlpha: [DESCRIBE COMPONENT]. Match the existing design system, make it typed with TypeScript, handle loading/error/empty states." },
  { label: "Sauvegarder données", icon: "💾", prompt: "Add data persistence for [DATA TYPE] in ZenAlpha. Use the existing storage solution, handle errors, add loading states, and ensure data survives app restart." },
  { label: "Optimiser perf", icon: "⚡", prompt: "Optimize the performance of [SCREEN/FEATURE] in ZenAlpha. Identify bottlenecks, reduce unnecessary re-renders, optimize lists if any." },
  { label: "Ajouter navigation", icon: "🗺️", prompt: "Add navigation to [SCREEN] in ZenAlpha. Include back button, proper stack setup, pass necessary params, and handle edge cases." },
  { label: "Intégration API", icon: "🔌", prompt: "Integrate this API call in ZenAlpha: [DESCRIBE WHAT IT DOES]. Add loading state, error handling, retry logic, and display the result properly in the UI." },
];

const TABS = [
  { id: "transform", icon: "✦", label: "Transformer" },
  { id: "analyze", icon: "🔍", label: "Analyser réponse" },
  { id: "improve", icon: "🔧", label: "Améliorer demande" },
  { id: "debug", icon: "💬", label: "Déboguer convo" },
  { id: "error", icon: "⚠️", label: "Expliquer erreur" },
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

function TabTransform({ lang, master, onAddHistory }) {
  const [input, setInput] = useState("");
  const [section, setSection] = useState("");
  const [context, setContext] = useState("");
  const [complexity, setComplexity] = useState("medium");
  const prompt = useAPI();
  const explain = useAPI();

  async function transform() {
    const contextPart = context.trim() ? `\n\nAdditional context from user: ${context.trim()}` : "";
    const content = section.trim() ? `Section/file: ${section.trim()}\n\nIdea: ${input.trim()}${contextPart}` : `${input.trim()}${contextPart}`;
    prompt.run(SYS.transform(master, lang, complexity), content, (r) => onAddHistory(input, r));
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
    </div>
  );
}

function TabAnalyze({ lang }) {
  const [origPrompt, setOrigPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [context, setContext] = useState("");
  const analysis = useAPI();
  const correction = useAPI();

  async function analyze() {
    const contextPart = context.trim() ? `\n\nContexte additionnel: ${context.trim()}` : "";
    const content = origPrompt.trim()
      ? `Demande originale:\n${origPrompt}\n\nRéponse de Claude Code:\n${response}${contextPart}`
      : `Réponse de Claude Code:\n${response}${contextPart}`;
    analysis.run(SYS.analyze, content);
    correction.setResult("");
  }

  return (
    <div>
      <div style={{ ...cs.card, background: "#fff8e1", border: "1px solid #ffe082" }}>
        <p style={{ fontSize: 13, color: "#f57f17", margin: 0 }}>📋 Colle la réponse de Claude Code. Je vérifie ce qui a été fait, ce qui manque, et je génère le prompt de correction.</p>
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>TA DEMANDE ORIGINALE (recommandé)</label>
        <textarea value={origPrompt} onChange={e => setOrigPrompt(e.target.value)} rows={3}
          placeholder="Colle ici la demande que tu avais envoyée à Claude Code..." style={cs.ta} />
      </div>
      <div style={cs.card}>
        <label style={cs.lbl}>LA RÉPONSE DE CLAUDE CODE *</label>
        <textarea value={response} onChange={e => setResponse(e.target.value)} rows={6}
          placeholder="Colle ici ce que Claude Code t'a répondu..." style={cs.ta} />
      </div>
      <ContextField value={context} onChange={setContext} />
      <button onClick={analyze} disabled={analysis.loading || !response.trim()} style={cs.btnMain(analysis.loading || !response.trim())}>
        {analysis.loading ? "⏳ Analyse..." : "🔍 Analyser la réponse"}
      </button>
      <ErrBox msg={analysis.error} />
      {analysis.result && (
        <div>
          <ResultBox label="🔍 ANALYSE" content={analysis.result} borderColor="#a5d6a7" bg="#f0fff8" labelColor="#1b5e20" />
          <div style={{ ...cs.card, background: "#ede9ff", border: "1px solid #c5bff5" }}>
            <p style={{ fontSize: 13, color: "#534AB7", margin: "0 0 10px" }}>Il manque des choses ? Génère le prompt de correction.</p>
            <button onClick={() => {
              const contextPart = context.trim() ? `\n\nUser context: ${context.trim()}` : "";
              const content = `Original request:\n${origPrompt || "not provided"}\n\nClaude Code response:\n${response}\n\nAnalysis:\n${analysis.result}${contextPart}`;
              correction.run(SYS.correction(lang), content);
            }} disabled={correction.loading} style={cs.btnMain(correction.loading)}>
              {correction.loading ? "⏳ Génération..." : "🔧 Générer le prompt de correction"}
            </button>
          </div>
          <ErrBox msg={correction.error} />
          {correction.result && (
            <div style={{ ...cs.card, border: "2px solid #534AB7", marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={cs.lbl}>🔧 PROMPT DE CORRECTION</span>
                <CopyBtn text={correction.result} />
              </div>
              <pre style={cs.pre}>{correction.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabImprove() {
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
      <button onClick={() => improve.run(SYS.improve, context.trim() ? `${bad}\n\nContexte: ${context}` : bad)} disabled={improve.loading || !bad.trim()} style={cs.btnMain(improve.loading || !bad.trim())}>
        {improve.loading ? "⏳ Analyse..." : "🔧 Améliorer ma demande"}
      </button>
      <ErrBox msg={improve.error} />
      <ResultBox label="🔧 DEMANDE AMÉLIORÉE" content={improve.result} />
    </div>
  );
}

function TabDebug() {
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
      <button onClick={() => debug.run(SYS.debugConvo, context.trim() ? `${convo}\n\nContexte additionnel: ${context}` : convo)} disabled={debug.loading || !convo.trim()} style={cs.btnMain(debug.loading || !convo.trim())}>
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

function TabError() {
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
      <button onClick={() => explain.run(SYS.explainError, context.trim() ? `${error}\n\nContexte: ${context}` : error)} disabled={explain.loading || !error.trim()} style={cs.btnMain(explain.loading || !error.trim())}>
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

function TabSummary() {
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
      <button onClick={() => summary.run(SYS.sessionSummary, context.trim() ? `${session}\n\nContexte: ${context}` : session)} disabled={summary.loading || !session.trim()} style={cs.btnMain(summary.loading || !session.trim())}>
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
  const [saved, setSaved] = useState(false);
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

function TabHistory({ history, setHistory }) {
  function exportHistory() {
    const text = history.map(h => `[${h.time} — ${h.date}]\n\nIDÉE: ${h.prompt}\n\nPROMPT:\n${h.result}\n\n${"─".repeat(60)}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "historique-prompts-zenalpha.txt"; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      {history.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
          <button onClick={exportHistory} style={{ ...cs.btnSec, fontSize: 12, padding: "6px 14px" }}>📥 Exporter (.txt)</button>
          <button onClick={() => { if (window.confirm("Effacer tout l'historique ?")) setHistory([]); }} style={cs.btnRed}>🗑️ Effacer</button>
        </div>
      )}
      {history.length === 0 ? (
        <div style={{ ...cs.card, textAlign: "center", padding: "2.5rem" }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>🕐</p>
          <p style={{ fontSize: 14, color: "#7b6fa0" }}>Aucun historique. Transforme une demande pour commencer.</p>
        </div>
      ) : history.map(h => (
        <div key={h.id} style={cs.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#9e96c0" }}>🕐 {h.time} — {h.date}</span>
            <CopyBtn text={h.result} label="Copier le prompt" />
          </div>
          <p style={{ fontSize: 14, color: "#1a1528", margin: 0 }}>📝 {h.prompt}</p>
        </div>
      ))}
    </div>
  );
}

export default function Transformateur() {
  const [tab, setTab] = useState("transform");
  const [showSettings, setShowSettings] = useState(false);
  const [lang, setLang] = useState(() => load("za_lang", "en"));
  const [master, setMaster] = useState(() => load("za_master", ""));
  const [showMaster, setShowMaster] = useState(false);
  const [history, setHistory] = useState(() => load("za_prompt_history", []));
  const [transformInput, setTransformInput] = useState("");

  useEffect(() => save("za_lang", lang), [lang]);
  useEffect(() => save("za_prompt_history", history), [history]);

  function addToHistory(prompt, result) {
    const entry = { id: Date.now(), prompt: prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""), result, time: new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }), date: new Date().toLocaleDateString("fr-CA") };
    setHistory(prev => [entry, ...prev].slice(0, 20));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4ff", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ background: "#534AB7", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "#c4b5fd", margin: 0 }}>
          {master ? "✓ MASTER.md configuré" : "⚠️ MASTER.md non configuré"} · {lang === "en" ? "English" : "Français"}
        </p>
        <button onClick={() => setShowSettings(!showSettings)}
          style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          ⚙️ Réglages
        </button>
      </div>
      {showSettings && (
        <div style={{ background: "#ede9ff", borderBottom: "1px solid #c5bff5", padding: "1rem 1.5rem" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
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
        {tab === "transform" && <TabTransform lang={lang} master={master} onAddHistory={addToHistory} />}
        {tab === "analyze" && <TabAnalyze lang={lang} />}
        {tab === "improve" && <TabImprove />}
        {tab === "debug" && <TabDebug />}
        {tab === "error" && <TabError />}
        {tab === "summary" && <TabSummary />}
        {tab === "library" && <TabLibrary onUse={(p) => { setTransformInput(p); setTab("transform"); }} />}
        {tab === "notes" && <TabNotes />}
        {tab === "history" && <TabHistory history={history} setHistory={setHistory} />}
      </div>
    </div>
  );
}
