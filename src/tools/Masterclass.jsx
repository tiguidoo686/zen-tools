import { useState } from "react";

const CITATIONS = [
  "\"L'IA ne remplace pas les gens qui pensent. Elle remplace les gens qui ne pensent pas.\"",
  "\"La vraie puissance de l'IA, c'est de te donner du temps pour ce qui compte vraiment.\"",
  "\"Celui qui maîtrise les outils IA aujourd'hui sera le leader de demain.\"",
  "\"Claude n'est pas un moteur de recherche. C'est un partenaire de réflexion.\"",
  "\"Tu paies 200$/mois. Si tu l'utilises bien, ça vaut 2000$.\"",
];

const MODULES = [
  { id: 1, icon: "💬", title: "Claude.ai : bien plus qu'un chat", short: "Claude.ai" },
  { id: 2, icon: "💻", title: "Claude Code : ton développeur IA", short: "Claude Code" },
  { id: 3, icon: "🎯", title: "L'art du Prompt", short: "Prompts" },
  { id: 4, icon: "📁", title: "Les Projets Claude", short: "Projets" },
  { id: 5, icon: "🔬", title: "Deep Research & Documents", short: "Research" },
  { id: 6, icon: "⚡", title: "Automatisation du quotidien", short: "Automatisation" },
  { id: 7, icon: "🎙️", title: "Claude en vocal & mobile", short: "Vocal & Mobile" },
  { id: 8, icon: "🚀", title: "Plan d'action personnalisé", short: "Plan d'action" },
];

const QUIZZES = {
  1: { questions: [
    { q: "Qu'est-ce qu'un Artifact dans Claude ?", options: ["Un fichier uploadé", "Un aperçu live de code ou document généré", "Un message enregistré", "Une notification"], answer: 1 },
    { q: "À quoi servent les Projets dans Claude ?", options: ["Organiser tes chats par couleur", "Avoir une mémoire persistante par projet", "Partager des conversations", "Changer le thème"], answer: 1 },
    { q: "Quelle fonctionnalité permet à Claude de chercher sur internet ?", options: ["Deep Search", "Web Finder", "Recherche web activable", "Google Mode"], answer: 2 },
  ]},
  2: { questions: [
    { q: "Quel outil faut-il installer avant Claude Code ?", options: ["Python", "Node.js", "Git", "Xcode"], answer: 1 },
    { q: "Comment installer Claude Code ?", options: ["Télécharger un .dmg", "npm install -g @anthropic-ai/claude-code", "App Store", "brew install claude"], answer: 1 },
    { q: "Claude Code peut-il lire et modifier tes fichiers de projet ?", options: ["Non jamais", "Oui, c'est sa fonction principale", "Seulement les fichiers .txt", "Seulement en lecture"], answer: 1 },
  ]},
  3: { questions: [
    { q: "Quelle technique aide Claude à raisonner étape par étape ?", options: ["Le rôle", "Le format JSON", "Chain of thought", "Les balises XML"], answer: 2 },
    { q: "Pourquoi donner un rôle à Claude ?", options: ["Pour le faire parler plus vite", "Pour cadrer son expertise et son ton", "Pour changer sa langue", "Pour éviter les erreurs"], answer: 1 },
    { q: "Que signifie itérer avec Claude ?", options: ["Recommencer une nouvelle conversation", "Corriger et affiner dans la même conversation", "Effacer les messages", "Changer de modèle"], answer: 1 },
  ]},
  4: { questions: [
    { q: "Qu'est-ce qu'on peut ajouter dans un Projet ?", options: ["Seulement du texte", "Des fichiers de contexte et instructions persistantes", "Des images uniquement", "Des vidéos"], answer: 1 },
    { q: "Quel est l'avantage d'un Projet vs une conversation normale ?", options: ["C'est plus rapide", "Le contexte est mémorisé entre toutes les conversations", "Les réponses sont plus longues", "Il y a moins d'erreurs"], answer: 1 },
    { q: "Combien de projets peut-on créer dans Claude Max ?", options: ["1 seul", "3 maximum", "Illimité", "5 maximum"], answer: 2 },
  ]},
  5: { questions: [
    { q: "Deep Research est idéal pour :", options: ["Répondre à un email rapide", "Générer un rapport long et sourcé", "Traduire un texte", "Créer une image"], answer: 1 },
    { q: "Quels types de fichiers peut-on uploader dans Claude ?", options: ["Seulement .txt", "PDF, images, CSV, code et plus", "Seulement des images", "Seulement du code"], answer: 1 },
    { q: "Quelle est la meilleure façon d'analyser un contrat avec Claude ?", options: ["Le copier-coller entier", "L'uploader et poser des questions précises", "Décrire de mémoire", "Demander un résumé sans contexte"], answer: 1 },
  ]},
};

const s = {
  app: { display: "flex", minHeight: "100vh", background: "#0d0d14", color: "#f0eeff", fontFamily: "system-ui,sans-serif" },
  sidebar: { width: 240, background: "#13131f", borderRight: "1px solid #2a2a40", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: 5, position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 },
  sTitle: { fontSize: 11, fontWeight: 700, color: "#7b6fa0", letterSpacing: "0.08em", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #2a2a40" },
  modBtn: (active, done, locked) => ({ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, border: "none", background: active ? "#2d2060" : done ? "#1a2a1a" : "transparent", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.4 : 1, color: active ? "white" : done ? "#6fcf97" : "#b0a8d0", fontSize: 12, fontWeight: active ? 600 : 400, textAlign: "left", width: "100%" }),
  main: { flex: 1, padding: "1.75rem 2rem", maxWidth: 820, overflowY: "auto" },
  h2: { fontSize: 20, fontWeight: 700, color: "white", marginBottom: 6 },
  p: { fontSize: 14, color: "#b0a8d0", lineHeight: 1.75, marginBottom: 10 },
  card: { background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 12, padding: "1.1rem", marginBottom: 10 },
  tag: { display: "inline-block", background: "#2d2060", color: "#c4b5fd", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, marginBottom: 8 },
  tagG: { display: "inline-block", background: "#0d2a0d", color: "#6fcf97", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, marginBottom: 8 },
  tagR: { display: "inline-block", background: "#2a0d0d", color: "#f87171", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, marginBottom: 8 },
  btn: { background: "#7c3aed", color: "white", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnO: { background: "transparent", color: "#a78bfa", border: "1px solid #3a2a5a", borderRadius: 9, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  btnS: { background: "#2d2060", color: "#c4b5fd", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 14 },
  fCard: { background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 11, padding: "0.9rem 1rem" },
  prog: { height: 5, background: "#2a2a40", borderRadius: 99, overflow: "hidden", marginBottom: 5 },
  progBar: (p) => ({ height: "100%", width: `${p}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: 99, transition: "width .4s" }),
  div: { height: 1, background: "#2a2a40", margin: "1.25rem 0" },
  stepRow: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  stepNum: { width: 26, height: 26, borderRadius: "50%", background: "#2d2060", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  code: { background: "#0d0d14", border: "1px solid #2a2a40", borderRadius: 7, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, color: "#a78bfa", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" },
  compareRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  quiz: { background: "#13131f", border: "1px solid #3a2a5a", borderRadius: 12, padding: "1.25rem" },
};

function CodeBlock({ code }) {
  const [c, setC] = useState(false);
  return (
    <div style={s.code}>
      <span>{code}</span>
      <button onClick={() => { navigator.clipboard.writeText(code); setC(true); setTimeout(() => setC(false), 2000); }} style={s.btnS}>{c ? "✓" : "Copier"}</button>
    </div>
  );
}

function Quiz({ moduleId, onComplete }) {
  const quiz = QUIZZES[moduleId];
  if (!quiz) return (
    <div style={s.quiz}>
      <p style={{ ...s.p, color: "#6fcf97" }}>✅ Module complété !</p>
      <button style={s.btn} onClick={onComplete}>Continuer →</button>
    </div>
  );
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const score = submitted ? quiz.questions.filter((q, i) => answers[i] === q.answer).length : 0;
  const passed = score >= 2;
  const quizOpt = (sel, correct, show) => ({ display: "block", width: "100%", textAlign: "left", background: show ? (correct ? "#0d2a0d" : sel ? "#2a0d0d" : "#1a1a2e") : sel ? "#2d2060" : "#1a1a2e", color: show ? (correct ? "#6fcf97" : sel ? "#f87171" : "#b0a8d0") : sel ? "white" : "#b0a8d0", border: `1px solid ${show ? (correct ? "#1a4a1a" : sel ? "#4a1a1a" : "#2a2a40") : sel ? "#7c3aed" : "#2a2a40"}`, borderRadius: 7, padding: "9px 12px", fontSize: 13, cursor: show ? "default" : "pointer", marginBottom: 6, fontFamily: "inherit" });
  return (
    <div style={s.quiz}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>🧠 Quiz de fin de module</p>
      {quiz.questions.map((q, qi) => (
        <div key={qi} style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 10 }}>{qi + 1}. {q.q}</p>
          {q.options.map((opt, oi) => (
            <button key={oi} disabled={submitted} style={quizOpt(answers[qi] === oi, oi === q.answer, submitted)} onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}>{opt}</button>
          ))}
        </div>
      ))}
      {!submitted ? (
        <button style={{ ...s.btn, opacity: Object.keys(answers).length < quiz.questions.length ? 0.5 : 1 }} disabled={Object.keys(answers).length < quiz.questions.length} onClick={() => setSubmitted(true)}>Soumettre</button>
      ) : (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: passed ? "#6fcf97" : "#f87171", marginBottom: 10 }}>{passed ? `✅ Bravo ! ${score}/3` : `❌ ${score}/3 — Réessaie`}</p>
          {passed && <button style={s.btn} onClick={onComplete}>Continuer →</button>}
          {!passed && <button style={s.btnO} onClick={() => { setAnswers({}); setSubmitted(false); }}>Réessayer</button>}
        </div>
      )}
    </div>
  );
}

function Home({ onStart, completed }) {
  const citation = CITATIONS[Math.floor(Math.random() * CITATIONS.length)];
  const pct = Math.round((completed.length / MODULES.length) * 100);
  return (
    <div>
      <span style={{ background: "#7c3aed", color: "white", borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>Claude Max 200$/mois</span>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "white", margin: "12px 0 8px" }}>Claude Max <span style={{ color: "#a78bfa" }}>Masterclass</span></h1>
      <p style={{ ...s.p, fontSize: 15 }}>Tu paies 200$/mois. Voici comment en avoir pour 2000$.</p>
      <div style={{ background: "#1a0d2e", border: "1px solid #3a2a5a", borderRadius: 10, padding: "0.9rem 1.1rem", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#a78bfa", fontStyle: "italic", margin: 0 }}>{citation}</p>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: "#b0a8d0" }}>Progression</span>
          <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{completed.length}/{MODULES.length}</span>
        </div>
        <div style={s.prog}><div style={s.progBar(pct)} /></div>
      </div>
      <button style={{ ...s.btn, fontSize: 15, padding: "12px 28px" }} onClick={onStart}>
        {completed.length > 0 ? "Continuer →" : "Commencer →"}
      </button>
      <div style={s.div} />
      <div style={s.grid}>
        {MODULES.map(m => (
          <div key={m.id} style={{ ...s.fCard, opacity: completed.includes(m.id) ? 0.6 : 1 }}>
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: "white", margin: "7px 0 3px" }}>{m.title}</p>
            {completed.includes(m.id) && <span style={{ fontSize: 11, color: "#6fcf97" }}>✓ Complété</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Mod1({ onComplete }) {
  const features = [
    { icon: "📁", t: "Projets", d: "Mémoire persistante par projet.", u: "Contexte ZenAlpha toujours dispo." },
    { icon: "⚡", t: "Artifacts", d: "Aperçu live de code généré.", u: "Voir une interface React en temps réel." },
    { icon: "🌐", t: "Recherche web", d: "Claude cherche sur internet.", u: "Prix matériaux, normes RBQ récentes." },
    { icon: "🔬", t: "Deep Research", d: "Rapports longs et sourcés.", u: "Dossier investisseur, étude de marché." },
    { icon: "🧠", t: "Mémoire", d: "Claude mémorise tes préférences.", u: "Il sait que tu es entrepreneur TDAH." },
    { icon: "📎", t: "Upload fichiers", d: "PDF, images, CSV, code.", u: "Uploade un contrat pour analyse." },
    { icon: "🎨", t: "Styles", d: "Configure le ton et la longueur.", u: "Court pour toi, formel pour clients." },
    { icon: "💬", t: "Conversations longues", d: "Contexte sur des heures.", u: "Travailler sur ZenAlpha sans perdre le fil." },
  ];
  return (
    <div>
      <span style={s.tag}>MODULE 1</span>
      <h2 style={s.h2}>💬 Claude.ai : bien plus qu'un chat</h2>
      <p style={s.p}>La plupart des gens utilisent 10% de Claude. Voici ce que tu rates.</p>
      <div style={s.grid}>
        {features.map((f, i) => (
          <div key={i} style={s.fCard}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: "7px 0 4px" }}>{f.t}</p>
            <p style={{ fontSize: 12, color: "#b0a8d0", marginBottom: 6 }}>{f.d}</p>
            <p style={{ fontSize: 11, color: "#a78bfa", fontStyle: "italic" }}>💡 {f.u}</p>
          </div>
        ))}
      </div>
      <div style={s.div} /><Quiz moduleId={1} onComplete={onComplete} />
    </div>
  );
}

function Mod2({ onComplete }) {
  const steps = [
    { t: "Installer Node.js", d: "Va sur nodejs.org et télécharge la version LTS.", cmd: "node --version" },
    { t: "Installer Claude Code", d: "Dans ton Terminal, tape :", cmd: "npm install -g @anthropic-ai/claude-code" },
    { t: "S'authentifier", d: "Lance Claude Code et connecte-toi :", cmd: "claude" },
    { t: "Lancer dans ZenAlpha", d: "Dans le dossier de ton projet :", cmd: "cd ~/UrbanFinancialSeahorse/ZenAlphaMobile && claude" },
  ];
  return (
    <div>
      <span style={s.tag}>MODULE 2</span>
      <h2 style={s.h2}>💻 Claude Code : ton développeur IA</h2>
      <p style={s.p}>Claude Code lit, modifie et crée des fichiers dans ton projet. Inclus dans ton Max.</p>
      <div style={{ ...s.card, background: "#0d1f0d", border: "1px solid #1a4a1a", marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: "#6fcf97", fontWeight: 600, marginBottom: 6 }}>✅ Ce que Claude Code fait pour ZenAlpha</p>
        {["Lire tout ton code", "Modifier plusieurs fichiers en même temps", "Déboguer des erreurs complexes", "Générer des composants React Native", "Exécuter des commandes terminal"].map((item, i) => (
          <p key={i} style={{ fontSize: 12, color: "#b0a8d0", margin: "3px 0" }}>→ {item}</p>
        ))}
      </div>
      {steps.map((step, i) => (
        <div key={i} style={s.stepRow}>
          <div style={s.stepNum}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "white", margin: "0 0 5px" }}>{step.t}</p>
            <p style={{ fontSize: 12, color: "#b0a8d0", margin: "0 0 6px" }}>{step.d}</p>
            <CodeBlock code={step.cmd} />
          </div>
        </div>
      ))}
      <div style={s.div} /><Quiz moduleId={2} onComplete={onComplete} />
    </div>
  );
}

function Mod3({ onComplete }) {
  const techniques = [
    { t: "Donner un rôle", bad: "Explique-moi la comptabilité.", good: "Tu es un comptable québécois expert en petites entreprises de construction. Explique-moi la différence entre dépense et investissement en termes simples.", icon: "👤" },
    { t: "Spécifier le format", bad: "Donne-moi les étapes pour une soumission.", good: "Donne-moi les étapes pour une soumission sous forme de liste numérotée avec : nom, durée estimée, et risque principal.", icon: "📋" },
    { t: "Chain of thought", bad: "Calcule ma marge sur ce chantier.", good: "Calcule ma marge en expliquant chaque étape. Matériaux: 8000$, Main-d'oeuvre: 5000$, Prix vendu: 18000$.", icon: "🧠" },
    { t: "Balises XML", bad: "Voici mon projet, aide-moi.", good: "<contexte>Entrepreneur construction Québec, TDAH.</contexte>\n<tâche>Crée un template de soumission.</tâche>\n<format>Sections claires, espace photos</format>", icon: "🏷️" },
    { t: "Itérer", bad: "Recommence depuis le début.", good: "C'est bien mais trop formel. Garde la structure mais parle comme à un collègue.", icon: "🔄" },
  ];
  return (
    <div>
      <span style={s.tag}>MODULE 3</span>
      <h2 style={s.h2}>🎯 L'art du Prompt</h2>
      <p style={s.p}>La qualité de ce que Claude te donne dépend de comment tu lui parles.</p>
      {techniques.map((t, i) => (
        <div key={i} style={{ ...s.card, marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 10 }}>{t.icon} {t.t}</p>
          <div style={s.compareRow}>
            <div>
              <span style={s.tagR}>❌ Mauvais</span>
              <div style={{ background: "#1a0a0a", border: "1px solid #3a1a1a", borderRadius: 7, padding: "9px 11px", fontSize: 12, color: "#f87171", fontFamily: "monospace", lineHeight: 1.6 }}>{t.bad}</div>
            </div>
            <div>
              <span style={s.tagG}>✅ Bon</span>
              <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 7, padding: "9px 11px", fontSize: 12, color: "#6fcf97", fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{t.good}</div>
            </div>
          </div>
        </div>
      ))}
      <div style={s.div} /><Quiz moduleId={3} onComplete={onComplete} />
    </div>
  );
}

function Mod4({ onComplete }) {
  const [checks, setChecks] = useState({});
  const items = ["J'ai créé un projet dans Claude.ai", "J'ai nommé mon projet clairement", "J'ai ajouté un fichier de contexte", "J'ai écrit des instructions persistantes", "J'ai testé en posant une question"];
  const template = `# Projet : [NOM]\n\n## Qui je suis\n- Nom : Guillaume\n- Rôle : Entrepreneur construction\n- Contexte : TDAH, toujours en mouvement\n\n## Ce projet concerne\n[Description 2-3 phrases]\n\n## Règles de communication\n- Ton : Direct, simple\n- Longueur : Courte sauf si nécessaire\n- Jamais : Jargon, listes de 20 items\n\n## Infos clés à mémoriser\n- [Info 1]\n- [Info 2]\n\n## Objectif principal\n[Ce que je veux accomplir]`;
  return (
    <div>
      <span style={s.tag}>MODULE 4</span>
      <h2 style={s.h2}>📁 Les Projets Claude</h2>
      <p style={s.p}>Un Projet = une mémoire permanente. La fonctionnalité la plus puissante de Claude Max.</p>
      <div style={s.grid}>
        {[["🏗️", "ZenAlpha", "Structure, code, vision. Claude sait toujours où tu en es."], ["💰", "Finances", "Clients, chantiers, méthode de soumission."], ["📚", "Apprentissage", "Ce que tu veux apprendre, ton niveau, tes notes."]].map(([icon, t, d], i) => (
          <div key={i} style={s.fCard}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: "7px 0 4px" }}>{t}</p>
            <p style={{ fontSize: 12, color: "#b0a8d0" }}>{d}</p>
          </div>
        ))}
      </div>
      <div style={s.card}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 8 }}>📄 Template de projet</p>
        <div style={{ background: "#0d0d14", border: "1px solid #2a2a40", borderRadius: 7, padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: "#b0a8d0", whiteSpace: "pre-wrap", marginBottom: 8, lineHeight: 1.7 }}>{template}</div>
        <button style={s.btnS} onClick={() => navigator.clipboard.writeText(template)}>📋 Copier</button>
      </div>
      <div style={s.card}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 10 }}>✅ Checklist</p>
        {items.map((item, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={!!checks[i]} onChange={() => setChecks({ ...checks, [i]: !checks[i] })} style={{ width: 16, height: 16, accentColor: "#7c3aed", cursor: "pointer" }} />
            <span style={{ fontSize: 13, color: checks[i] ? "#6fcf97" : "#b0a8d0" }}>{item}</span>
          </label>
        ))}
      </div>
      <div style={s.div} /><Quiz moduleId={4} onComplete={onComplete} />
    </div>
  );
}

function Mod5({ onComplete }) {
  return (
    <div>
      <span style={s.tag}>MODULE 5</span>
      <h2 style={s.h2}>🔬 Deep Research & Documents</h2>
      <p style={s.p}>Claude peut produire des rapports approfondis et analyser tes documents comme un expert.</p>
      <div style={s.grid}>
        {[["✅ Idéal pour", "#6fcf97", ["Dossier investisseur", "Analyser un marché", "Comprendre une réglementation", "Comparer des options"]], ["❌ Pas idéal pour", "#f87171", ["Email rapide", "Générer du code", "Question simple", "Conversation normale"]]].map(([title, color, items], i) => (
          <div key={i} style={s.fCard}>
            <p style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 8 }}>{title}</p>
            {items.map((item, j) => <p key={j} style={{ fontSize: 12, color: "#b0a8d0", margin: "3px 0" }}>→ {item}</p>)}
          </div>
        ))}
      </div>
      <div style={s.card}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>📎 Questions à poser sur tes documents</p>
        {[["Contrat", "\"Trouve toutes les clauses qui pourraient me coûter de l'argent.\""], ["Facture", "\"Quelles dépenses sont déductibles au Québec ?\""], ["Normes RBQ", "\"Exigences pour une terrasse 40m² en bois traité ?\""]] .map(([t, q], i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "white", margin: "0 0 3px" }}>📄 {t}</p>
            <p style={{ fontSize: 12, color: "#a78bfa", fontStyle: "italic", margin: 0 }}>{q}</p>
          </div>
        ))}
      </div>
      <div style={s.div} /><Quiz moduleId={5} onComplete={onComplete} />
    </div>
  );
}

function Mod6({ onComplete }) {
  const automations = [
    { icon: "📧", t: "Email difficile", prompt: "Tu es mon assistant professionnel. Rédige une réponse ferme mais polie à ce client qui refuse de payer. Voici l'email : [colle l'email]" },
    { icon: "📅", t: "Planifier ma semaine", prompt: "Voici mes tâches : [liste]. Organise-les du lundi au vendredi, entrepreneur de terrain avec des imprévus. Priorise selon urgence et impact." },
    { icon: "💡", t: "Brainstorming", prompt: "Je suis entrepreneur construction Québec. Génère 10 idées de services premium pour augmenter ma marge sans augmenter les coûts." },
    { icon: "📖", t: "Apprendre vite", prompt: "Explique-moi [sujet] comme si j'avais 12 ans, en 5 points max, avec exemple concret en construction." },
    { icon: "⚠️", t: "Analyser un risque", prompt: "Je m'apprête à [décision]. Analyse les risques pour un entrepreneur québécois. Classe par probabilité et impact. Propose comment réduire chaque risque." },
    { icon: "📝", t: "Préparer réunion", prompt: "Je rencontre [client] pour [sujet]. Génère : 5 questions clés, points à couvrir, pièges à éviter." },
  ];
  return (
    <div>
      <span style={s.tag}>MODULE 6</span>
      <h2 style={s.h2}>⚡ Automatisation du quotidien</h2>
      <p style={s.p}>Templates prêts à utiliser. Copie, adapte, envoie.</p>
      <div style={s.grid}>
        {automations.map((a, i) => (
          <div key={i} style={s.fCard}>
            <span style={{ fontSize: 20 }}>{a.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: "7px 0 6px" }}>{a.t}</p>
            <div style={{ background: "#0d0d14", border: "1px solid #2a2a40", borderRadius: 7, padding: "8px 10px", fontSize: 11, color: "#b0a8d0", fontFamily: "monospace", lineHeight: 1.6, marginBottom: 7 }}>{a.prompt}</div>
            <button style={s.btnS} onClick={() => navigator.clipboard.writeText(a.prompt)}>📋 Copier</button>
          </div>
        ))}
      </div>
      <div style={s.div} />
      <div style={s.quiz}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 8 }}>🎉 Module complété !</p>
        <button style={s.btn} onClick={onComplete}>Continuer →</button>
      </div>
    </div>
  );
}

function Mod7({ onComplete }) {
  return (
    <div>
      <span style={s.tag}>MODULE 7</span>
      <h2 style={s.h2}>🎙️ Claude en vocal & mobile</h2>
      <p style={s.p}>Sur iPhone, Claude devient un assistant vocal pour le chantier, la voiture, partout.</p>
      <div style={s.grid}>
        {[["🚗", "En voiture", ["Dicte par voix dans Safari", "Lis la réponse avec synthèse vocale iOS", "Raccourcis Siri pour ouvrir Claude"]], ["🔨", "Sur le chantier", ["Dicte tes notes vocales", "Prends une photo et demande analyse", "Questions normes RBQ en temps réel"]], ["📱", "Raccourcis pratiques", ["Épingle Claude dans ton Dock", "Active la dictée clavier (micro 🎤)", "Partage depuis d'autres apps vers Claude"]]].map(([icon, t, tips], i) => (
          <div key={i} style={s.fCard}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: "7px 0 8px" }}>{t}</p>
            {tips.map((tip, j) => <p key={j} style={{ fontSize: 12, color: "#b0a8d0", margin: "3px 0" }}>→ {tip}</p>)}
          </div>
        ))}
      </div>
      <div style={{ ...s.card, background: "#1a0d2e", border: "1px solid #3a2a5a" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>💡 Astuce TDAH — Vide-cerveau</p>
        <div style={{ background: "#0d0d14", border: "1px solid #2a2a40", borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "#a78bfa", fontFamily: "monospace", lineHeight: 1.7 }}>
          "J'ai 15 choses en tête. Je vais tout te dicter et tu vas m'aider à trier et prioriser pour aujourd'hui."
        </div>
      </div>
      <div style={s.div} />
      <div style={s.quiz}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 8 }}>✅ Module complété !</p>
        <button style={s.btn} onClick={onComplete}>Continuer →</button>
      </div>
    </div>
  );
}

function Mod8({ onComplete, completed }) {
  const allDone = completed.length >= 7;
  return (
    <div>
      <span style={s.tag}>MODULE 8</span>
      <h2 style={s.h2}>🚀 Plan d'action personnalisé</h2>
      {!allDone && <div style={{ ...s.card, background: "#1a0d0d", border: "1px solid #3a1a1a" }}><p style={{ color: "#f87171", fontSize: 13 }}>⚠️ Complète les modules précédents d'abord.</p></div>}
      <div style={{ opacity: allDone ? 1 : 0.3 }}>
        {[["📅 Aujourd'hui", ["Crée ton projet ZenAlpha dans Claude.ai", "Colle ton MASTER.md dedans", "Teste le Transformateur avec une vraie demande"]], ["📅 Cette semaine", ["Installe Claude Code si pas encore fait", "Utilise Deep Research pour un sujet chantier", "Teste 3 templates du Module 6"]], ["📅 Ce mois-ci", ["Crée 3 projets Claude (ZenAlpha, Finances, Apprentissage)", "Utilise Claude chaque matin pour planifier", "Intègre le Transformateur dans ZenAlpha"]]].map(([title, tasks], i) => (
          <div key={i} style={{ ...s.card, marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>{title}</p>
            {tasks.map((t, j) => (
              <div key={j} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                <span style={{ color: "#7c3aed" }}>→</span>
                <span style={{ fontSize: 13, color: "#b0a8d0" }}>{t}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ background: "linear-gradient(135deg,#1a0d2e,#0d1f2e)", border: "1px solid #3a2a5a", borderRadius: 14, padding: "1.75rem", textAlign: "center", marginTop: 16 }}>
          <p style={{ fontSize: 28, marginBottom: 10 }}>🎉</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 6 }}>Masterclass complétée !</p>
          <p style={{ fontSize: 13, color: "#b0a8d0", marginBottom: 16 }}>Tu as maintenant tout ce qu'il faut pour utiliser Claude Max à pleine puissance.</p>
          <button style={{ ...s.btn, fontSize: 15, padding: "12px 28px" }} onClick={onComplete}>Terminer 🚀</button>
        </div>
      </div>
    </div>
  );
}

const MODS = { 1: Mod1, 2: Mod2, 3: Mod3, 4: Mod4, 5: Mod5, 6: Mod6, 7: Mod7, 8: Mod8 };

export default function Masterclass() {
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState([]);
  function complete(id) {
    if (!completed.includes(id)) setCompleted([...completed, id]);
    if (id < 8) setCurrent(id + 1);
  }
  const pct = Math.round((completed.length / MODULES.length) * 100);
  const ModComp = current > 0 ? MODS[current] : null;
  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <p style={s.sTitle}>MASTERCLASS</p>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#7b6fa0" }}>{completed.length}/{MODULES.length}</span>
            <span style={{ fontSize: 10, color: "#a78bfa" }}>{pct}%</span>
          </div>
          <div style={s.prog}><div style={s.progBar(pct)} /></div>
        </div>
        <button style={s.modBtn(current === 0, false, false)} onClick={() => setCurrent(0)}>
          <span>🏠</span><span>Accueil</span>
        </button>
        {MODULES.map((m, i) => {
          const locked = i > 0 && !completed.includes(i);
          const done = completed.includes(m.id);
          return (
            <button key={m.id} style={s.modBtn(current === m.id, done, locked)} onClick={() => !locked && setCurrent(m.id)} disabled={locked}>
              <span>{m.icon}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{m.short}</span>
              <span style={{ fontSize: 10, color: done ? "#6fcf97" : "#555" }}>{done ? "✓" : locked ? "🔒" : ""}</span>
            </button>
          );
        })}
      </div>
      <div style={s.main}>
        {current === 0 ? <Home onStart={() => setCurrent(completed.length > 0 ? Math.min(completed.length + 1, 8) : 1)} completed={completed} />
          : ModComp ? <ModComp onComplete={() => complete(current)} completed={completed} /> : null}
      </div>
    </div>
  );
}
