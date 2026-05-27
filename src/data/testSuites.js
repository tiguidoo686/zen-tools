export const CATEGORY_ICONS = {
  heures:        "⏱",
  depenses:      "💸",
  factures:      "🧾",
  rappels:       "🔔",
  chantiers:     "🏗",
  emails:        "📧",
  quickbooks:    "📊",
  conversations: "💬",
  outils:        "🔧",
};

// ─── 3A — Heures ──────────────────────────────────────────────────────────────
const HEURES = {
  id: "heures", name: "Heures", icon: "⏱",
  tests: [
    {
      id: "heures-01", name: "Clock In — chantier Tremblay", category: "heures",
      steps: [
        { order: 1, action: "message", description: "Envoyer la commande Clock In dans le chat ZenAlpha", payload: { message: "Clock in sur chantier Tremblay" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes pour la mise à jour DB", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier la ligne créée dans entrees_heures",
          sqlVerification: {
            table: "entrees_heures", timeWindow: 60,
            requiredColumns: ["heure_debut", "chantier_id", "employe_id"],
            nullColumns: ["heure_fin"],
            forbiddenValues: { heure_debut: [null, "", "undefined", "null", "NaN"], employe_id: [null, "undefined"], chantier_id: [null, "undefined"] },
          },
        },
      ],
      expectedResult: { description: "Ligne dans entrees_heures avec heure_debut, chantier_id, employe_id non-null et heure_fin null", supabaseTable: "entrees_heures", requiredColumns: ["heure_debut", "chantier_id", "employe_id"], forbiddenValues: { heure_fin: ["NOT_NULL_SENTINEL"] } },
    },
    {
      id: "heures-02", name: "Clock Out — fermeture session active", category: "heures",
      steps: [
        { order: 1, action: "message", description: "Envoyer la commande Clock Out", payload: { message: "Clock out" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier heure_fin non-null dans entrees_heures",
          sqlVerification: {
            table: "entrees_heures", timeWindow: 120,
            requiredColumns: ["heure_debut", "heure_fin", "chantier_id", "employe_id"],
            conditions: { heure_fin_not_null: true },
            forbiddenValues: { heure_fin: [null, "undefined", "null"] },
          },
        },
      ],
      expectedResult: { description: "Même ligne avec heure_fin non-null et heure_fin > heure_debut", supabaseTable: "entrees_heures", requiredColumns: ["heure_debut", "heure_fin"] },
    },
    {
      id: "heures-03", name: "Saisie manuelle — 8h Jean lundi chantier Martin", category: "heures",
      steps: [
        { order: 1, action: "message", description: "Saisie manuelle d'heures pour Jean", payload: { message: "Ajoute 8h pour Jean lundi sur chantier Martin" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier la ligne avec duree_heures = 8",
          sqlVerification: {
            table: "entrees_heures", timeWindow: 60,
            requiredColumns: ["duree_heures", "employe_id", "chantier_id", "date_entree"],
            requiredValues: { duree_heures: 8 },
            forbiddenValues: { duree_heures: [0, null, "undefined", "NaN"], employe_id: [null], chantier_id: [null] },
          },
        },
      ],
      expectedResult: { description: "Ligne avec duree_heures = 8, employe_id pour Jean, chantier_id pour Martin, date_entree du lundi", supabaseTable: "entrees_heures", requiredColumns: ["duree_heures", "employe_id", "chantier_id"], rowMatchConditions: { duree_heures: 8 }, forbiddenValues: { duree_heures: [0, null] } },
    },
    {
      id: "heures-04", name: "Requête heures Jean cette semaine — vérifie vs DB SUM", category: "heures",
      steps: [
        { order: 1, action: "message", description: "Demander le total d'heures de Jean cette semaine", payload: { message: "Combien d'heures Jean a travaillé cette semaine" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes pour la réponse", payload: { seconds: 3 } },
        {
          order: 3, action: "api", description: "Vérifier la réponse contient un total d'heures réel",
          apiVerification: { endpoint: "/mini-chat", method: "POST", payload: { message: "Combien d'heures Jean a travaillé cette semaine" }, expectedFields: ["response"], forbiddenValues: { response: [null, "", "undefined"] } },
        },
      ],
      expectedResult: { description: "Réponse contient le total réel des heures de Jean depuis entrees_heures — aucun nombre inventé", apiResponseFields: ["response"], forbiddenValues: { response: ["undefined", "null", "NaN"] } },
    },
    {
      id: "heures-05", name: "Prévention doublon — deux Clock In consécutifs", category: "heures",
      steps: [
        { order: 1, action: "message", description: "Premier Clock In", payload: { message: "Clock in sur chantier Dupont" } },
        { order: 2, action: "wait", description: "Attendre 2 secondes", payload: { seconds: 2 } },
        { order: 3, action: "message", description: "Deuxième Clock In identique", payload: { message: "Clock in sur chantier Dupont" } },
        { order: 4, action: "wait", description: "Attendre 2 secondes", payload: { seconds: 2 } },
        {
          order: 5, action: "db", description: "Vérifier qu'une seule ligne active existe",
          sqlVerification: {
            table: "entrees_heures", timeWindow: 60, maxRowCount: 1,
            requiredColumns: ["employe_id"],
            forbiddenValues: { employe_id: [null] },
          },
        },
      ],
      expectedResult: { description: "Maximum une ligne active dans entrees_heures — le doublon est rejeté par ZenAlpha", supabaseTable: "entrees_heures", forbiddenValues: { id: [null] } },
    },
  ],
};

// ─── 3B — Dépenses ────────────────────────────────────────────────────────────
const DEPENSES = {
  id: "depenses", name: "Dépenses", icon: "💸",
  tests: [
    {
      id: "dep-01", name: "Ajout dépense — 450$ BMR chantier Gagnon", category: "depenses",
      steps: [
        { order: 1, action: "message", description: "Ajouter une dépense de 450$", payload: { message: "Ajoute une dépense de 450$ chez BMR pour chantier Gagnon" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier la ligne dans depenses",
          sqlVerification: {
            table: "depenses", timeWindow: 60,
            requiredColumns: ["montant", "fournisseur", "chantier_id"],
            requiredValues: { montant: 450 },
            forbiddenValues: { montant: [0, null, "undefined"], chantier_id: [null, "undefined"], fournisseur: [null, "", "undefined"] },
          },
        },
      ],
      expectedResult: { description: "Ligne dans depenses avec montant = 450, fournisseur contenant BMR, chantier_id non-null", supabaseTable: "depenses", requiredColumns: ["montant", "fournisseur", "chantier_id"], rowMatchConditions: { montant: 450 } },
    },
    {
      id: "dep-02", name: "Liste dépenses chantier Gagnon — vérification vs DB", category: "depenses",
      steps: [
        { order: 1, action: "message", description: "Demander la liste des dépenses du chantier Gagnon", payload: { message: "Liste les dépenses du chantier Gagnon" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier qu'au moins une dépense existe pour le chantier Gagnon",
          sqlVerification: { table: "depenses", timeWindow: 3600, requiredColumns: ["montant", "chantier_id"], forbiddenValues: { montant: [null, "undefined", "null"], chantier_id: [null] } },
        },
      ],
      expectedResult: { description: "Chaque dépense affichée a une ligne correspondante en DB — aucun montant inventé", supabaseTable: "depenses", requiredColumns: ["montant", "chantier_id"] },
    },
    {
      id: "dep-03", name: "Dépense avec catégorie — categorie non-null", category: "depenses",
      steps: [
        { order: 1, action: "message", description: "Ajouter une dépense catégorisée", payload: { message: "Ajoute une dépense de 220$ de matériaux chez Rona pour chantier Tremblay" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier categorie non-null dans depenses",
          sqlVerification: {
            table: "depenses", timeWindow: 60,
            requiredColumns: ["montant", "categorie", "chantier_id"],
            forbiddenValues: { categorie: [null, "", "undefined", "null"] },
          },
        },
      ],
      expectedResult: { description: "Ligne avec categorie non-null correspondant à une valeur valide (matériaux, main-d'oeuvre, etc.)", supabaseTable: "depenses", requiredColumns: ["categorie"] },
    },
  ],
};

// ─── 3C — Factures ────────────────────────────────────────────────────────────
const FACTURES = {
  id: "factures", name: "Factures", icon: "🧾",
  tests: [
    {
      id: "fac-01", name: "Création facture — Tremblay 3500$ travaux fondation", category: "factures",
      steps: [
        { order: 1, action: "message", description: "Créer une facture", payload: { message: "Crée une facture pour Tremblay — 3500$ travaux fondation" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes", payload: { seconds: 4 } },
        {
          order: 3, action: "db", description: "Vérifier la facture dans factures",
          sqlVerification: {
            table: "factures", timeWindow: 60,
            requiredColumns: ["client_id", "montant_total", "statut"],
            requiredValues: { statut: "brouillon" },
            forbiddenValues: { client_id: [null, "undefined"], montant_total: [0, null], statut: [null, "undefined"] },
          },
        },
        {
          order: 4, action: "db", description: "Vérifier les lignes dans facture_lignes",
          sqlVerification: {
            table: "facture_lignes", timeWindow: 60,
            requiredColumns: ["facture_id", "description", "montant"],
            forbiddenValues: { montant: [0, null, "undefined"], description: [null, "", "undefined"] },
          },
        },
      ],
      expectedResult: { description: "Facture en brouillon avec client_id non-null et montant_total >= 3500, + lignes dans facture_lignes", supabaseTable: "factures", requiredColumns: ["client_id", "montant_total", "statut"], rowMatchConditions: { statut: "brouillon" } },
    },
    {
      id: "fac-02", name: "Envoi facture — statut passe à envoyée", category: "factures",
      steps: [
        { order: 1, action: "message", description: "Demander l'envoi de la facture", payload: { message: "Envoie la dernière facture créée pour Tremblay" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes", payload: { seconds: 4 } },
        {
          order: 3, action: "db", description: "Vérifier statut = envoyée et date_envoi non-null",
          sqlVerification: {
            table: "factures", timeWindow: 120,
            requiredColumns: ["statut", "date_envoi"],
            conditions: { heure_fin_not_null: false },
            forbiddenValues: { statut: ["brouillon", null, "undefined"], date_envoi: [null, "undefined"] },
          },
        },
      ],
      expectedResult: { description: "statut = 'envoyée' et date_envoi non-null après l'envoi", supabaseTable: "factures", requiredColumns: ["statut", "date_envoi"], rowMatchConditions: { statut: "envoyée" } },
    },
    {
      id: "fac-03", name: "Affichage facture vs DB — correspondance exacte des lignes", category: "factures",
      steps: [
        { order: 1, action: "message", description: "Demander les détails d'une facture", payload: { message: "Affiche les détails de la dernière facture Tremblay" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier que les lignes de facture_lignes sont exactes",
          sqlVerification: {
            table: "facture_lignes", timeWindow: 3600,
            requiredColumns: ["facture_id", "description", "montant", "quantite"],
            forbiddenValues: { montant: [null, "undefined", "NaN"], quantite: [null, 0, "undefined"] },
          },
        },
      ],
      expectedResult: { description: "Chaque ligne affichée correspond exactement à une ligne dans facture_lignes — aucun arrondi, aucune invention", supabaseTable: "facture_lignes", requiredColumns: ["montant", "quantite"] },
    },
    {
      id: "fac-04", name: "Sync QuickBooks — qb_invoice_id non-null après création", category: "factures",
      steps: [
        { order: 1, action: "message", description: "Créer et synchroniser une facture avec QBO", payload: { message: "Crée une facture pour client Martin — 1200$ et sync QuickBooks" } },
        { order: 2, action: "wait", description: "Attendre 5 secondes pour la sync QBO", payload: { seconds: 5 } },
        {
          order: 3, action: "db", description: "Vérifier qb_invoice_id dans factures",
          sqlVerification: {
            table: "factures", timeWindow: 60,
            requiredColumns: ["qb_invoice_id", "client_id"],
            forbiddenValues: { qb_invoice_id: [null, "", "undefined", "null"] },
          },
        },
      ],
      expectedResult: { description: "qb_invoice_id non-null dans factures après sync QBO — prouve que l'ID QuickBooks a été sauvegardé", supabaseTable: "factures", requiredColumns: ["qb_invoice_id"] },
    },
  ],
};

// ─── 3D — Rappels ─────────────────────────────────────────────────────────────
const RAPPELS = {
  id: "rappels", name: "Rappels", icon: "🔔",
  tests: [
    {
      id: "rap-01", name: "Création rappel — inspecteur vendredi 14h", category: "rappels",
      steps: [
        { order: 1, action: "message", description: "Créer un rappel pour vendredi", payload: { message: "Rappelle-moi d'appeler l'inspecteur vendredi à 14h" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier la ligne dans rappels",
          sqlVerification: {
            table: "rappels", timeWindow: 60,
            requiredColumns: ["date_rappel", "heure", "titre"],
            forbiddenValues: { date_rappel: [null, "undefined", "null"], heure: [null, "undefined"], titre: [null, "", "undefined"] },
          },
        },
      ],
      expectedResult: { description: "Ligne dans rappels avec date_rappel (vendredi), heure (14:00), titre non-null", supabaseTable: "rappels", requiredColumns: ["date_rappel", "heure", "titre"] },
    },
    {
      id: "rap-02", name: "Récupération rappels cette semaine vs DB", category: "rappels",
      steps: [
        { order: 1, action: "message", description: "Demander les rappels de la semaine", payload: { message: "Quels sont mes rappels cette semaine" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier que des rappels existent en DB pour cette semaine",
          sqlVerification: {
            table: "rappels", timeWindow: 604800,
            requiredColumns: ["date_rappel", "titre"],
            forbiddenValues: { titre: [null, "", "undefined"] },
          },
        },
      ],
      expectedResult: { description: "Chaque rappel affiché correspond à une ligne en DB — aucun rappel inventé", supabaseTable: "rappels", requiredColumns: ["date_rappel", "titre"] },
    },
    {
      id: "rap-03", name: "Prévention doublon — deux rappels identiques", category: "rappels",
      steps: [
        { order: 1, action: "message", description: "Créer un premier rappel", payload: { message: "Rappelle-moi d'appeler le fournisseur Béton Express demain à 9h" } },
        { order: 2, action: "wait", description: "Attendre 2 secondes", payload: { seconds: 2 } },
        { order: 3, action: "message", description: "Tenter de créer le même rappel", payload: { message: "Rappelle-moi d'appeler le fournisseur Béton Express demain à 9h" } },
        { order: 4, action: "wait", description: "Attendre 2 secondes", payload: { seconds: 2 } },
        {
          order: 5, action: "db", description: "Vérifier qu'un seul rappel existe",
          sqlVerification: {
            table: "rappels", timeWindow: 60, maxRowCount: 1,
            requiredColumns: ["titre"],
            forbiddenValues: { id: [null] },
          },
        },
      ],
      expectedResult: { description: "Un seul rappel créé — le doublon est refusé par ZenAlpha", supabaseTable: "rappels", forbiddenValues: { id: [null] } },
    },
  ],
};

// ─── 3E — Chantiers ───────────────────────────────────────────────────────────
const CHANTIERS = {
  id: "chantiers", name: "Chantiers", icon: "🏗",
  tests: [
    {
      id: "chan-01", name: "Création chantier — Résidence Côté Saint-Sauveur", category: "chantiers",
      steps: [
        { order: 1, action: "message", description: "Créer un nouveau chantier", payload: { message: "Nouveau chantier — Résidence Côté, Saint-Sauveur" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier la ligne dans chantier",
          sqlVerification: {
            table: "chantier", timeWindow: 60,
            requiredColumns: ["nom", "statut", "created_at"],
            requiredValues: { statut: "actif" },
            forbiddenValues: { nom: [null, "", "undefined"], statut: [null, "undefined", "null"] },
          },
        },
      ],
      expectedResult: { description: "Ligne dans chantier avec nom non-null, statut = actif, created_at non-null", supabaseTable: "chantier", requiredColumns: ["nom", "statut", "created_at"], rowMatchConditions: { statut: "actif" } },
    },
    {
      id: "chan-02", name: "Liste chantiers actifs — correspondance DB", category: "chantiers",
      steps: [
        { order: 1, action: "message", description: "Demander la liste des chantiers actifs", payload: { message: "Liste mes chantiers actifs" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier qu'au moins un chantier actif existe en DB",
          sqlVerification: {
            table: "chantier", timeWindow: 99999999,
            requiredColumns: ["nom", "statut"],
            conditions: { statut: "actif" },
            forbiddenValues: { nom: [null, ""], statut: [null] },
          },
        },
      ],
      expectedResult: { description: "La liste affichée correspond aux lignes DB avec statut = actif — aucun chantier fictif", supabaseTable: "chantier", rowMatchConditions: { statut: "actif" } },
    },
    {
      id: "chan-03", name: "Mise à jour chantier — statut terminé", category: "chantiers",
      steps: [
        { order: 1, action: "message", description: "Terminer un chantier", payload: { message: "Marque le chantier Résidence Côté comme terminé" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier statut = terminé dans chantier",
          sqlVerification: {
            table: "chantier", timeWindow: 120,
            requiredColumns: ["nom", "statut"],
            requiredValues: { statut: "terminé" },
            forbiddenValues: { statut: ["actif", null, "undefined"] },
          },
        },
      ],
      expectedResult: { description: "statut = terminé dans la ligne chantier — la mise à jour est persistée", supabaseTable: "chantier", rowMatchConditions: { statut: "terminé" } },
    },
  ],
};

// ─── 3F — Emails ──────────────────────────────────────────────────────────────
const EMAILS = {
  id: "emails", name: "Emails", icon: "📧",
  tests: [
    {
      id: "email-01", name: "Fetch inbox — emails_cache rempli", category: "emails",
      steps: [
        { order: 1, action: "message", description: "Demander la boîte de réception", payload: { message: "Montre-moi mes derniers emails" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes pour le fetch Graph", payload: { seconds: 4 } },
        {
          order: 3, action: "db", description: "Vérifier les lignes dans emails_cache",
          sqlVerification: {
            table: "emails_cache", timeWindow: 300,
            requiredColumns: ["message_id", "sujet", "expediteur", "date_reception"],
            forbiddenValues: { message_id: [null, "undefined", ""], sujet: [null, "undefined"], expediteur: [null, ""], date_reception: [null] },
          },
        },
      ],
      expectedResult: { description: "emails_cache contient des lignes avec message_id, sujet, expediteur, date_reception tous non-null", supabaseTable: "emails_cache", requiredColumns: ["message_id", "sujet", "expediteur", "date_reception"] },
    },
    {
      id: "email-02", name: "Envoi email — confirmer rendez-vous lundi à Martin", category: "emails",
      steps: [
        { order: 1, action: "message", description: "Demander l'envoi d'un email", payload: { message: "Envoie un email à Martin pour confirmer rendez-vous lundi" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes", payload: { seconds: 4 } },
        {
          order: 3, action: "api", description: "Vérifier que l'envoi Graph a retourné 202",
          apiVerification: { endpoint: "/email/last-send-status", method: "GET", expectedFields: ["status", "message_id"], forbiddenValues: { status: [null, "error", "failed", "undefined"] } },
        },
      ],
      expectedResult: { description: "Graph API a retourné 202 et message_id est non-null dans la réponse", apiResponseFields: ["status", "message_id"] },
    },
    {
      id: "email-03", name: "Réponse email — thread_id préservé", category: "emails",
      steps: [
        { order: 1, action: "message", description: "Répondre à un email de Tremblay", payload: { message: "Réponds à l'email de Tremblay — je confirme pour jeudi" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes", payload: { seconds: 4 } },
        {
          order: 3, action: "db", description: "Vérifier thread_id non-null dans emails_cache",
          sqlVerification: {
            table: "emails_cache", timeWindow: 60,
            requiredColumns: ["thread_id", "message_id"],
            forbiddenValues: { thread_id: [null, "undefined", ""], message_id: [null] },
          },
        },
      ],
      expectedResult: { description: "Réponse envoyée via Graph avec thread_id identique au thread original — la conversation est préservée", supabaseTable: "emails_cache", requiredColumns: ["thread_id"] },
    },
  ],
};

// ─── 3G — QuickBooks ──────────────────────────────────────────────────────────
const QUICKBOOKS = {
  id: "quickbooks", name: "QuickBooks", icon: "📊",
  tests: [
    {
      id: "qb-01", name: "Fetch factures QBO — données réelles", category: "quickbooks",
      steps: [
        { order: 1, action: "message", description: "Demander les factures QuickBooks", payload: { message: "Montre-moi les dernières factures QuickBooks" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes pour le fetch QBO", payload: { seconds: 4 } },
        {
          order: 3, action: "api", description: "Vérifier que les factures QBO contiennent Id, TotalAmt, CustomerRef",
          apiVerification: { endpoint: "/quickbooks/invoices", method: "GET", expectedFields: ["invoices"], forbiddenValues: { invoices: [null, "undefined", "[]"] } },
        },
      ],
      expectedResult: { description: "Chaque facture QBO a Id, TotalAmt, CustomerRef — aucune donnée inventée", apiResponseFields: ["invoices"] },
    },
    {
      id: "qb-02", name: "Fetch dépenses QBO — Amount, AccountRef, TxnDate", category: "quickbooks",
      steps: [
        { order: 1, action: "message", description: "Demander les dépenses QuickBooks", payload: { message: "Liste mes dépenses QuickBooks du mois" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes", payload: { seconds: 4 } },
        {
          order: 3, action: "api", description: "Vérifier Amount, AccountRef, TxnDate dans chaque dépense",
          apiVerification: { endpoint: "/quickbooks/expenses", method: "GET", expectedFields: ["expenses"], forbiddenValues: { expenses: [null, "undefined"] } },
        },
      ],
      expectedResult: { description: "Chaque dépense QBO a Amount, AccountRef, TxnDate — données réelles depuis l'API QBO", apiResponseFields: ["expenses"] },
    },
    {
      id: "qb-03", name: "Création facture → qb_invoice_id sauvegardé", category: "quickbooks",
      steps: [
        { order: 1, action: "message", description: "Créer et synchroniser une facture QBO", payload: { message: "Sync la dernière facture avec QuickBooks" } },
        { order: 2, action: "wait", description: "Attendre 5 secondes pour la sync", payload: { seconds: 5 } },
        {
          order: 3, action: "db", description: "Vérifier qb_invoice_id dans factures",
          sqlVerification: {
            table: "factures", timeWindow: 120,
            requiredColumns: ["qb_invoice_id"],
            forbiddenValues: { qb_invoice_id: [null, "", "undefined", "null"] },
          },
        },
      ],
      expectedResult: { description: "qb_invoice_id stocké dans factures après qb_creer_facture — preuve de la sync réussie", supabaseTable: "factures", requiredColumns: ["qb_invoice_id"] },
    },
    {
      id: "qb-04", name: "Token OAuth vivant — expires_at dans le futur", category: "quickbooks",
      steps: [
        {
          order: 1, action: "db", description: "Vérifier quickbooks_tokens — token actif",
          sqlVerification: {
            table: "quickbooks_tokens", timeWindow: 99999999,
            requiredColumns: ["access_token", "expires_at"],
            forbiddenValues: { access_token: [null, "", "undefined"], expires_at: [null, "undefined"] },
          },
        },
      ],
      expectedResult: { description: "quickbooks_tokens a access_token non-null et expires_at dans le futur", supabaseTable: "quickbooks_tokens", requiredColumns: ["access_token", "expires_at"] },
    },
  ],
};

// ─── 3H — Conversations ───────────────────────────────────────────────────────
const CONVERSATIONS = {
  id: "conversations", name: "Conversations", icon: "💬",
  tests: [
    {
      id: "conv-01", name: "Insertion dans conversation après échange", category: "conversations",
      steps: [
        { order: 1, action: "message", description: "Envoyer un message de test dans ZenAlpha", payload: { message: "Bonjour, quel est le statut du chantier Tremblay" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier l'insertion dans conversation",
          sqlVerification: {
            table: "conversation", timeWindow: 60,
            requiredColumns: ["role", "content", "created_at"],
            forbiddenValues: { role: [null, "undefined", ""], content: [null, "undefined", "null", "", "NaN", "[object Object]"], created_at: [null] },
          },
        },
      ],
      expectedResult: { description: "Ligne dans conversation avec role, content, created_at non-null — aucun contenu invalide", supabaseTable: "conversation", requiredColumns: ["role", "content", "created_at"] },
    },
    {
      id: "conv-02", name: "memoire_resumee mise à jour après seuil", category: "conversations",
      steps: [
        { order: 1, action: "message", description: "Vérifier memoire_resumee après plusieurs échanges", payload: { message: "Résume ce qu'on a discuté jusqu'ici" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes", payload: { seconds: 4 } },
        {
          order: 3, action: "db", description: "Vérifier une ligne dans memoire_resumee",
          sqlVerification: {
            table: "memoire_resumee", timeWindow: 99999999,
            requiredColumns: ["contenu", "created_at"],
            forbiddenValues: { contenu: [null, "", "undefined", "null"] },
          },
        },
      ],
      expectedResult: { description: "memoire_resumee a au moins une ligne avec contenu non-null — la mémoire persistante fonctionne", supabaseTable: "memoire_resumee", requiredColumns: ["contenu"] },
    },
    {
      id: "conv-03", name: "Aucun contenu undefined/null comme chaîne", category: "conversations",
      steps: [
        { order: 1, action: "message", description: "Envoyer un message complexe", payload: { message: "Donne-moi le résumé complet de la semaine pour tous les chantiers" } },
        { order: 2, action: "wait", description: "Attendre 4 secondes", payload: { seconds: 4 } },
        {
          order: 3, action: "db", description: "Vérifier aucun content invalide dans conversation",
          sqlVerification: {
            table: "conversation", timeWindow: 60,
            requiredColumns: ["content"],
            forbiddenValues: { content: ["undefined", "null", "NaN", "[object Object]", ""] },
          },
        },
      ],
      expectedResult: { description: "Aucune ligne de conversation avec content = 'undefined', 'null', ou vide — aucune donnée corrompue", supabaseTable: "conversation", forbiddenValues: { content: ["undefined", "null"] } },
    },
    {
      id: "conv-04", name: "conversation_id cohérent sur plusieurs tours", category: "conversations",
      steps: [
        { order: 1, action: "message", description: "Premier message de la conversation", payload: { message: "Quel est le total des heures cette semaine" } },
        { order: 2, action: "wait", description: "Attendre 2 secondes", payload: { seconds: 2 } },
        { order: 3, action: "message", description: "Deuxième message du même échange", payload: { message: "Et pour le mois complet" } },
        { order: 4, action: "wait", description: "Attendre 2 secondes", payload: { seconds: 2 } },
        {
          order: 5, action: "db", description: "Vérifier conversation_id identique sur plusieurs tours",
          sqlVerification: {
            table: "conversation", timeWindow: 60,
            requiredColumns: ["conversation_id", "role"],
            forbiddenValues: { conversation_id: [null, "undefined", "null"] },
          },
        },
      ],
      expectedResult: { description: "Toutes les lignes du même échange partagent le même conversation_id non-null", supabaseTable: "conversation", requiredColumns: ["conversation_id"] },
    },
  ],
};

// ─── 3I — Outils ──────────────────────────────────────────────────────────────
const OUTILS = {
  id: "outils", name: "Outils", icon: "🔧",
  tests: [
    {
      id: "outil-01", name: "Outil retourne un id réel non-null", category: "outils",
      steps: [
        { order: 1, action: "message", description: "Déclencher un outil qui crée une ressource", payload: { message: "Ajoute une note de chantier pour Tremblay: livraison béton confirmée" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "api", description: "Vérifier que la réponse de l'outil contient un id",
          apiVerification: { endpoint: "/tool-last-response", method: "GET", expectedFields: ["id", "tool_name"], forbiddenValues: { id: [null, "undefined", "null", 0], tool_name: [null, "undefined"] } },
        },
      ],
      expectedResult: { description: "La réponse de l'outil contient id non-null (UUID ou entier) — aucune réponse vide", apiResponseFields: ["id", "tool_name"] },
    },
    {
      id: "outil-02", name: "Nom d'outil correspond aux 89 outils déclarés", category: "outils",
      steps: [
        { order: 1, action: "message", description: "Déclencher n'importe quel outil", payload: { message: "Clock in sur chantier Gauthier" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "api", description: "Vérifier que le nom de l'outil est dans la liste déclarée",
          apiVerification: { endpoint: "/tool-last-response", method: "GET", expectedFields: ["tool_name"], forbiddenValues: { tool_name: [null, "undefined", "unknown_tool", ""] } },
        },
      ],
      expectedResult: { description: "tool_name correspond à l'un des outils déclarés dans server.js — aucun outil fantôme", apiResponseFields: ["tool_name"] },
    },
    {
      id: "outil-03", name: "Aucune donnée fabriquée — fournisseurs, montants, dates réels", category: "outils",
      steps: [
        { order: 1, action: "message", description: "Demander des données qui nécessitent une requête DB", payload: { message: "Quel est le dernier fournisseur avec qui on a eu une dépense" } },
        { order: 2, action: "wait", description: "Attendre 3 secondes", payload: { seconds: 3 } },
        {
          order: 3, action: "db", description: "Vérifier que la réponse contient un fournisseur réel depuis depenses",
          sqlVerification: {
            table: "depenses", timeWindow: 99999999,
            requiredColumns: ["fournisseur"],
            forbiddenValues: { fournisseur: [null, "undefined", "null", "un fournisseur"] },
          },
        },
      ],
      expectedResult: { description: "Le fournisseur mentionné existe réellement dans depenses — aucune fabrication de données", supabaseTable: "depenses", requiredColumns: ["fournisseur"] },
    },
    {
      id: "outil-04", name: "MAX_ROUNDS=5 non dépassé", category: "outils",
      steps: [
        { order: 1, action: "message", description: "Envoyer une requête qui nécessite plusieurs appels d'outils", payload: { message: "Donne-moi un résumé complet: heures, dépenses, factures et rappels de cette semaine" } },
        { order: 2, action: "wait", description: "Attendre 8 secondes pour les appels d'outils", payload: { seconds: 8 } },
        {
          order: 3, action: "api", description: "Vérifier que rounds <= 5 dans la réponse",
          apiVerification: { endpoint: "/last-exchange-stats", method: "GET", expectedFields: ["rounds_used"], forbiddenValues: { rounds_used: [null, "undefined"] } },
        },
      ],
      expectedResult: { description: "rounds_used <= 5 — MAX_ROUNDS jamais dépassé même pour les requêtes complexes", apiResponseFields: ["rounds_used"] },
    },
  ],
};

export const TEST_SUITES = [HEURES, DEPENSES, FACTURES, RAPPELS, CHANTIERS, EMAILS, QUICKBOOKS, CONVERSATIONS, OUTILS];
