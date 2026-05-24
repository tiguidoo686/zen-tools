import { useState } from "react";

const CMD = {
  "ls":               { action: "Liste les fichiers et dossiers", target: "Répertoire courant ou spécifié", result: "Affichage uniquement — aucune modification", reversible: true,  requires: "Permission de lecture", risk: "safe" },
  "ls -la":           { action: "Liste tous les fichiers (cachés inclus) avec permissions et tailles", target: "Répertoire courant ou spécifié", result: "Affichage uniquement", reversible: true,  requires: "Permission de lecture", risk: "safe" },
  "cat":              { action: "Affiche le contenu d'un fichier", target: "Fichier spécifié", result: "Lecture seule — aucune modification", reversible: true,  requires: "Permission de lecture", risk: "safe" },
  "pwd":              { action: "Affiche le répertoire de travail actuel", target: "Répertoire courant", result: "Lecture seule", reversible: true,  requires: "Aucun", risk: "safe" },
  "grep":             { action: "Recherche du texte dans des fichiers", target: "Fichiers/répertoires spécifiés", result: "Lignes correspondantes affichées — lecture seule", reversible: true,  requires: "Permission de lecture", risk: "safe" },
  "find":             { action: "Recherche des fichiers selon des critères", target: "Système de fichiers", result: "Liste des résultats — lecture seule", reversible: true,  requires: "Permission de lecture", risk: "safe" },
  "which":            { action: "Affiche le chemin d'un programme installé", target: "Programme spécifié", result: "Chemin affiché — lecture seule", reversible: true,  requires: "Aucun", risk: "safe" },
  "ping":             { action: "Teste la connectivité vers une adresse réseau", target: "Hôte ou IP spécifié", result: "Résultats affichés — lecture seule", reversible: true,  requires: "Connexion réseau", risk: "safe" },
  "env":              { action: "Affiche toutes les variables d'environnement", target: "Session courante", result: "Lecture seule — liste les variables", reversible: true,  requires: "Aucun", risk: "safe" },
  "history":          { action: "Affiche l'historique des commandes récentes", target: "Historique shell", result: "Lecture seule", reversible: true,  requires: "Aucun", risk: "safe" },
  "ps":               { action: "Liste les processus en cours d'exécution", target: "Processus système", result: "Lecture seule", reversible: true,  requires: "Aucun", risk: "safe" },
  "git log":          { action: "Affiche l'historique des commits", target: "Dépôt Git", result: "Lecture seule — aucune modification", reversible: true,  requires: "Dépôt Git", risk: "safe" },
  "git diff":         { action: "Affiche les différences entre versions du code", target: "Fichiers modifiés", result: "Lecture seule", reversible: true,  requires: "Dépôt Git", risk: "safe" },
  "git status":       { action: "Affiche l'état des fichiers (modifiés, en staging...)", target: "Dépôt Git courant", result: "Lecture seule", reversible: true,  requires: "Dépôt Git", risk: "safe" },
  "touch":            { action: "Crée un fichier vide ou met à jour sa date", target: "Fichier spécifié", result: "Fichier créé si inexistant", reversible: true,  requires: "Permission d'écriture", risk: "safe" },
  "echo":             { action: "Affiche du texte (ou écrit dans un fichier avec >)", target: "Terminal ou fichier cible", result: "Texte affiché ou écrit", reversible: true,  requires: "Aucun", risk: "safe" },
  "mkdir":            { action: "Crée un nouveau dossier", target: "Dossier spécifié", result: "Dossier créé", reversible: true,  requires: "Permission d'écriture", risk: "safe" },
  "mkdir -p":         { action: "Crée un dossier et tous ses parents manquants", target: "Chemin de dossier", result: "Toute la structure créée", reversible: true,  requires: "Permission d'écriture", risk: "safe" },
  "cp":               { action: "Copie un fichier ou dossier", target: "Source vers Destination", result: "Copie créée — original intact", reversible: true,  requires: "Lecture (source) + écriture (dest)", risk: "safe" },
  "cp -r":            { action: "Copie récursivement un dossier et tout son contenu", target: "Dossier source vers destination", result: "Copie complète — original intact", reversible: true,  requires: "Lecture + écriture", risk: "safe" },
  "ln -s":            { action: "Crée un lien symbolique (raccourci) vers un fichier", target: "Fichier/dossier cible", result: "Lien symbolique créé", reversible: true,  requires: "Permission d'écriture dans le dossier", risk: "safe" },
  "code":             { action: "Ouvre VS Code avec le fichier ou dossier spécifié", target: "Fichier/dossier spécifié", result: "VS Code s'ouvre — aucune modification", reversible: true,  requires: "VS Code installé", risk: "safe" },
  "open":             { action: "Ouvre un fichier ou une URL avec l'application par défaut (Mac)", target: "Fichier/URL", result: "Application ouvre le contenu", reversible: true,  requires: "macOS", risk: "safe" },
  "cd":               { action: "Change le répertoire de travail courant", target: "Répertoire spécifié", result: "Emplacement courant changé — aucune modification fichier", reversible: true,  requires: "Répertoire existant", risk: "safe" },
  "npm run build":    { action: "Compile et optimise le projet pour la production", target: "Code source du projet", result: "Dossier dist/ ou build/ créé", reversible: true,  requires: "Node.js, dépendances installées", risk: "safe" },
  "npm run dev":      { action: "Démarre le serveur de développement local", target: "Projet local", result: "Serveur accessible sur localhost (souvent :3000)", reversible: true,  requires: "Node.js, dépendances", risk: "safe" },
  "npm run":          { action: "Exécute un script défini dans package.json", target: "Projet Node.js", result: "Varie selon le script (build, test, start...)", reversible: true,  requires: "Node.js, dépendances installées", risk: "safe" },
  "npm test":         { action: "Exécute la suite de tests du projet", target: "Tests du projet", result: "Résultats des tests affichés — aucune modification", reversible: true,  requires: "Node.js, dépendances", risk: "safe" },
  "node":             { action: "Exécute un script JavaScript avec Node.js", target: "Fichier .js spécifié", result: "Script exécuté", reversible: false, requires: "Node.js installé", risk: "safe" },
  "python":           { action: "Exécute un script Python", target: "Fichier .py spécifié", result: "Script exécuté", reversible: false, requires: "Python installé", risk: "safe" },
  "python3":          { action: "Exécute un script Python 3", target: "Fichier .py spécifié", result: "Script exécuté", reversible: false, requires: "Python 3 installé", risk: "safe" },
  "docker build":     { action: "Construit une image Docker depuis un Dockerfile", target: "Répertoire courant (Dockerfile)", result: "Image Docker créée localement", reversible: true,  requires: "Docker, Dockerfile", risk: "safe" },
  "docker pull":      { action: "Télécharge une image Docker depuis un registre", target: "Registre Docker (Docker Hub)", result: "Image stockée localement", reversible: true,  requires: "Docker, connexion internet", risk: "safe" },
  "git add":          { action: "Prépare des fichiers pour le prochain commit (staging)", target: "Fichiers spécifiés", result: "Fichiers prêts à être committés", reversible: true,  requires: "Dépôt Git", risk: "safe" },
  "git add .":        { action: "Prépare TOUS les fichiers modifiés pour le commit", target: "Tous les fichiers modifiés", result: "Tout en staging pour le prochain commit", reversible: true,  requires: "Dépôt Git", risk: "safe" },
  "git commit":       { action: "Sauvegarde un snapshot des changements stagés dans l'historique local", target: "Fichiers en staging", result: "Nouveau commit créé localement", reversible: true,  requires: "Fichiers en staging, dépôt Git", risk: "safe" },
  "git pull":         { action: "Télécharge et fusionne les changements du dépôt distant", target: "Branche courante", result: "Branche locale mise à jour", reversible: true,  requires: "Connexion internet, accès au dépôt", risk: "safe" },
  "git clone":        { action: "Copie un dépôt entier depuis une URL", target: "Dépôt distant spécifié", result: "Copie locale complète créée", reversible: true,  requires: "Connexion internet, accès au dépôt", risk: "safe" },
  "git stash":        { action: "Sauvegarde temporairement les changements non committés", target: "Fichiers modifiés actuellement", result: "Changements mis en attente, arbre de travail propre", reversible: true,  requires: "Dépôt Git", risk: "safe" },
  "git branch":       { action: "Liste, crée ou supprime des branches", target: "Branches du dépôt", result: "Varie selon les options", reversible: true,  requires: "Dépôt Git", risk: "safe" },
  "rmdir":            { action: "Supprime un dossier vide", target: "Dossier vide spécifié", result: "Dossier supprimé (uniquement s'il est vide)", reversible: false, requires: "Permission d'écriture", risk: "moderate" },
  "mv":               { action: "Déplace ou renomme un fichier/dossier", target: "Fichier/dossier source", result: "Fichier déplacé — l'original n'existe plus à l'ancienne adresse", reversible: false, requires: "Permission d'écriture", risk: "moderate" },
  "chmod":            { action: "Change les permissions d'accès d'un fichier", target: "Fichier/dossier spécifié", result: "Permissions modifiées", reversible: true,  requires: "Propriétaire du fichier ou root", risk: "moderate" },
  "chown":            { action: "Change le propriétaire d'un fichier", target: "Fichier/dossier spécifié", result: "Propriétaire modifié", reversible: true,  requires: "Root (sudo)", risk: "moderate" },
  "kill":             { action: "Termine un processus par son identifiant (PID)", target: "Processus spécifié", result: "Processus arrêté — travail non sauvegardé perdu", reversible: false, requires: "Propriétaire du processus ou root", risk: "moderate" },
  "git push":         { action: "Envoie les commits locaux vers le dépôt distant (GitHub)", target: "Dépôt distant (remote)", result: "Commits visibles en ligne", reversible: true,  requires: "Accès au dépôt distant, connexion internet", risk: "moderate" },
  "git checkout":     { action: "Change de branche ou restaure des fichiers à leur état committé", target: "Branche ou fichier spécifié", result: "Branche changée ou fichier restauré", reversible: true,  requires: "Dépôt Git", risk: "moderate" },
  "git merge":        { action: "Fusionne une branche dans la branche courante", target: "Branche courante", result: "Commits de la branche source intégrés", reversible: true,  requires: "Dépôt Git, pas de conflits non résolus", risk: "moderate" },
  "git reset":        { action: "Annule des commits récents ou désindexe des fichiers", target: "Commits ou fichiers spécifiés", result: "État du dépôt modifié, changements préservés localement", reversible: true,  requires: "Dépôt Git", risk: "moderate" },
  "git branch -D":    { action: "Force la suppression d'une branche locale", target: "Branche locale spécifiée", result: "Branche supprimée même si non fusionnée — commits non fusionnés perdus", reversible: false, requires: "Dépôt Git", risk: "moderate" },
  "ssh":              { action: "Ouvre une connexion shell distante vers un serveur", target: "Serveur distant spécifié", result: "Session interactive sur le serveur distant", reversible: true,  requires: "Clé SSH ou mot de passe, accès réseau", risk: "moderate" },
  "scp":              { action: "Copie des fichiers de façon sécurisée vers/depuis un serveur", target: "Fichier(s) spécifié(s)", result: "Copie transférée — original intact", reversible: true,  requires: "Accès SSH, réseau", risk: "moderate" },
  "npm install":      { action: "Installe les dépendances Node.js du projet", target: "Dossier node_modules", result: "Packages téléchargés et installés localement", reversible: true,  requires: "Node.js, connexion internet", risk: "moderate" },
  "npm install -g":   { action: "Installe un package Node.js globalement sur le système", target: "Dossier global Node.js", result: "Package disponible pour toutes les applications", reversible: true,  requires: "Node.js, connexion internet, permissions admin", risk: "moderate" },
  "npx":              { action: "Exécute un package Node.js sans installation globale", target: "Package spécifié", result: "Commande exécutée, package téléchargé si absent", reversible: true,  requires: "Node.js, connexion internet", risk: "moderate" },
  "pip install":      { action: "Installe un package Python", target: "Environnement Python actif", result: "Package disponible dans Python", reversible: true,  requires: "Python, pip, connexion internet", risk: "moderate" },
  "yarn":             { action: "Installe les dépendances Node.js via Yarn", target: "Dossier node_modules", result: "Packages installés", reversible: true,  requires: "Yarn, Node.js, connexion internet", risk: "moderate" },
  "brew install":     { action: "Installe un package via Homebrew (gestionnaire Mac)", target: "Système macOS", result: "Package installé et disponible dans le terminal", reversible: true,  requires: "Homebrew, connexion internet", risk: "moderate" },
  "source":           { action: "Exécute un fichier de script dans le shell courant (charge ses variables)", target: "Fichier de configuration spécifié", result: "Variables et fonctions du fichier chargées dans la session", reversible: false, requires: "Fichier existant", risk: "moderate" },
  "make":             { action: "Exécute des tâches définies dans un Makefile", target: "Projet courant (Makefile)", result: "Compilation, tests ou déploiement selon la cible", reversible: false, requires: "Make installé, Makefile présent", risk: "moderate" },
  "docker run":       { action: "Démarre un conteneur Docker depuis une image", target: "Conteneur Docker", result: "Application isolée démarrée dans un conteneur", reversible: true,  requires: "Docker installé, image disponible", risk: "moderate" },
  "docker exec":      { action: "Exécute une commande dans un conteneur en cours", target: "Conteneur spécifié", result: "Commande exécutée à l'intérieur du conteneur", reversible: false, requires: "Docker, conteneur actif", risk: "moderate" },
  "docker rm":        { action: "Supprime un conteneur Docker arrêté", target: "Conteneur spécifié", result: "Conteneur supprimé (données non-persistées perdues)", reversible: false, requires: "Docker", risk: "moderate" },
  "docker rmi":       { action: "Supprime une image Docker locale", target: "Image spécifiée", result: "Image supprimée — re-téléchargement nécessaire", reversible: false, requires: "Docker", risk: "moderate" },
  "wget":             { action: "Télécharge un fichier depuis internet", target: "URL spécifiée", result: "Fichier téléchargé localement", reversible: true,  requires: "Connexion internet", risk: "safe" },
  "curl":             { action: "Effectue une requête HTTP ou télécharge un fichier", target: "URL spécifiée", result: "Données récupérées ou fichier téléchargé", reversible: true,  requires: "Connexion internet", risk: "safe" },
  "export":           { action: "Définit une variable d'environnement pour la session courante", target: "Variables d'environnement de la session", result: "Variable disponible pour la session et ses processus enfants", reversible: true,  requires: "Aucun", risk: "safe" },
  "alias":            { action: "Crée un raccourci de commande pour la session", target: "Session shell courante", result: "Alias disponible jusqu'à fermeture du terminal", reversible: true,  requires: "Aucun", risk: "safe" },
  "rm":               { action: "Supprime un fichier", target: "Fichier spécifié", result: "Fichier supprimé définitivement — pas de corbeille", reversible: false, requires: "Permission d'écriture", risk: "dangerous" },
  "rm -r":            { action: "Supprime un dossier et tout son contenu récursivement", target: "Dossier spécifié", result: "Dossier et tout son contenu supprimés définitivement", reversible: false, requires: "Permission d'écriture", risk: "dangerous" },
  "rm -rf":           { action: "Force la suppression récursive SANS confirmation", target: "Fichier/dossier spécifié", result: "Suppression permanente et forcée — aucune récupération possible", reversible: false, requires: "Permission d'écriture", risk: "critical" },
  "chmod 777":        { action: "Donne TOUTES les permissions à tout le monde (lecture/écriture/exécution)", target: "Fichier/dossier spécifié", result: "Fichier accessible et modifiable par n'importe qui sur le système", reversible: true,  requires: "Propriétaire ou root", risk: "dangerous" },
  "chmod -R":         { action: "Change les permissions récursivement sur tout un dossier", target: "Dossier et tout son contenu", result: "Toutes les permissions changées en cascade", reversible: true,  requires: "Propriétaire ou root", risk: "dangerous" },
  "git push --force": { action: "Écrase l'historique du dépôt distant avec l'historique local", target: "Branche distante spécifiée", result: "Commits distants remplacés — les commits des autres peuvent être perdus", reversible: false, requires: "Accès en écriture au dépôt", risk: "dangerous" },
  "git push -f":      { action: "Alias de git push --force — écrase l'historique distant", target: "Branche distante", result: "Commits distants remplacés — perte possible", reversible: false, requires: "Accès en écriture", risk: "dangerous" },
  "git reset --hard": { action: "Annule les commits ET efface tous les changements locaux non committés", target: "Dépôt local + fichiers de travail", result: "Tout ramené au dernier commit — changements non sauvegardés perdus définitivement", reversible: false, requires: "Dépôt Git", risk: "dangerous" },
  "git rebase":       { action: "Réapplique les commits sur une autre base — réécrit l'historique", target: "Historique des commits", result: "Historique réécrit — problèmes si branche partagée", reversible: false, requires: "Dépôt Git", risk: "dangerous" },
  "killall":          { action: "Termine tous les processus portant un nom donné", target: "Tous les processus du nom spécifié", result: "Tous ces processus arrêtés", reversible: false, requires: "Propriétaire ou root", risk: "dangerous" },
  "sudo":             { action: "Exécute une commande avec les droits administrateur (root)", target: "Commande suivante", result: "Commande exécutée avec tous les droits — aucune restriction système", reversible: false, requires: "Mot de passe sudo", risk: "dangerous" },
  "dd":               { action: "Copie et convertit des données au niveau bloc (disque brut)", target: "Périphérique/fichier source et destination", result: "Copie bas-niveau — peut écraser un disque entier", reversible: false, requires: "Root généralement", risk: "critical" },
  "mkfs":             { action: "Formate un système de fichiers sur un périphérique", target: "Périphérique de stockage spécifié", result: "TOUTES les données du périphérique effacées — formatage complet", reversible: false, requires: "Root, périphérique ciblé", risk: "critical" },
};

const RISK_PATTERNS = [
  { regex: /rm\s+-[rf]*r[f]*\s+\/(\s|$)/i,       level: "critical",  label: "rm -rf /",                    reason: "Supprime tout le système de fichiers racine — détruit le système d'exploitation",            safer: "Spécifie toujours un chemin précis : rm -rf ./dist" },
  { regex: /rm\s+-[rf]*r[f]*\s+~\/?(\s|$)/i,     level: "critical",  label: "rm -rf ~/",                   reason: "Supprime tout le dossier personnel — données, projets, configurations",                    safer: "Spécifie un sous-dossier précis" },
  { regex: /\|\s*(bash|sh|zsh|fish)\b/i,          level: "critical",  label: "| bash/sh (exec distant)",    reason: "Exécute un script téléchargé sans vérification — risque d'exécution de code malveillant", safer: "Télécharger d'abord, inspecter manuellement, puis exécuter" },
  { regex: /:\(\)\s*\{.*:\|.*:\s*&.*\}/,          level: "critical",  label: "Fork bomb",                    reason: "Crée des processus infiniment jusqu'au crash complet du système",                          safer: "Ne jamais exécuter" },
  { regex: /dd\s+if=/i,                            level: "critical",  label: "dd if=... (copie bloc)",       reason: "Copie de données au niveau bloc — peut écraser un disque entier sans avertissement",       safer: "Vérifier chaque paramètre (if= et of=) avec extrême précaution" },
  { regex: /mkfs\./i,                              level: "critical",  label: "mkfs (format disque)",         reason: "Formate un périphérique — efface toutes les données définitivement",                        safer: "Vérifier le périphérique cible avec lsblk avant de formater" },
  { regex: /chmod\s+777\s+\//i,                   level: "critical",  label: "chmod 777 /",                  reason: "Rend tout le système de fichiers accessible à tout le monde",                              safer: "Ne jamais appliquer chmod 777 à /" },
  { regex: />\s*\/dev\/[a-z]+[0-9]*/i,            level: "critical",  label: "Redirection vers /dev/",       reason: "Écrit directement sur un périphérique bas-niveau — peut corrompre un disque",              safer: "Ne jamais rediriger vers /dev/sda, /dev/nvme, etc." },
  { regex: /rm\s+-[rf]+/i,                         level: "dangerous", label: "rm -rf",                       reason: "Suppression forcée et récursive — permanent, aucune corbeille",                            safer: "Vérifier le chemin exact avant d'exécuter" },
  { regex: /git\s+push\s+(--force|-f)\b/i,        level: "dangerous", label: "git push --force",             reason: "Écrase l'historique distant — les commits des autres peuvent être perdus",                 safer: "Utiliser git push --force-with-lease à la place" },
  { regex: /git\s+reset\s+--hard/i,               level: "dangerous", label: "git reset --hard",             reason: "Efface définitivement tous les changements locaux non committés",                           safer: "Faire git stash d'abord si tu veux conserver les changements" },
  { regex: /chmod\s+777\b/i,                      level: "dangerous", label: "chmod 777",                    reason: "Ouvre toutes les permissions à tout le monde — risque de sécurité majeur",                 safer: "Utiliser chmod 644 (fichiers) ou chmod 755 (dossiers) selon le besoin" },
  { regex: /chmod\s+-R\b/i,                       level: "dangerous", label: "chmod -R",                     reason: "Change les permissions récursivement sur tout le contenu du dossier",                      safer: "Vérifier le répertoire cible et les permissions avant d'appliquer" },
  { regex: /sudo\s+(rm|dd|mkfs|chmod|format)/i,   level: "dangerous", label: "sudo + commande destructrice", reason: "Commande potentiellement destructrice exécutée avec droits root — aucune restriction",       safer: "Vérifier la commande exacte avant d'ajouter sudo" },
  { regex: /killall\b/i,                           level: "dangerous", label: "killall",                      reason: "Termine tous les processus du nom donné — peut fermer des applications importantes",       safer: "Utiliser kill <PID> pour cibler un processus précis" },
  { regex: /export\s+\w*(KEY|SECRET|TOKEN|PASSWORD|PASS|PWD|API_KEY)\w*\s*=/i, level: "dangerous", label: "Export de secret", reason: "Définit une variable avec un nom sensible — risque d'exposition dans les logs ou scripts", safer: "Utiliser un fichier .env et ne jamais committer les secrets" },
  { regex: /(?<![>])[>](?![>=])\s*\S+/,           level: "moderate",  label: "Redirection > (écrasement)",   reason: "Écrase le fichier destination sans confirmation ni sauvegarde",                              safer: "Utiliser >> pour ajouter sans écraser, ou sauvegarder d'abord" },
];

const RISK_META = {
  safe:      { icon: "🟢", label: "Sûr",       bg: "#f0fdf4", border: "#86efac", text: "#16a34a", badgeBg: "#dcfce7", badgeText: "#15803d" },
  moderate:  { icon: "🟡", label: "Modéré",    bg: "#fefce8", border: "#fde047", text: "#a16207", badgeBg: "#fef9c3", badgeText: "#854d0e" },
  dangerous: { icon: "🔴", label: "Dangereux",  bg: "#fff1f2", border: "#fca5a5", text: "#dc2626", badgeBg: "#fee2e2", badgeText: "#b91c1c" },
  critical:  { icon: "⚫", label: "Critique",   bg: "#120508", border: "#ef4444", text: "#fca5a5", badgeBg: "#1a0808", badgeText: "#fca5a5" },
};

const RORDER = ["critical", "dangerous", "moderate", "safe"];

function stripMarkdown(text) {
  return text.replace(/```[\w]*\n?/g, "").replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1").replace(/_([^_]+)_/g, "$1")
    .replace(/#+\s/g, "").replace(/>\s/g, "").replace(/<\/?[\w]+[^>]*>/g, "").trim();
}

function splitCommands(raw) {
  const stripped = stripMarkdown(raw);
  const lines = stripped.split("\n").join(" ; ").replace(/&&/g, ";").replace(/\|\|/g, ";");
  return lines.split(";").map(s => s.trim()).filter(s => s.length > 1 && !/^(then|else|fi|do|done|end)$/.test(s));
}

function matchCommand(raw) {
  const norm = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const keys = Object.keys(CMD).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const kn = key.toLowerCase();
    if (norm === kn || norm.startsWith(kn + " ") || norm.startsWith(kn + "\t")) return { key, ...CMD[key] };
  }
  return null;
}

function detectRisks(raw) {
  return RISK_PATTERNS.filter(p => p.regex.test(raw));
}

function overallRisk(items) {
  for (const lvl of RORDER) if (items.some(it => it.risk === lvl)) return lvl;
  return "safe";
}

function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}); }

function formatTs(d = new Date()) {
  return d.toISOString().replace("T", "_").slice(0, 16).replace(":", "-");
}

const cs = {
  page:     { minHeight: "100vh", background: "#f5f4ff", fontFamily: "system-ui,sans-serif", padding: "1.5rem 1rem" },
  center:   { maxWidth: 900, margin: "0 auto" },
  card:     { background: "white", borderRadius: 14, padding: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 },
  ta:       { width: "100%", borderRadius: 10, border: "2px solid #e5e0ff", padding: "1rem", fontSize: 13, fontFamily: "monospace", resize: "vertical", outline: "none", background: "#fdfcff", boxSizing: "border-box" },
  btnMain:  (dis) => ({ background: dis ? "#c4c0e0" : "#534AB7", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit" }),
  btnSec:   { background: "white", color: "#534AB7", border: "2px solid #534AB7", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnGhost: { background: "transparent", color: "#7b6fa0", border: "1px solid #d4d0ef", borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  row:      { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  label:    { fontSize: 11, fontWeight: 700, color: "#7b6fa0", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" },
  tag:      (bg, col) => ({ background: bg, color: col, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-block" }),
  fieldKey: { fontSize: 11, color: "#9e96c0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 90, flexShrink: 0 },
  fieldVal: { fontSize: 13, color: "#1a1528" },
};

function RiskBadge({ level }) {
  const m = RISK_META[level] || RISK_META.safe;
  return <span style={cs.tag(m.badgeBg, m.badgeText)}>{m.icon} {m.label}</span>;
}

function SummaryBar({ level }) {
  const m = RISK_META[level] || RISK_META.safe;
  return (
    <div style={{ background: level === "critical" ? "#1a0808" : m.bg, border: `2px solid ${m.border}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 20 }}>{m.icon}</span>
      <span style={{ fontWeight: 700, color: m.text, fontSize: 14 }}>Risque global : {m.label.toUpperCase()}</span>
    </div>
  );
}

function Field({ label, value, children }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 6, alignItems: "baseline" }}>
      <span style={cs.fieldKey}>{label}</span>
      {children || <span style={cs.fieldVal}>{value}</span>}
    </div>
  );
}

function AnalysisCard({ item, index, aiResult, onAI, aiLoading }) {
  const m = RISK_META[item.risk] || RISK_META.safe;
  const crit = item.risk === "critical";
  const info = item.matched || aiResult;
  return (
    <div style={{ background: crit ? "#120508" : m.bg, border: `2px solid ${m.border}`, borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ background: crit ? "#1a0808" : m.badgeBg, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 12, color: "#9e96c0", fontWeight: 700, flexShrink: 0 }}>#{index + 1}</span>
          <code style={{ fontSize: 12, background: "rgba(0,0,0,0.12)", padding: "2px 8px", borderRadius: 6, color: crit ? "#fca5a5" : "#1a1528", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 440, display: "block" }}>
            {item.raw.length > 80 ? item.raw.slice(0, 80) + "…" : item.raw}
          </code>
        </div>
        <RiskBadge level={item.risk} />
      </div>
      <div style={{ padding: "14px 16px" }}>
        {info ? (
          <>
            <Field label="Action" value={info.action} />
            <Field label="Cible" value={info.target} />
            <Field label="Résultat"><span style={{ ...cs.fieldVal, color: crit ? "#e2c5c5" : "#1a1528" }}>{info.result}</span></Field>
            <Field label="Réversible"><span style={cs.tag(info.reversible ? "#dcfce7" : "#fee2e2", info.reversible ? "#16a34a" : "#dc2626")}>{info.reversible ? "✓ Oui" : "✗ Non"}</span></Field>
            <Field label="Requiert" value={info.requires} />
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#c97c2a" }}>⚠️ Commande inconnue — vérifier manuellement avant d'exécuter.</span>
            <button onClick={() => onAI(item.raw, index)} disabled={aiLoading} style={cs.btnMain(aiLoading)}>
              {aiLoading ? "Analyse…" : "🤖 Analyser avec Claude"}
            </button>
          </div>
        )}
        {item.flags.length > 0 && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${m.border}`, paddingTop: 10 }}>
            {item.flags.map((f, fi) => {
              const fm = RISK_META[f.level] || RISK_META.moderate;
              return (
                <div key={fi} style={{ background: f.level === "critical" ? "#2a0808" : fm.bg, border: `1px solid ${fm.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                  <div style={{ marginBottom: 4 }}><span style={cs.tag(fm.badgeBg, fm.badgeText)}>{fm.icon} {f.label}</span></div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: fm.text }}>⚠️ {f.reason}</p>
                  {f.safer && <p style={{ margin: 0, fontSize: 12, color: "#16a34a" }}>✅ Alternative : {f.safer}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPanel({ history, onLoad, onClose }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={cs.label}>Historique de session ({history.length}/20)</span>
        <button onClick={onClose} style={cs.btnGhost}>Fermer ✕</button>
      </div>
      {history.length === 0
        ? <p style={{ fontSize: 13, color: "#9e96c0", textAlign: "center", padding: "1rem 0" }}>Aucune analyse dans cette session.</p>
        : history.map((h, i) => (
          <div key={i} style={{ ...cs.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
            onClick={() => { onLoad(h.input); onClose(); }}>
            <div style={{ overflow: "hidden" }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "#9e96c0" }}>{h.time} · {h.count} commande{h.count > 1 ? "s" : ""}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#1a1528", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>{h.preview}</p>
            </div>
            <RiskBadge level={h.risk} />
          </div>
        ))
      }
    </div>
  );
}

export default function Translator() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);
  const [warning, setWarning] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [aiLoading, setAiLoading] = useState({});
  const [aiResults, setAiResults] = useState({});
  const [saveMsg, setSaveMsg] = useState("");

  function analyze() {
    setWarning(""); setAiResults({});
    const trimmed = input.trim();
    if (!trimmed) { setWarning("⚠️ Rien à analyser. Colle une commande d'abord."); return; }
    if (trimmed.length > 5000) setWarning("⚠️ Contenu très long — seuls les 5000 premiers caractères sont analysés.");
    const parts = splitCommands(trimmed.slice(0, 5000));
    if (parts.length === 0) { setWarning("⚠️ Aucune commande détectée. Vérifie le format du texte collé."); return; }
    const items = parts.map(raw => {
      const matched = matchCommand(raw);
      const flags = detectRisks(raw);
      const risks = [matched?.risk || "safe", ...flags.map(f => f.level)];
      const risk = RORDER.find(l => risks.includes(l)) || "safe";
      return { raw, matched, flags, risk };
    });
    setResults(items);
    setHistory(prev => [{
      input: trimmed,
      time: new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }),
      count: items.length,
      preview: trimmed.split("\n")[0].slice(0, 80),
      risk: overallRisk(items),
    }, ...prev].slice(0, 20));
  }

  function clear() { setInput(""); setResults(null); setWarning(""); setAiResults({}); }

  function copyExplanation() {
    if (!results) return;
    const text = results.map((it, i) => {
      const info = it.matched || aiResults[i];
      let s = `#${i+1} ${it.raw}\nRisque : ${RISK_META[it.risk]?.label || it.risk}\n`;
      if (info) s += `Action : ${info.action}\nCible : ${info.target}\nRésultat : ${info.result}\nRéversible : ${info.reversible ? "Oui" : "Non"}\nRequiert : ${info.requires}\n`;
      else s += "Commande inconnue — vérifier manuellement.\n";
      it.flags.forEach(f => { s += `⚠️ ${f.label} : ${f.reason}\n`; if (f.safer) s += `✅ Alternative : ${f.safer}\n`; });
      return s;
    }).join("\n" + "─".repeat(50) + "\n");
    copyText(text);
  }

  function saveReport(fmt) {
    if (!results) return;
    const now = new Date();
    const ts = formatTs(now);
    const items = results.map((it, i) => {
      const info = it.matched || aiResults[i];
      return { index: i+1, command: it.raw, risk: it.risk, ...(info ? { action: info.action, target: info.target, result: info.result, reversible: info.reversible, requires: info.requires } : { note: "Commande inconnue" }), flags: it.flags.map(f => ({ label: f.label, reason: f.reason, safer: f.safer || null })) };
    });
    let blob, filename;
    if (fmt === "json") {
      blob = new Blob([JSON.stringify({ generatedAt: now.toISOString(), overallRisk: overallRisk(results), commands: items }, null, 2)], { type: "application/json;charset=utf-8" });
      filename = `claude_analysis_${ts}.json`;
    } else {
      const lines = [`Claude Code Translator — Rapport d'analyse`, `Généré le : ${now.toLocaleString("fr-CA")}`, `Risque global : ${RISK_META[overallRisk(results)].label}`, "", "═".repeat(60), ""];
      items.forEach(it => {
        lines.push(`#${it.index} ${it.command}`, `Risque : ${RISK_META[it.risk]?.label || it.risk}`);
        if (it.action) lines.push(`Action : ${it.action}`, `Cible : ${it.target}`, `Résultat : ${it.result}`, `Réversible : ${it.reversible ? "Oui" : "Non"}`, `Requiert : ${it.requires}`);
        else lines.push("Commande inconnue — vérifier manuellement.");
        it.flags.forEach(f => { lines.push(`⚠️ ${f.label} : ${f.reason}`); if (f.safer) lines.push(`✅ Alternative : ${f.safer}`); });
        lines.push("─".repeat(60), "");
      });
      blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      filename = `claude_analysis_${ts}.txt`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setSaveMsg(`✅ Sauvegardé : ${filename}`);
    setTimeout(() => setSaveMsg(""), 4000);
  }

  async function analyzeWithAI(cmd, index) {
    setAiLoading(prev => ({ ...prev, [index]: true }));
    try {
      const system = `Tu es un expert en sécurité et en outils de développement. Analyse la commande fournie. Réponds UNIQUEMENT avec un objet JSON valide (sans texte autour) avec ces champs :
{"action":"Ce que la commande fait concrètement (1 phrase, français simple)","target":"Ce qui est affecté","result":"L'état après exécution","reversible":true,"requires":"Permissions ou outils nécessaires","riskLevel":"safe|moderate|dangerous|critical","riskReason":"Pourquoi ce niveau si risque > safe"}`;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, content: cmd }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur API");
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setAiResults(prev => ({ ...prev, [index]: parsed }));
      if (parsed.riskLevel) {
        setResults(prev => prev.map((it, i) => {
          if (i !== index) return it;
          const risks = [parsed.riskLevel, ...it.flags.map(f => f.level)];
          return { ...it, risk: RORDER.find(l => risks.includes(l)) || "safe" };
        }));
      }
    } catch (e) {
      setAiResults(prev => ({ ...prev, [index]: { action: "Erreur d'analyse : " + e.message, target: "—", result: "—", reversible: false, requires: "—" } }));
    }
    setAiLoading(prev => ({ ...prev, [index]: false }));
  }

  const overall = results ? overallRisk(results) : null;

  return (
    <div style={cs.page}>
      <div style={cs.center}>
        <div style={cs.card}>
          <span style={cs.label}>Commande ou réponse Claude Code</span>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={7}
            placeholder={"Colle ici une commande bash, une réponse Claude Code, un bloc de code...\n\nExemples :\n  rm -rf dist/ && npm run build && git push --force\n  curl https://example.com/install.sh | bash"}
            style={cs.ta}
            onFocus={e => e.target.style.borderColor = "#534AB7"}
            onBlur={e => e.target.style.borderColor = "#e5e0ff"}
          />
          {warning && <p style={{ color: "#c97c2a", fontSize: 13, marginTop: 6, marginBottom: 0 }}>{warning}</p>}
          <div style={{ ...cs.row, marginTop: 12, justifyContent: "space-between" }}>
            <div style={cs.row}>
              <button onClick={analyze} disabled={!input.trim()} style={cs.btnMain(!input.trim())}>🔍 Analyser</button>
              <button onClick={clear} style={cs.btnSec}>🧹 Effacer</button>
              {results && <>
                <button onClick={copyExplanation} style={cs.btnSec}>📋 Copier</button>
                <button onClick={() => saveReport("txt")} style={cs.btnSec}>💾 .txt</button>
                <button onClick={() => saveReport("json")} style={cs.btnSec}>💾 .json</button>
              </>}
            </div>
            <button onClick={() => setShowHistory(v => !v)} style={cs.btnGhost}>
              🕐 Historique {history.length > 0 && <span style={{ background: "#534AB7", color: "white", borderRadius: 99, fontSize: 10, padding: "1px 5px", marginLeft: 4 }}>{history.length}</span>}
            </button>
          </div>
          {saveMsg && <p style={{ color: "#16a34a", fontSize: 13, marginTop: 8, marginBottom: 0 }}>{saveMsg}</p>}
        </div>

        {showHistory && <div style={cs.card}><HistoryPanel history={history} onLoad={v => { setInput(v); setShowHistory(false); }} onClose={() => setShowHistory(false)} /></div>}

        {results && <>
          <SummaryBar level={overall} />
          <span style={{ ...cs.label, marginBottom: 10 }}>{results.length} commande{results.length > 1 ? "s" : ""} analysée{results.length > 1 ? "s" : ""}</span>
          {results.map((item, i) => (
            <AnalysisCard key={i} item={item} index={i} aiResult={aiResults[i]} onAI={analyzeWithAI} aiLoading={!!aiLoading[i]} />
          ))}
        </>}

        {!results && !warning && (
          <div style={{ ...cs.card, textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1528", marginBottom: 6 }}>Claude Code Translator</p>
            <p style={{ fontSize: 13, color: "#7b6fa0", margin: 0, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>Colle une commande ou une réponse Claude Code ci-dessus pour comprendre ce qu'elle fait et évaluer les risques avant de l'exécuter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
