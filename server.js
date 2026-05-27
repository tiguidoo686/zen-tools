// Railway environment variables required:
// - ANTHROPIC_API_KEY
// - SUPABASE_URL
// - SUPABASE_KEY (anon/public key)

console.log("ENV CHECK:", process.env.PORT, process.env.ANTHROPIC_API_KEY ? "KEY OK" : "NO KEY");
console.log("Supabase URL:", process.env.SUPABASE_URL ? "OK" : "MISSING");
console.log("Supabase KEY:", process.env.SUPABASE_KEY ? "OK" : "MISSING");

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post("/api/claude", async (req, res) => {
  try {
    const { system, content } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isMultipart = Array.isArray(content);
    const hasPDF = isMultipart && content.some(b => b.type === "document");
    console.log("[claude] API key:", apiKey ? apiKey.slice(0, 10) + "..." : "MISSING");
    console.log("[claude] Vision:", isMultipart, "PDF:", hasPDF);
    const requestBody = { model: "claude-sonnet-4-6", max_tokens: 6000, system, messages: [{ role: "user", content }] };

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    if (hasPDF) headers["anthropic-beta"] = "pdfs-2024-09-25";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (!response.ok) {
      console.log("[claude] Error response:", JSON.stringify(data, null, 2));
      return res.status(response.status).json({ error: data?.error?.message || JSON.stringify(data) });
    }
    const text = (data.content || []).map((b) => b.text || "").join("");
    res.json({ text });
  } catch (err) {
    console.log("[claude] Unhandled error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const { prompt, result } = req.body;
    console.log("[history] Saving to Supabase:", { promptLen: (prompt || "").length, resultLen: (result || "").length });
    const response = await supabase
      .from("zen_tools_history")
      .insert({ prompt, result });
    console.log("[history] Supabase response:", JSON.stringify(response));
    const { error } = response;
    if (error) {
      console.log("[history] Save failed:", error.message, error.code, error.details);
      throw error;
    }
    console.log("[history] Saved successfully.");
    res.json({ ok: true });
  } catch (err) {
    console.log("[history] Save error (catch):", err.message || err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    console.log("[history] GET — querying table: zen_tools_history");
    const response = await supabase
      .from("zen_tools_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    console.log("[history] GET full response:", JSON.stringify(response));
    const { data, error } = response;
    if (error) throw error;
    console.log("[history] GET rows returned:", data ? data.length : 0);
    res.json(data);
  } catch (err) {
    console.log("[history] Fetch error:", err.message || err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history/test", async (req, res) => {
  const results = {};
  try {
    const insertResp = await supabase
      .from("zen_tools_history")
      .insert({ prompt: "[test] ping", result: "[test] pong" });
    results.insert = JSON.stringify(insertResp);
    console.log("[history/test] Insert response:", results.insert);
  } catch (err) {
    results.insertError = err.message;
    console.log("[history/test] Insert error:", err.message);
  }
  try {
    const selectResp = await supabase
      .from("zen_tools_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    results.select = JSON.stringify(selectResp);
    console.log("[history/test] Select response:", results.select);
  } catch (err) {
    results.selectError = err.message;
    console.log("[history/test] Select error:", err.message);
  }
  res.json(results);
});


app.post("/api/sessions", async (req, res) => {
  try {
    const { objective, emotional_state } = req.body;
    console.log("[sessions] Creating:", (objective || "").slice(0, 50));
    const { data, error } = await supabase.from("zen_sessions").insert({ objective, status: "active", emotional_state }).select().single();
    console.log("[sessions] Response:", JSON.stringify({ data: data?.id, error }));
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[sessions] Create error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_sessions").select("*").order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { console.log("[sessions] Fetch error:", err.message); res.status(500).json({ error: err.message }); }
});

app.patch("/api/sessions/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_sessions").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[sessions] Update error:", err.message); res.status(500).json({ error: err.message }); }
});

app.post("/api/steps", async (req, res) => {
  try {
    const { session_id, text, state = "todo", blocked_reason = null } = req.body;
    const { data, error } = await supabase.from("zen_steps").insert({ session_id, text, completed: false, state, blocked_reason }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[steps] Create error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/steps/:sessionId", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_steps").select("*").eq("session_id", req.params.sessionId).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { console.log("[steps] Fetch error:", err.message); res.status(500).json({ error: err.message }); }
});

app.patch("/api/steps/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_steps").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[steps] Update error:", err.message); res.status(500).json({ error: err.message }); }
});

app.delete("/api/steps/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("zen_steps").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { console.log("[steps] Delete error:", err.message); res.status(500).json({ error: err.message }); }
});

app.post("/api/parking", async (req, res) => {
  try {
    const { session_id, content } = req.body;
    const { data, error } = await supabase.from("zen_parking_lot").insert({ session_id, content }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[parking] Create error:", err.message); res.status(500).json({ error: err.message }); }
});

app.delete("/api/parking/session/:sessionId", async (req, res) => {
  try {
    const { error } = await supabase.from("zen_parking_lot").delete().eq("session_id", req.params.sessionId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { console.log("[parking] Clear error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/parking/:sessionId", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_parking_lot").select("*").eq("session_id", req.params.sessionId).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { console.log("[parking] Fetch error:", err.message); res.status(500).json({ error: err.message }); }
});

app.delete("/api/parking/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("zen_parking_lot").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { console.log("[parking] Delete error:", err.message); res.status(500).json({ error: err.message }); }
});

// ── Test Lab ──

app.post("/api/test-checklist", async (req, res) => {
  try {
    const { module, mode = "sandbox" } = req.body;
    if (!module) return res.status(400).json({ error: "module requis" });
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const sys = `Tu es un expert QA senior pour ZenAlpha, une application mobile React Native de gestion de construction utilisee par Guillaume, entrepreneur TDAH au Quebec.
Ton role: generer des checklists de tests EXHAUSTIVES pour le module demande.
Mode actuel: ${mode === "sandbox" ? "SANDBOX (utiliser prefix [ZEN_TEST] pour toutes les donnees creees)" : mode === "readonly" ? "LECTURE SEULE" : "DRY RUN (simulation uniquement)"}.

Reponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "module": "nom du module",
  "categories": [
    {
      "id": "ui|logic|save|validation|errors|integration|isolation",
      "name": "Libelle de la categorie en francais",
      "items": [
        { "id": "ui-1", "instruction": "Action concrete que Guillaume doit faire", "expected": "Ce qui doit se passer exactement", "risk": "low|medium|high" }
      ]
    }
  ]
}

Genere minimum 5 items par categorie. Couvre: chemin heureux, cas limites, erreurs de validation, etat vide, doublons, feedback UI, messages d erreur, scenarios hors ligne, et integrations avec autres modules.
Marque risk:high pour tout ce qui touche des donnees financieres, la paie, ou la synchronisation avec QuickBooks/Dext.
Tout test qui creerait des donnees doit specifier que le nom doit commencer par [ZEN_TEST] si mode sandbox.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 3000, system: sys, messages: [{ role: "user", content: `Genere la checklist de tests complete pour le module: ${module}` }] })
    });
    const d = await response.json();
    if (!response.ok) throw new Error(d?.error?.message || "Erreur Haiku");
    const raw = (d.content || []).map(b => b.text || "").join("");
    let checklist;
    try {
      checklist = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch { throw new Error("Reponse non parseable — reessaie"); }

    // Log to history
    try {
      await supabase.from("zen_tools_history").insert({ prompt: `[ZEN_TEST] Checklist: ${module}`, result: JSON.stringify(checklist) });
    } catch {}

    res.json(checklist);
  } catch (err) { console.log("[test-checklist] error:", err.message); res.status(500).json({ error: err.message }); }
});

// ── User Actions (zen_user_actions) ──

app.post("/api/actions", async (req, res) => {
  try {
    const { session_id, source, description, context, priority = "normale", due_hint } = req.body;
    const { data, error } = await supabase.from("zen_user_actions")
      .insert({ session_id, source, description, context, priority, status: "a_faire", due_hint })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[actions] Create error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/actions/session/:sessionId", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_user_actions").select("*")
      .eq("session_id", req.params.sessionId).order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/api/actions/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_user_actions")
      .update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/actions/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("zen_user_actions").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/actions/detect", async (req, res) => {
  try {
    const { session_id, source, text } = req.body;
    if (!session_id || !text) return res.json({ detected: 0, actions: [] });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const sys = `Analyse cette reponse de Claude Code et extrait UNIQUEMENT les actions que l'utilisateur doit faire manuellement.
Cherche: "vous devez", "il faudra", "assurez-vous", "testez manuellement", "obtenez", "configurez", "activez", "ajoutez", "lancez", "executez", "copiez", "creez manuellement".
Priorite haute si "critique", "bloquant", "avant de continuer". Basse si optionnel. Normale sinon.
Reponds UNIQUEMENT en JSON: {"actions": [{"description": "action courte", "context": "pourquoi en 1 phrase", "priority": "haute|normale|basse"}]}
Si aucune action manuelle: {"actions": []}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 600, system: sys, messages: [{ role: "user", content: text.slice(0, 4000) }] })
    });
    const d = await response.json();
    const raw = (d.content || []).map(b => b.text || "").join("");
    let actions = [];
    try {
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      actions = (parsed.actions || []).filter(a => a.description?.trim());
    } catch {}

    const created = [];
    for (const a of actions) {
      try {
        const { data, error } = await supabase.from("zen_user_actions")
          .insert({ session_id, source, description: a.description.trim(), context: a.context || "", priority: a.priority || "normale", status: "a_faire" })
          .select().single();
        if (!error && data) created.push(data);
      } catch {}
    }
    console.log(`[actions/detect] ${source}: ${created.length} actions created`);
    res.json({ detected: created.length, actions: created });
  } catch (err) { console.log("[actions/detect] error:", err.message); res.status(500).json({ error: err.message, actions: [] }); }
});

app.post("/api/analyze-response", async (req, res) => {
  try {
    const { content, context } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Contenu requis" });
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const sys = `Tu es un assistant expert pour ZenAlpha, une app React Native de gestion de construction utilisee par Guillaume au Quebec.
Il te colle une reponse de Claude Code. Analyse ce qu'elle contient.

Reponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "done": ["element clairement confirme comme complete"],
  "incomplete": ["element mentionne mais pas finalise ou qui manque des details"],
  "missing": ["element attendu mais absent de la reponse"],
  "next_recommendation": "Une seule action concrete et courte a faire maintenant (max 2 phrases)"
}

Regles:
- done: confirme explicitement par la reponse
- incomplete: partiellement traite ou sous-entendu
- missing: aurait du etre la mais ne l est pas
- next_recommendation: concrete, actionnable, en francais
- Maximum 6 items par liste
- Toujours en francais`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, system: sys, messages: [{ role: "user", content: content.slice(0, 8000) }] })
    });
    const d = await response.json();
    if (!response.ok) throw new Error(d?.error?.message || "Erreur Haiku");
    const raw = (d.content || []).map(b => b.text || "").join("");
    let result;
    try {
      result = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      result = { done: [], incomplete: [], missing: ["Impossible de parser la reponse"], next_recommendation: "Reessaie avec une reponse plus courte ou plus structuree." };
    }

    try {
      await supabase.from("zen_tools_history").insert({ prompt: content.slice(0, 200), result: JSON.stringify(result) });
    } catch {}

    res.json(result);
  } catch (err) { console.log("[analyze-response] error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/test-records", async (req, res) => {
  try {
    const { data: sessions, error: se } = await supabase.from("zen_sessions")
      .select("id, objective, created_at").ilike("objective", "[ZEN_TEST]%");
    if (se) throw se;
    const { data: history, error: he } = await supabase.from("zen_tools_history")
      .select("id, prompt, created_at").ilike("prompt", "[ZEN_TEST]%");
    if (he) throw he;
    res.json({ sessions: sessions || [], history: history || [], total: (sessions?.length || 0) + (history?.length || 0) });
  } catch (err) { console.log("[test-records] Fetch error:", err.message); res.status(500).json({ error: err.message }); }
});

app.delete("/api/test-records", async (req, res) => {
  try {
    const { data: sessions } = await supabase.from("zen_sessions").select("id").ilike("objective", "[ZEN_TEST]%");
    let deletedSessions = 0;
    if (sessions?.length) {
      const { error: de } = await supabase.from("zen_sessions").delete().ilike("objective", "[ZEN_TEST]%");
      if (de) throw de;
      deletedSessions = sessions.length;
    }
    const { data: history } = await supabase.from("zen_tools_history").select("id").ilike("prompt", "[ZEN_TEST]%");
    let deletedHistory = 0;
    if (history?.length) {
      const { error: dhe } = await supabase.from("zen_tools_history").delete().ilike("prompt", "[ZEN_TEST]%");
      if (dhe) throw dhe;
      deletedHistory = history.length;
    }
    const deleted = deletedSessions + deletedHistory;
    res.json({ deleted, sessions: deletedSessions, history: deletedHistory });
  } catch (err) { console.log("[test-records] Delete error:", err.message); res.status(500).json({ error: err.message }); }
});

// ── Test Lab Analyzer ──

app.post("/api/test-lab/analyze", async (req, res) => {
  try {
    const { prompt, response, repairOnly = false } = req.body;
    if (!prompt?.trim() || !response?.trim())
      return res.status(400).json({ error: "Prompt et réponse requis" });
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const sys = repairOnly
      ? `Tu es un expert QA pour ZenAlpha, une app React Native de gestion de construction.
L'utilisateur a envoyé un prompt à Claude Code mais la réponse est incomplète ou incorrecte.
Génère un message de réparation clair que l'utilisateur peut copier-coller à Claude Code pour corriger le problème.
Le message doit: identifier précisément ce qui manque ou est faux, demander la correction de façon directe, être en français.
Réponds UNIQUEMENT avec le message de réparation (pas de JSON, pas d'explication), max 200 mots.`
      : `Tu es un expert QA pour ZenAlpha, une app React Native de gestion de construction au Québec.
Analyse si la réponse de Claude Code répond correctement au prompt de l'utilisateur.
Évalue selon 7 catégories et réponds UNIQUEMENT en JSON valide:
{
  "verdict": "PASS|FAIL",
  "score": { "passed": number, "total": 7 },
  "tests": {
    "completeness": [{ "label": "texte", "status": "pass|fail|warn", "detail": "explication courte si fail/warn" }],
    "file_integrity": [{ "label": "texte", "status": "pass|fail|warn", "detail": "..." }],
    "architecture": [{ "label": "texte", "status": "pass|fail|warn", "detail": "..." }],
    "dependencies": [{ "label": "texte", "status": "pass|fail|warn", "detail": "..." }],
    "logic": [{ "label": "texte", "status": "pass|fail|warn", "detail": "..." }],
    "missing_pieces": [{ "label": "texte", "status": "pass|fail|warn", "detail": "..." }],
    "dangerous_patterns": [{ "label": "texte", "status": "pass|fail|warn", "detail": "..." }]
  },
  "problems": [{ "title": "titre court", "description": "explication", "fix": "correction suggérée" }],
  "repair_message": "message prêt à copier-coller à Claude Code si des problèmes existent, sinon chaîne vide"
}
Règles: verdict PASS si 5+ catégories vertes, FAIL sinon. problems: max 5 entrées pour les cas fail/warn. repair_message: max 150 mots, en français, directement actionnable.`;

    const userMsg = repairOnly
      ? `PROMPT ORIGINAL:\n${prompt.slice(0, 3000)}\n\nRÉPONSE CLAUDE CODE:\n${response.slice(0, 5000)}`
      : `PROMPT DE L'UTILISATEUR:\n${prompt.slice(0, 3000)}\n\nRÉPONSE DE CLAUDE CODE:\n${response.slice(0, 5000)}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2000, system: sys, messages: [{ role: "user", content: userMsg }] }),
    });
    const d = await apiRes.json();
    if (!apiRes.ok) throw new Error(d?.error?.message || "Erreur Haiku");
    const raw = (d.content || []).map(b => b.text || "").join("");

    if (repairOnly) {
      return res.json({ repair_message: raw.trim() });
    }

    let result;
    try {
      result = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      return res.status(500).json({ error: "Réponse non parseable — réessaie" });
    }

    try {
      const promptSummary = prompt.slice(0, 120);
      const scorePassed = result.score?.passed ?? 0;
      const scoreTotal = result.score?.total ?? 7;
      await supabase.from("zen_test_history").insert({
        prompt_summary: promptSummary,
        score_passed: scorePassed,
        score_total: scoreTotal,
        verdict: result.verdict,
        problems: result.problems || [],
        repair_message: result.repair_message || "",
      });
    } catch {}

    res.json(result);
  } catch (err) {
    console.log("[test-lab/analyze] error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/test-lab/history", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("zen_test_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.log("[test-lab/history] error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── TestLab endpoints ──

const ALLOWED_TABLES = new Set([
  "entrees_heures", "depenses", "factures", "facture_lignes",
  "rappels", "chantier", "emails_cache", "quickbooks_tokens",
  "conversation", "employes", "clients", "memoire_resumee",
  "zen_sessions", "zen_steps", "zen_parking_lot",
  "zen_tools_history", "zen_user_actions", "zen_test_history",
]);

const ZENALPHA_URL = process.env.ZENALPHA_URL || "https://urbanfinancialseahorse-production.up.railway.app";
const ZENALPHA_SECRET = process.env.ZENALPHA_APP_SECRET || "5c05c08659e9ff6c6f886575d98df646b1cdeca218ac0647";

app.post("/testlab/verify-db", async (req, res) => {
  try {
    const { table, conditions = {}, requiredColumns = [], nullColumns = [], forbiddenValues = {}, timeWindow, maxRowCount, requiredValues = {} } = req.body;

    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: "Table non autorisée", table, pass: false });
    }

    let query = supabase.from(table).select("*");

    if (timeWindow) {
      const since = new Date(Date.now() - Number(timeWindow) * 1000).toISOString();
      query = query.gte("created_at", since);
    }

    for (const [key, value] of Object.entries(conditions)) {
      if (key === "heure_fin_not_null" && value === true) {
        query = query.not("heure_fin", "is", null);
      } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        query = query.eq(key, value);
      }
    }

    query = query.order("created_at", { ascending: false }).limit(maxRowCount ? maxRowCount + 1 : 5);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const found = rows.length > 0;
    const row = rows[0] || null;

    const missingColumns = [];
    if (row) {
      for (const col of requiredColumns) {
        const v = row[col];
        if (v === null || v === undefined || v === "" || v === "undefined" || v === "null") {
          missingColumns.push(col);
        }
      }
    }

    const forbiddenFound = [];
    if (row) {
      for (const [col, badValues] of Object.entries(forbiddenValues)) {
        const rv = row[col];
        if (badValues.includes(rv)) forbiddenFound.push(`${col} = ${JSON.stringify(rv)}`);
      }
    }

    const missingRequiredValues = [];
    if (row) {
      for (const [col, expected] of Object.entries(requiredValues)) {
        if (row[col] !== expected) missingRequiredValues.push(`${col} attendu ${expected}, trouvé ${row[col]}`);
      }
    }

    const pass = found && missingColumns.length === 0 && forbiddenFound.length === 0 && missingRequiredValues.length === 0;
    res.json({ found, row, rows, rowCount: rows.length, missingColumns, forbiddenFound, missingRequiredValues, pass });
  } catch (err) {
    console.log("[testlab/verify-db] error:", err.message);
    res.status(500).json({ error: err.message, pass: false });
  }
});

app.post("/testlab/verify-api", async (req, res) => {
  try {
    const { endpoint, method = "GET", payload, expectedFields = [], forbiddenValues = {} } = req.body;
    if (!endpoint) return res.status(400).json({ error: "endpoint requis", pass: false });

    const url = endpoint.startsWith("http") ? endpoint : `${ZENALPHA_URL}${endpoint}`;
    const start = Date.now();

    const fetchRes = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-app-secret": ZENALPHA_SECRET },
      ...(payload && method !== "GET" ? { body: JSON.stringify(payload) } : {}),
    });

    const durationMs = Date.now() - start;
    let responseBody;
    try { responseBody = await fetchRes.json(); } catch { responseBody = { _raw: await fetchRes.text().catch(() => "") }; }

    const missingFields = [];
    for (const field of expectedFields) {
      const v = responseBody[field];
      if (v === null || v === undefined) missingFields.push(field);
    }

    const forbiddenFound = [];
    for (const [field, badValues] of Object.entries(forbiddenValues)) {
      if (badValues.includes(responseBody[field])) forbiddenFound.push(`${field} = ${JSON.stringify(responseBody[field])}`);
    }

    const pass = fetchRes.ok && missingFields.length === 0 && forbiddenFound.length === 0;
    res.json({ statusCode: fetchRes.status, responseBody, missingFields, forbiddenFound, pass, durationMs });
  } catch (err) {
    console.log("[testlab/verify-api] error:", err.message);
    res.status(500).json({ error: err.message, pass: false, durationMs: 0 });
  }
});

app.post("/testlab/generate", async (req, res) => {
  try {
    const { featureDescription, context } = req.body;
    if (!featureDescription?.trim()) return res.status(400).json({ error: "featureDescription requis" });
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const sys = `Tu es un expert QA pour ZenAlpha, une app React Native de gestion de construction au Québec.
Génère un TestCase JSON complet pour tester la fonctionnalité décrite.
Structure JSON exacte (réponds UNIQUEMENT avec ce JSON):
{
  "id": "auto-PLACEHOLDER",
  "name": "Nom court du test en français",
  "category": "heures|depenses|factures|rappels|chantiers|emails|quickbooks|conversations|outils",
  "steps": [
    { "order": 1, "action": "message|wait|db|api", "description": "Description de l'étape en français", "payload": { "message": "texte" } },
    { "order": 2, "action": "wait", "description": "Attendre X secondes", "payload": { "seconds": 3 } },
    { "order": 3, "action": "db", "description": "Vérifier en base de données", "sqlVerification": { "table": "nom_table", "timeWindow": 60, "requiredColumns": ["col1", "col2"], "forbiddenValues": { "col1": [null, "undefined"] } } }
  ],
  "expectedResult": {
    "description": "Ce qui doit se passer en français",
    "supabaseTable": "nom_table",
    "requiredColumns": ["col1"],
    "forbiddenValues": { "id": [null] }
  }
}
Règles: minimum 3 steps, au moins 1 step db avec sqlVerification, au moins 1 forbiddenValues.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 1500, system: sys,
        messages: [{ role: "user", content: `Fonctionnalité: ${featureDescription}\nContexte: ${context || "ZenAlpha app de gestion de construction"}` }]
      })
    });

    const d = await response.json();
    if (!response.ok) throw new Error(d?.error?.message || "Erreur Haiku");
    const raw = (d.content || []).map(b => b.text || "").join("");

    let testCase;
    try { testCase = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); }
    catch { throw new Error("Réponse non parseable — réessaie"); }

    testCase.id = `auto-${Date.now()}`;
    res.json(testCase);
  } catch (err) {
    console.log("[testlab/generate] error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/testlab/export-master", async (req, res) => {
  try {
    const { content, section } = req.body;
    const { readFile, writeFile } = await import("fs/promises");
    const masterPath = join(__dirname, "MASTER.md");
    let existing = "";
    try { existing = await readFile(masterPath, "utf8"); } catch {}
    const appendText = `\n---\n<!-- Ajouté automatiquement le ${new Date().toISOString()} — Section ${section} -->\n${content}\n`;
    await writeFile(masterPath, existing + appendText);
    res.json({ ok: true });
  } catch (err) {
    console.log("[testlab/export-master] error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(join(__dirname, "dist")));
app.get("/{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
