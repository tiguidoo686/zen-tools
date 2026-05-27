import { eventBus } from "./eventBus.js";
import { TEST_SUITES } from "../data/testSuites.js";

let _isRunningAll = false;

// ─── Validation helpers ────────────────────────────────────────────────────────

const BAD_STRING_VALUES = ["undefined", "null", "NaN", "[object Object]"];

function findBadStrings(row) {
  if (!row || typeof row !== "object") return [];
  return Object.entries(row)
    .filter(([, v]) => typeof v === "string" && BAD_STRING_VALUES.includes(v))
    .map(([k, v]) => `${k} = "${v}"`);
}

function isFutureDate(row) {
  if (!row?.created_at) return false;
  return new Date(row.created_at).getTime() > Date.now() + 60000;
}

// ─── Step executor ─────────────────────────────────────────────────────────────

async function executeStep(step) {
  const start = Date.now();

  try {
    // Wait step
    if (step.action === "wait") {
      await new Promise(r => setTimeout(r, (step.payload?.seconds || 2) * 1000));
      return { order: step.order, action: step.action, description: step.description, pass: true, durationMs: Date.now() - start };
    }

    // Message step — proxy through verify-api to ZenAlpha chat
    if (step.action === "message") {
      const res = await fetch("/testlab/verify-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/mini-chat",
          method: "POST",
          payload: step.payload || {},
          expectedFields: [],
          forbiddenValues: {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      const pass = res.ok && data.statusCode >= 200 && data.statusCode < 300;
      return {
        order: step.order, action: step.action, description: step.description,
        pass,
        durationMs: data.durationMs || (Date.now() - start),
        rawPayload: data.responseBody,
        failReason: !pass ? `ZenAlpha a répondu avec le statut HTTP ${data.statusCode || "inconnu"}` : undefined,
      };
    }

    // DB verification step — Rule 9: only PASS with HTTP 200
    if (step.action === "db") {
      const sv = step.sqlVerification || {};
      const res = await fetch("/testlab/verify-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sv),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { order: step.order, action: step.action, description: step.description, pass: false, durationMs: Date.now() - start, failReason: err.error || `Erreur serveur HTTP ${res.status}` };
      }
      const data = await res.json();

      const allFails = [];

      // Rule 5: row count must not be 0 for creation checks
      if (!data.found) allFails.push("Aucune ligne trouvée en base de données — l'enregistrement n'a pas été créé");

      if (data.row) {
        // Rule 2: no bad string values
        const badStrings = findBadStrings(data.row);
        if (badStrings.length > 0) allFails.push(`Valeurs invalides détectées: ${badStrings.join(", ")}`);

        // Rule 3: created_at not in future
        if (isFutureDate(data.row)) allFails.push("created_at est dans le futur (> 60 secondes)");

        // Rule 6: no null id
        if (data.row.id === null || data.row.id === undefined) allFails.push("L'identifiant (id) de la ligne est null");

        // Rule 4: monetary amounts not zero when non-zero expected
        const moneyFields = ["montant", "montant_total", "duree_heures", "total_ht", "total_ttc"];
        for (const field of moneyFields) {
          if (sv.requiredValues?.[field] !== undefined && sv.requiredValues[field] !== 0 && data.row[field] === 0) {
            allFails.push(`${field} est 0 alors qu'une valeur non-nulle était attendue`);
          }
        }

        // Rule 7: duplicate detection — if maxRowCount is set, enforce it
        if (sv.maxRowCount && data.rowCount > sv.maxRowCount) {
          allFails.push(`Doublon détecté — ${data.rowCount} lignes trouvées, maximum ${sv.maxRowCount} attendu`);
        }
      }

      // Missing columns and forbidden values from server response
      if (data.missingColumns?.length > 0) allFails.push(`Colonnes manquantes ou vides: ${data.missingColumns.join(", ")}`);
      if (data.forbiddenFound?.length > 0) allFails.push(`Valeurs interdites trouvées: ${data.forbiddenFound.join(", ")}`);

      const pass = data.pass && allFails.length === 0;
      return {
        order: step.order, action: step.action, description: step.description,
        pass,
        durationMs: Date.now() - start,
        rawPayload: data.row,
        missingColumns: data.missingColumns || [],
        forbiddenFound: data.forbiddenFound || [],
        rowCount: data.rowCount || 0,
        failReason: allFails.length > 0 ? allFails[0] : undefined,
      };
    }

    // API verification step
    if (step.action === "api") {
      const av = step.apiVerification || {};
      const res = await fetch("/testlab/verify-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(av),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { order: step.order, action: step.action, description: step.description, pass: false, durationMs: Date.now() - start, failReason: err.error || "Erreur du serveur de vérification API" };
      }
      const data = await res.json();
      return {
        order: step.order, action: step.action, description: step.description,
        pass: !!data.pass,
        durationMs: data.durationMs || (Date.now() - start),
        rawPayload: data.responseBody,
        missingColumns: data.missingFields || [],
        forbiddenFound: data.forbiddenFound || [],
        failReason: !data.pass ? (data.missingFields?.length ? `Champs manquants dans la réponse: ${data.missingFields.join(", ")}` : `L'API a répondu avec le statut ${data.statusCode}`) : undefined,
      };
    }

    return { order: step.order, action: step.action, description: step.description, pass: false, durationMs: Date.now() - start, failReason: `Action inconnue: ${step.action}` };
  } catch (err) {
    return { order: step.order, action: step.action, description: step.description, pass: false, durationMs: Date.now() - start, failReason: `Erreur inattendue: ${err.message}` };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runTest(testCase) {
  const startTime = Date.now();
  const stepResults = [];

  try {
    for (const step of (testCase.steps || [])) {
      const result = await executeStep(step);
      stepResults.push(result);
      // Rule 1: continue collecting all step results even after a failure (for full diagnostics)
    }

    const allStepsPassed = stepResults.every(s => s.pass);
    const firstFail = stepResults.find(s => !s.pass);

    const run = {
      timestamp: new Date().toISOString(),
      status: allStepsPassed ? "PASS" : "FAIL",
      actualResult: allStepsPassed
        ? "Toutes les vérifications ont réussi"
        : (firstFail?.failReason || "Une ou plusieurs étapes ont échoué"),
      rawPayload: stepResults,
      failReason: !allStepsPassed ? (firstFail?.failReason || "Échec d'une étape") : undefined,
      durationMs: Date.now() - startTime,
      stepResults,
    };

    // Rule 10: always log regardless of outcome
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[testlab] ${testCase.name}`,
          result: JSON.stringify({ status: run.status, failReason: run.failReason, durationMs: run.durationMs }),
        }),
      });
    } catch {}

    // Emit real-time event
    eventBus.emit("testCompleted", { testCase, run });

    return run;
  } catch (err) {
    const run = {
      timestamp: new Date().toISOString(),
      status: "FAIL",
      actualResult: err.message,
      rawPayload: stepResults,
      failReason: `Erreur inattendue: ${err.message}`,
      durationMs: Date.now() - startTime,
      stepResults,
    };
    // Rule 10
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `[testlab] ${testCase.name}`, result: JSON.stringify({ status: "FAIL", failReason: run.failReason }) }),
      });
    } catch {}
    eventBus.emit("testCompleted", { testCase, run });
    return run;
  }
}

export async function runSuite(suite) {
  const results = [];
  for (const testCase of (suite.tests || [])) {
    const run = await runTest(testCase);
    results.push({ testCase, run });
  }
  return results;
}

export async function runAll() {
  // Prevent concurrent full runs
  if (_isRunningAll) {
    throw new Error("Une exécution complète est déjà en cours. Veuillez attendre qu'elle se termine.");
  }
  _isRunningAll = true;
  const report = {};
  try {
    for (const suite of TEST_SUITES) {
      report[suite.id] = await runSuite(suite);
    }
    return report;
  } finally {
    _isRunningAll = false;
  }
}

export function getIsRunningAll() {
  return _isRunningAll;
}
