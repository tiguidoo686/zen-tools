import { useState } from "react";

const MODULES = [
  {
    id: 1, icon: "🧱", title: "C'est quoi le code ?",
    intro: "Le code c'est comme donner des instructions très précises à quelqu'un qui fait exactement ce qu'on lui dit — ni plus, ni moins.",
    lessons: [
      {
        title: "Le code, c'est des instructions",
        content: `Imagine que tu expliques à quelqu'un comment construire un mur, étape par étape. Le code c'est pareil — tu donnes des instructions à l'ordinateur.

L'ordinateur fait exactement ce que tu lui dis. Si tu oublies une étape, il va bloquer. C'est pour ça que les détails comptent.`,
        example: { bad: "Construis un mur.", good: "1. Prépare le mortier\n2. Place la première rangée de briques\n3. Laisse sécher 24h\n4. Répète pour chaque rangée" },
        tip: "En code, chaque instruction doit être claire et dans le bon ordre."
      },
      {
        title: "Les variables — les tiroirs de l'ordinateur",
        content: `Une variable c'est comme un tiroir avec une étiquette. Tu mets quelque chose dedans, et tu peux le ressortir plus tard en appelant le nom du tiroir.`,
        example: { bad: "Je me souviens que le client s'appelle Jean et qu'il doit 5000$.", good: 'const nomClient = "Jean"\nconst montantDu = 5000\n\nconsole.log(nomClient + " doit " + montantDu + "$")' },
        tip: "Les variables gardent les informations en mémoire pour les réutiliser."
      },
      {
        title: "Les fonctions — les recettes",
        content: `Une fonction c'est comme une recette. Tu l'écris une fois, et tu peux l'utiliser autant de fois que tu veux sans tout réécrire.`,
        example: { bad: "Calcule 8000 + 5000 = 13000. Puis calcule 12000 + 7000 = 19000.", good: 'function calculerTotal(materiaux, mainOeuvre) {\n  return materiaux + mainOeuvre\n}\n\ncalculerTotal(8000, 5000) // 13000\ncalculerTotal(12000, 7000) // 19000' },
        tip: "Les fonctions évitent de répéter le même code."
      }
    ]
  },
  {
    id: 2, icon: "⚛️", title: "React — comment ZenAlpha est construit",
    intro: "ZenAlpha est construit avec React. C'est une façon d'organiser une app en petits blocs réutilisables qu'on appelle des composants.",
    lessons: [
      {
        title: "Les composants — les sections d'un chantier",
        content: `Imagine un chantier divisé en sections : fondations, murs, toit, électricité. Chaque section est gérée séparément mais ensemble elles forment la maison.

En React, chaque partie de l'écran est un composant. Le bouton, la liste, la barre du haut — chacun est un composant séparé.`,
        example: { bad: "Un seul fichier énorme qui gère tout l'écran.", good: 'function BoutonCreeTask() {\n  return (\n    <button>+ Nouvelle tâche</button>\n  )\n}\n\nfunction ListeTaches() {\n  return (\n    <div>\n      <BoutonCreeTask />\n      <Tache texte="Appeler client" />\n    </div>\n  )\n}' },
        tip: "Chaque composant fait une seule chose et la fait bien."
      },
      {
        title: "Le state — la mémoire de l'écran",
        content: `Le state c'est ce que l'écran se rappelle pendant que tu l'utilises. Si tu coches une tâche, l'écran doit se souvenir qu'elle est cochée.

useState c'est la façon dont React garde ces informations en mémoire.`,
        example: { bad: "L'écran affiche toujours la même chose, peu importe ce que tu fais.", good: 'function Compteur() {\n  const [nombre, setNombre] = useState(0)\n\n  return (\n    <button onClick={() => setNombre(nombre + 1)}>\n      Clics : {nombre}\n    </button>\n  )\n}' },
        tip: "Quand le state change, l'écran se met à jour automatiquement."
      },
      {
        title: "Les props — passer des infos entre composants",
        content: `Les props c'est comme passer des informations d'un chef de chantier à ses employés. Le parent donne les infos, l'enfant les utilise.`,
        example: { bad: "Chaque composant doit aller chercher ses propres informations.", good: 'function CarteClient({ nom, montant }) {\n  return (\n    <div>\n      <p>{nom}</p>\n      <p>{montant}$</p>\n    </div>\n  )\n}\n\n// Utilisation :\n<CarteClient nom="Tremblay" montant={5000} />' },
        tip: "Les props permettent aux composants de communiquer entre eux."
      }
    ]
  },
  {
    id: 3, icon: "📱", title: "React Native — ZenAlpha sur iPhone",
    intro: "React Native c'est React mais pour les apps iPhone et Android. Au lieu d'un site web, tu construis une vraie app mobile.",
    lessons: [
      {
        title: "La différence entre web et mobile",
        content: `Sur le web tu utilises des balises HTML comme div et button. Sur mobile avec React Native, tu utilises View, Text, et TouchableOpacity.

C'est la même logique, juste des noms différents.`,
        example: { bad: "Web :\n<div>\n  <p>Bonjour</p>\n  <button>Cliquer</button>\n</div>", good: "Mobile (React Native) :\n<View>\n  <Text>Bonjour</Text>\n  <TouchableOpacity>\n    <Text>Cliquer</Text>\n  </TouchableOpacity>\n</View>" },
        tip: "View = div, Text = p, TouchableOpacity = button."
      },
      {
        title: "StyleSheet — comment on stylise sur mobile",
        content: `Sur mobile on ne peut pas utiliser le CSS normal du web. On utilise StyleSheet.create() qui ressemble au CSS mais avec quelques différences.`,
        example: { bad: "// CSS Web :\n.bouton {\n  background-color: purple;\n  border-radius: 10px;\n  padding: 12px;\n}", good: "// React Native :\nconst styles = StyleSheet.create({\n  bouton: {\n    backgroundColor: 'purple',\n    borderRadius: 10,\n    padding: 12,\n  }\n})" },
        tip: "backgroundColor au lieu de background-color. Les nombres sans 'px'."
      },
      {
        title: "Navigation — passer d'un écran à l'autre",
        content: `Dans ZenAlpha, quand tu tapes sur un bouton pour aller à l'onglet Perso, c'est la navigation qui gère ça.

C'est comme un GPS pour ton app — il sait quel écran afficher selon où tu veux aller.`,
        example: { bad: "L'app a juste un écran et tout est dedans.", good: "function EcranAccueil({ navigation }) {\n  return (\n    <TouchableOpacity\n      onPress={() => navigation.navigate('Perso')}>\n      <Text>Aller dans Perso</Text>\n    </TouchableOpacity>\n  )\n}" },
        tip: "navigation.navigate('NomEcran') pour changer d'écran."
      }
    ]
  },
  {
    id: 4, icon: "🗄️", title: "Les données — comment ZenAlpha se souvient",
    intro: "Une app qui oublie tout quand tu la fermes c'est inutile. Voici comment ZenAlpha garde tes données.",
    lessons: [
      {
        title: "AsyncStorage — la mémoire locale",
        content: `AsyncStorage c'est comme un carnet de notes dans ton téléphone. Quand tu fermes l'app et tu la rouvres, les notes sont encore là.

C'est ce que ZenAlpha utilise pour garder tes préférences et données locales.`,
        example: { bad: "const [taches, setTaches] = useState([])\n// Problème : quand l'app ferme, les tâches disparaissent.", good: "// Sauvegarder :\nawait AsyncStorage.setItem('taches', JSON.stringify(taches))\n\n// Récupérer :\nconst data = await AsyncStorage.getItem('taches')\nconst taches = JSON.parse(data)" },
        tip: "setItem pour sauvegarder, getItem pour récupérer."
      },
      {
        title: "Supabase — la mémoire dans le cloud",
        content: `AsyncStorage c'est local — juste sur ton téléphone. Supabase c'est dans le cloud — accessible depuis tous tes appareils.

C'est pour ça que tes données ZenAlpha sont les mêmes sur ton iPhone et ton iPad.`,
        example: { bad: "Les données sont seulement sur un appareil.", good: "// Sauvegarder dans le cloud :\nconst { data } = await supabase\n  .from('taches')\n  .insert({ titre: 'Appeler Tremblay', fait: false })\n\n// Récupérer depuis n'importe quel appareil :\nconst { data: taches } = await supabase\n  .from('taches')\n  .select('*')" },
        tip: "Supabase = base de données dans le cloud. Accessible partout."
      },
      {
        title: "Les erreurs — comment les gérer",
        content: `Dans la vraie vie, des choses peuvent mal aller : pas de connexion internet, données corrompues, serveur qui répond pas.

Un bon code prévoit ces situations et les gère sans que l'app crashe.`,
        example: { bad: "const data = await supabase.from('taches').select('*')\n// Si ça plante, l'app crashe.", good: "try {\n  const { data, error } = await supabase\n    .from('taches').select('*')\n  \n  if (error) throw error\n  setTaches(data)\n} catch (err) {\n  console.log('Erreur:', err)\n  // Afficher un message à l'utilisateur\n}" },
        tip: "try/catch attrape les erreurs avant qu'elles crashent l'app."
      }
    ]
  },
  {
    id: 5, icon: "🤖", title: "L'IA dans ZenAlpha — comment Lia fonctionne",
    intro: "Lia c'est l'IA de ZenAlpha. Voici comment elle fonctionne sous le capot.",
    lessons: [
      {
        title: "Le system prompt — la personnalité de Lia",
        content: `Quand tu parles à Lia, elle reçoit deux choses : ton message ET un system prompt qu'elle lit en premier.

Le system prompt c'est comme les instructions qu'on donne à un employé le premier jour. Ça définit qui elle est, comment elle parle, ce qu'elle peut faire.`,
        example: { bad: "Lia répond de la même façon pour tout le monde.", good: 'const systemPrompt = `\nTu es Lia, assistante de ZenAlpha.\nTu aides Guillaume, entrepreneur en construction avec TDAH.\nTon ton : direct, simple, jamais condescendant.\nRègle : maximum 5 points par réponse.\nLangue : français québécois.\n`' },
        tip: "Le system prompt définit la personnalité et les règles de Lia."
      },
      {
        title: "L'API Claude — comment on parle à Lia",
        content: `Quand tu envoies un message à Lia, voici ce qui se passe :
1. Ton message part vers le serveur ZenAlpha
2. Le serveur l'envoie à l'API Claude d'Anthropic
3. Claude génère une réponse
4. La réponse revient à ton téléphone`,
        example: { bad: "L'IA est magique et on sait pas comment ça marche.", good: "const reponse = await fetch('https://api.anthropic.com/v1/messages', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    model: 'claude-sonnet-4-20250514',\n    system: systemPrompt,\n    messages: [{ role: 'user', content: tonMessage }]\n  })\n})" },
        tip: "On envoie un message, on reçoit une réponse. C'est tout."
      },
      {
        title: "Le streaming — pourquoi Lia écrit mot par mot",
        content: `Tu as remarqué que Lia écrit sa réponse mot par mot, comme si elle tapait en temps réel ? C'est le streaming.

Au lieu d'attendre que toute la réponse soit prête, on l'affiche au fur et à mesure. Ça donne l'impression que c'est plus rapide.`,
        example: { bad: "L'utilisateur attend 10 secondes en regardant un écran vide.", good: "// Avec streaming :\n// Les mots apparaissent un par un dès qu'ils arrivent\n// L'utilisateur voit la réponse se construire\n// Beaucoup moins frustrant !\n\nonChunk: (texte) => {\n  setReponse(prev => prev + texte)\n}" },
        tip: "Le streaming rend l'expérience plus naturelle et moins frustrante."
      }
    ]
  }
];

const cs = {
  page: { minHeight: "100vh", background: "#0d0d14", fontFamily: "system-ui,sans-serif", color: "#f0eeff" },
  sidebar: { width: 220, background: "#13131f", borderRight: "1px solid #2a2a40", padding: "1.25rem 1rem", position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 },
  sTitle: { fontSize: 11, fontWeight: 700, color: "#7b6fa0", letterSpacing: "0.08em", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #2a2a40" },
  modBtn: (active, done) => ({ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, border: "none", background: active ? "#2d2060" : "transparent", cursor: "pointer", color: active ? "white" : done ? "#6fcf97" : "#b0a8d0", fontSize: 12, fontWeight: active ? 600 : 400, textAlign: "left", width: "100%", marginBottom: 3 }),
  main: { flex: 1, padding: "1.75rem 2rem", maxWidth: 800, overflowY: "auto" },
  card: { background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 12, padding: "1.1rem 1.25rem", marginBottom: 12 },
  tag: { display: "inline-block", background: "#2d2060", color: "#c4b5fd", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, marginBottom: 8 },
  btn: { background: "#7c3aed", color: "white", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnO: { background: "transparent", color: "#a78bfa", border: "1px solid #3a2a5a", borderRadius: 9, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  compare: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  codeBox: (good) => ({ background: good ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${good ? "#1a3a1a" : "#3a1a1a"}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: good ? "#6fcf97" : "#f87171", fontFamily: "monospace", lineHeight: 1.7, whiteSpace: "pre-wrap" }),
  tip: { background: "#1a0d2e", border: "1px solid #3a2a5a", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#a78bfa", marginTop: 8 },
  div: { height: 1, background: "#2a2a40", margin: "1.25rem 0" },
  prog: { height: 5, background: "#2a2a40", borderRadius: 99, overflow: "hidden", marginBottom: 5 },
  progBar: (p) => ({ height: "100%", width: `${p}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: 99, transition: "width .4s" }),
};

function LessonCard({ lesson, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div style={cs.card}>
      <button onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "white" }}>📖 {lesson.title}</span>
        <span style={{ color: "#7b6fa0", fontSize: 18 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: "#b0a8d0", lineHeight: 1.75, marginBottom: 12, whiteSpace: "pre-line" }}>{lesson.content}</p>
          <div style={cs.compare}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#f87171", marginBottom: 6 }}>❌ Sans ça</p>
              <div style={cs.codeBox(false)}>{lesson.example.bad}</div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#6fcf97", marginBottom: 6 }}>✅ Avec ça</p>
              <div style={cs.codeBox(true)}>{lesson.example.good}</div>
            </div>
          </div>
          <div style={cs.tip}>💡 {lesson.tip}</div>
        </div>
      )}
    </div>
  );
}

function ModuleView({ module, onComplete, completed }) {
  const isDone = completed.includes(module.id);
  return (
    <div>
      <span style={cs.tag}>MODULE {module.id}</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 6 }}>{module.icon} {module.title}</h2>
      <p style={{ fontSize: 14, color: "#b0a8d0", lineHeight: 1.7, marginBottom: 16 }}>{module.intro}</p>
      {module.lessons.map((lesson, i) => <LessonCard key={i} lesson={lesson} index={i} />)}
      <div style={cs.div} />
      <div style={{ background: "#13131f", border: "1px solid #3a2a5a", borderRadius: 12, padding: "1.25rem" }}>
        {isDone ? (
          <p style={{ fontSize: 14, color: "#6fcf97", margin: 0 }}>✅ Module complété !</p>
        ) : (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 10 }}>Tu as lu toutes les leçons ?</p>
            <button style={cs.btn} onClick={() => onComplete(module.id)}>✅ Marquer comme complété →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Home({ onStart, completed }) {
  const pct = Math.round((completed.length / MODULES.length) * 100);
  return (
    <div>
      <span style={{ background: "#7c3aed", color: "white", borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>Pour Guillaume</span>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: "12px 0 8px" }}>Apprendre le <span style={{ color: "#a78bfa" }}>code</span></h1>
      <p style={{ fontSize: 14, color: "#b0a8d0", lineHeight: 1.7, marginBottom: 16 }}>Pas de jargon. Pas de théorie inutile. Juste ce que tu as besoin de savoir pour comprendre ZenAlpha et parler le même langage que Claude Code.</p>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "#b0a8d0" }}>Progression</span>
          <span style={{ fontSize: 12, color: "#a78bfa" }}>{completed.length}/{MODULES.length} modules</span>
        </div>
        <div style={cs.prog}><div style={cs.progBar(pct)} /></div>
      </div>
      <button style={{ ...cs.btn, fontSize: 15, padding: "12px 28px" }} onClick={onStart}>
        {completed.length > 0 ? "Continuer →" : "Commencer →"}
      </button>
      <div style={cs.div} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        {MODULES.map(m => (
          <div key={m.id} style={{ background: "#1a1a2e", border: "1px solid #2a2a40", borderRadius: 11, padding: "0.9rem 1rem", opacity: completed.includes(m.id) ? 0.6 : 1 }}>
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: "white", margin: "7px 0 3px" }}>{m.title}</p>
            <p style={{ fontSize: 11, color: "#7b6fa0" }}>{m.lessons.length} leçons</p>
            {completed.includes(m.id) && <span style={{ fontSize: 11, color: "#6fcf97" }}>✓ Complété</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Apprentissage() {
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState([]);

  function complete(id) {
    if (!completed.includes(id)) setCompleted([...completed, id]);
    if (id < MODULES.length) setCurrent(id + 1);
    else setCurrent(0);
  }

  const module = MODULES.find(m => m.id === current);
  const pct = Math.round((completed.length / MODULES.length) * 100);

  return (
    <div style={{ ...cs.page, display: "flex" }}>
      <div style={cs.sidebar}>
        <p style={cs.sTitle}>APPRENDRE LE CODE</p>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#7b6fa0" }}>{completed.length}/{MODULES.length}</span>
            <span style={{ fontSize: 10, color: "#a78bfa" }}>{pct}%</span>
          </div>
          <div style={cs.prog}><div style={cs.progBar(pct)} /></div>
        </div>
        <button style={cs.modBtn(current === 0, false)} onClick={() => setCurrent(0)}>
          🏠 Accueil
        </button>
        {MODULES.map(m => (
          <button key={m.id} style={cs.modBtn(current === m.id, completed.includes(m.id))} onClick={() => setCurrent(m.id)}>
            <span>{m.icon}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{m.title}</span>
            {completed.includes(m.id) && <span style={{ color: "#6fcf97", fontSize: 10 }}>✓</span>}
          </button>
        ))}
      </div>
      <div style={cs.main}>
        {current === 0
          ? <Home onStart={() => setCurrent(completed.length > 0 ? Math.min(...MODULES.map(m => m.id).filter(id => !completed.includes(id))) : 1)} completed={completed} />
          : module ? <ModuleView module={module} onComplete={complete} completed={completed} /> : null
        }
      </div>
    </div>
  );
}
