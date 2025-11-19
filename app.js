/* =============================================================
  app.js — PARTIE 1/3
  Base, helpers, matricule, init sample, navigation & utilitaires
  (Coller ceci en haut de ton fichier app.js)
  ============================================================= */

/* ------------- CONSTANTES DE STOCKAGE ------------- */
const REG_KEY = "dtm_regs_final_2025";
const USER_KEY = "dtm_users_final_2025";
const SEQ_KEY = "dtm_seq_final_2025";
const SESSION_KEY = "dtm_session_final_2025";

/* Utiliser le logo officiel comme photo par défaut (chemin local fourni) */
const DEFAULT_PHOTO = "/mnt/data/logo-dtm.png";

/* ------------- HELPERS DOM & STORAGE ------------- */
const $ = (id) => document.getElementById(id);
const load = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); }
  catch (e) { console.error("Storage parse error", e); return []; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getItem = (k) => localStorage.getItem(k);
const setItem = (k, v) => localStorage.setItem(k, v);

/* ------------- HASH (SHA-256) ------------- */
async function hash(text) {
  const enc = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ------------- UTIL: file -> dataURL ------------- */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = (e) => reject(e);
    fr.readAsDataURL(file);
  });
}

/* ------------- Matricule auto DTM-YYYY-XXXX ------------- */
function getSeqObj() {
  try { return JSON.parse(localStorage.getItem(SEQ_KEY) || "{}"); } 
  catch (e) { return {}; }
}
function setSeqObj(obj) { localStorage.setItem(SEQ_KEY, JSON.stringify(obj)); }

function peekMatricule() {
  const obj = getSeqObj();
  const y = new Date().getFullYear();
  const next = (obj[y] || 0) + 1;
  return `DTM-${y}-${String(next).padStart(4,'0')}`;
}

function nextMatricule() {
  const obj = getSeqObj();
  const y = new Date().getFullYear();
  obj[y] = (obj[y] || 0) + 1;
  setSeqObj(obj);
  return `DTM-${y}-${String(obj[y]).padStart(4,'0')}`;
}

/* Si l'élément nextMatPreview existe, affiche l'aperçu */
document.addEventListener("DOMContentLoaded", () => {
  const el = $("nextMatPreview");
  if (el) el.textContent = peekMatricule();
});

/* ------------- Initialisation sample (si vide) ------------- */
(function initSampleIfEmpty() {
  const regs = load(REG_KEY);
  const users = load(USER_KEY);
  if (!regs.length) {
    const id = 'reg-' + Date.now().toString(36);
    const sample = {
      id,
      matricule: nextMatricule(),
      nom: "Mor",
      prenom: "Faye",
      dob: "1998-01-01",
      lieu_naiss: "Touba",
      sexe: "Homme",
      nationalite: "Sénégal",
      tel: "770112233",
      email: "sample@example.com",
      adresse: "Touba",
      statut_dahira: "Membre interne",
      photoData: DEFAULT_PHOTO,
      statut: "Étudiant en médecine",
      universite: "UCAD",
      niveau: "L1",
      specialite: "N/A",
      annee_diplome: "2024",
      disponibilites: "Week-ends",
      competences: "Organisation",
      domaine: "Santé",
      signature: "Mor Faye - 2025-01-01",
      createdAt: new Date().toISOString()
    };
    save(REG_KEY, [sample]);
    hash("password123").then(h => {
      save(USER_KEY, [{ username: sample.email, passwordHash: h, registrantId: id, role: 'user' }]);
    });
  }
})();

/* ------------- Navigation entre sections ------------- */
/* showSection : masque toutes les sections .pageSection puis affiche celle demandée */
function showSection(id) {
  document.querySelectorAll('.pageSection').forEach(s => s.classList.add('hidden'));
  const el = $(id);
  if (el) el.classList.remove('hidden');
}

/* Gestion du bouton Admin dans la navbar (si présent) */
document.addEventListener("DOMContentLoaded", () => {
  const adminNavBtn = document.querySelector('[data-target="adminSection"]');
  if (adminNavBtn) adminNavBtn.addEventListener('click', () => showSection('adminSection'));

  // Liens de navigation principaux (si présents)
  const btnCreate = $("btnCreateAccount");
  if (btnCreate) btnCreate.addEventListener('click', () => showSection('signupSection'));

  const gotoSignup = $("gotoSignup");
  if (gotoSignup) gotoSignup.addEventListener('click', () => showSection('signupSection'));

  const btnProfile = $("btnProfile");
  if (btnProfile) btnProfile.addEventListener('click', () => {
    const sid = getItem(SESSION_KEY);
    if (!sid) showSection('loginSection');
    else {
      // loadUserProfile est défini dans la PARTIE 2
      if (typeof loadUserProfile === 'function') loadUserProfile();
      showSection('userSection');
    }
  });

  // logout button visibility will be managed in PARTIE 3 autoload
});

/* ------------- Small utility helpers ------------- */
/* Escape HTML for table rendering */
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

/* Expose some helpers globally for later parts (convenience) */
window.DTM = window.DTM || {};
window.DTM.helpers = {
  $,
  load,
  save,
  getItem,
  setItem,
  fileToDataUrl,
  hash,
  peekMatricule,
  nextMatricule,
  showSection,
  escapeHtml,
  DEFAULT_PHOTO,
  REG_KEY,
  USER_KEY,
  SEQ_KEY,
  SESSION_KEY
};

/* Fin PARTIE 1/3 */



/* =============================================================
  app.js — PARTIE 2/3
  Login, Signup, Chargement Profil, Sauvegarde, Mot de passe
  ============================================================= */

/* ------------ LOGIN UTILISATEUR ------------ */
$("btnLogin").onclick = async () => {
  const ident = $("loginUser").value.trim();
  const pass = $("loginPass").value.trim();

  if (!ident || !pass) return alert("Identifiant + mot de passe requis.");

  const users = load(USER_KEY);
  const found = users.find(u => u.username === ident);
  if (!found) return alert("Aucun compte ne correspond à cet identifiant.");

  const hashed = await hash(pass);
  if (hashed !== found.passwordHash) return alert("Mot de passe incorrect.");

  // Connexion acceptée
  setItem(SESSION_KEY, found.registrantId);
  $("btnLogin").classList.add("hidden");
  $("btnLogout").classList.remove("hidden");

  loadUserProfile();
  showSection("userSection");
};

/* ------------ LOGOUT ------------ */
$("btnLogout").onclick = () => {
  localStorage.removeItem(SESSION_KEY);
  $("btnLogout").classList.add("hidden");
  $("btnLogin").classList.remove("hidden");
  showSection("loginSection");
};

/* ------------ SIGNUP / INSCRIPTION ------------ */
$("regForm").onsubmit = async (e) => {
  e.preventDefault();

  // Champs requis
  const required = [
    "nom","prenom","dob","lieu_naiss","sexe","nationalite","tel","email",
    "adresse","statut_dahira","statut","universite","niveau","specialite",
    "annee_diplome","disponibilites","competences","domaine","signature",
    "password","password2"
  ];

  const data = {};
  for (const f of required) {
    const el = $(f);
    if (!el || !el.value.trim())
      return alert("Veuillez remplir correctement tous les champs !");
    data[f] = el.value.trim();
  }

  if (!$("consent").checked) return alert("Merci d'accepter le consentement.");
  if (data.password !== data.password2)
    return alert("Les mots de passe ne correspondent pas.");

  // Anti-doublon (tel ou email)
  const regs = load(REG_KEY);
  if (regs.some(r => r.tel === data.tel || r.email === data.email))
    return alert("Un compte avec ce numéro/email existe déjà.");

  // Photo
  let photoData = DEFAULT_PHOTO;
  if ($("photo").files[0]) {
    photoData = await fileToDataUrl($("photo").files[0]);
  }

  // Création du matricule
  const matricule = nextMatricule();
  const regId = "reg-" + Date.now().toString(36);

  const entry = {
    id: regId,
    matricule,
    nom: data.nom,
    prenom: data.prenom,
    dob: data.dob,
    lieu_naiss: data.lieu_naiss,
    sexe: data.sexe,
    nationalite: data.nationalite,
    tel: data.tel,
    email: data.email,
    adresse: data.adresse,
    statut_dahira: data.statut_dahira,
    photoData,
    statut: data.statut,
    universite: data.universite,
    niveau: data.niveau,
    specialite: data.specialite,
    annee_diplome: data.annee_diplome,
    disponibilites: data.disponibilites,
    competences: data.competences,
    domaine: data.domaine,
    signature: data.signature,
    createdAt: new Date().toISOString()
  };

  regs.push(entry);
  save(REG_KEY, regs);

  // User account
  const users = load(USER_KEY);
  users.push({
    username: data.email,
    passwordHash: await hash(data.password),
    registrantId: regId,
    role: "user"
  });
  save(USER_KEY, users);

  alert("Inscription réussie ! Votre matricule : " + matricule);
  $("regForm").reset();
  if ($("nextMatPreview")) $("nextMatPreview").textContent = peekMatricule();

  showSection("loginSection");
};

/* ------------ CHARGEMENT DU PROFIL UTILISATEUR ------------ */
function loadUserProfile() {
  const sid = getItem(SESSION_KEY);
  if (!sid) return;

  const regs = load(REG_KEY);
  const me = regs.find(r => r.id === sid);
  if (!me) return;

  // Forcer le logo si photo cassée
  if (!me.photoData) me.photoData = DEFAULT_PHOTO;

  $("userMat").textContent = me.matricule;

  const fields = [
    ["nom","Nom"],
    ["prenom","Prénom"],
    ["dob","Date de naissance"],
    ["lieu_naiss","Lieu de naissance"],
    ["sexe","Sexe"],
    ["nationalite","Nationalité"],
    ["tel","Téléphone"],
    ["email","Email"],
    ["adresse","Adresse"],
    ["statut_dahira","Statut Dahira"],
    ["statut","Statut académique"],
    ["universite","Université"],
    ["niveau","Niveau"],
    ["specialite","Spécialité"],
    ["annee_diplome","Année diplôme"],
    ["disponibilites","Disponibilités"],
    ["competences","Compétences"],
    ["domaine","Domaine"],
    ["signature","Signature"]
  ];

  const box = $("userDetails");
  box.innerHTML = "";

  // Photo
  const img = document.createElement("img");
  img.src = me.photoData;
  img.className = "badge-photo";
  box.appendChild(img);

  // Champs éditables
  fields.forEach(([key, label]) => {
    const wrapper = document.createElement("div");
    const lab = document.createElement("label");
    lab.className = "field-label";
    lab.textContent = label;

    const inp = document.createElement("input");
    inp.className = "input";
    inp.id = "user_" + key;
    inp.value = me[key] || "";

    wrapper.appendChild(lab);
    wrapper.appendChild(inp);
    box.appendChild(wrapper);
  });

  // Changer photo
  const phLab = document.createElement("label");
  phLab.textContent = "Changer photo";
  phLab.className = "field-label";
  const phInput = document.createElement("input");
  phInput.type = "file";
  phInput.id = "user_photo";
  phInput.className = "input";
  box.appendChild(phLab);
  box.appendChild(phInput);
}

/* ------------ SAUVEGARDE DES MODIFICATIONS PROFIL ------------ */
$("userSaveBtn").onclick = async () => {
  const sid = getItem(SESSION_KEY);
  if (!sid) return;

  const regs = load(REG_KEY);
  const idx = regs.findIndex(r => r.id === sid);
  if (idx === -1) return;

  const me = regs[idx];
  const keys = [
    "nom","prenom","dob","lieu_naiss","sexe","nationalite","tel","email",
    "adresse","statut_dahira","statut","universite","niveau","specialite",
    "annee_diplome","disponibilites","competences","domaine","signature"
  ];

  keys.forEach(k => {
    const el = $("user_" + k);
    if (el) me[k] = el.value.trim();
  });

  // Photo
  const file = $("user_photo").files[0];
  if (file) me.photoData = await fileToDataUrl(file);

  save(REG_KEY, regs);

  // Sync username
  const users = load(USER_KEY);
  const u = users.find(x => x.registrantId === sid);
  if (u) {
    u.username = me.email;
    save(USER_KEY, users);
  }

  alert("Profil mis à jour !");
  loadUserProfile();
};

/* ------------ CHANGEMENT MOT DE PASSE ------------ */
$("changePassBtn").onclick = async () => {
  const sid = getItem(SESSION_KEY);
  if (!sid) return;

  const users = load(USER_KEY);
  const u = users.find(x => x.registrantId === sid);
  if (!u) return;

  const old = prompt("Mot de passe actuel :");
  if (!old) return;

  const oldHash = await hash(old);
  if (oldHash !== u.passwordHash) return alert("Mot de passe incorrect.");

  const np = prompt("Nouveau mot de passe (min 6 caractères) :");
  if (!np || np.length < 6) return alert("Mot de passe trop court.");

  const np2 = prompt("Confirmez le mot de passe :");
  if (np !== np2) return alert("Confirmation incorrecte.");

  u.passwordHash = await hash(np);
  save(USER_KEY, users);

  alert("Mot de passe changé !");
};

/* Fin PARTIE 2/3 */

/* =============================================================
  app.js — PARTIE 3/3
  Carte PNG (style premium) + Admin panel + Auto-load session
  (Coller après PARTIE 1 & PARTIE 2)
  ============================================================= */

/* ------------------ CARTE : Téléchargement PNG (style premium) ------------------ */
if ($("downloadCardBtn")) {
  /* ============================================================
   TÉLÉCHARGEMENT CARTE VERSION PREMIUM (STYLE C — BLEU NUIT)
   Logo GRAND + Watermark FORT
   ============================================================ */
$("downloadCardBtn").onclick = async () => {
  try {
    const sid = getItem(SESSION_KEY);
    const regs = load(REG_KEY);
    const me = regs.find(x => x.id === sid);
    if (!me) return alert("Profil introuvable.");

    const Nom = me.nom || "—";
    const Prenom = me.prenom || "—";
    const Telephone = me.tel || "—";
    const Email = me.email || "—";
    const Adresse = me.adresse || "—";
    const Matricule = me.matricule || "—";

    /* Canvas HD */
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");

    /* ============================================================
       1) BACKGROUND BLEU NUIT PREMIUM
       ============================================================ */
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, "#011a33");
    bg.addColorStop(1, "#02284e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* ============================================================
       2) BANDE TURQUOISE PREMIUM
       ============================================================ */
    const band = ctx.createLinearGradient(0, 0, 0, canvas.height);
    band.addColorStop(0, "#0088ff");
    band.addColorStop(1, "#00c4ff");
    ctx.fillStyle = band;
    ctx.fillRect(720, 0, 200, canvas.height);

    /* ============================================================
       3) WATERMARK — LOGO DTM — OPACITY FORT (0.25)
       ============================================================ */
    const wm = new Image();
    wm.crossOrigin = "anonymous";
    wm.src = "/mnt/data/logo-dtm.png";

    await new Promise(res => wm.onload = res);

    ctx.save();
    ctx.globalAlpha = 0.25; // WATERMARK FORT
    ctx.drawImage(wm, 780, 170, 250, 250);
    ctx.restore();

    /* ============================================================
       4) LOGO ROND (GRAND)
       ============================================================ */
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = me.photoData || "/mnt/data/logo-dtm.png";

    await new Promise(res => logo.onload = res);

    const cx = 820;
    const cy = 350;
    const R = 140;   // GRAND CERCLE
    const R2 = 125;  // INTÉRIEUR

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, cx - R2, cy - R2, R2*2, R2*2);
    ctx.restore();

    /* ============================================================
       5) TITRES
       ============================================================ */
    ctx.fillStyle = "#4cc9ff";
    ctx.font = "bold 60px Inter";
    ctx.fillText(Nom + " " + Prenom, 60, 120);

    ctx.fillStyle = "#9ec7e6";
    ctx.font = "bold 34px Inter";
    ctx.fillText(me.statut || "Membre du Dahira", 60, 170);

    /* ============================================================
       6) ICÔNES + LABELS + VALEURS
       ============================================================ */
    function icon(y, e) {
      ctx.beginPath();
      ctx.arc(70, y, 28, 0, Math.PI*2);
      ctx.fillStyle = "#008cff";
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "30px Segoe UI Emoji";
      ctx.fillText(e, 55, y+12);
    }

    icon(250, "📞");
    icon(330, "✉️");
    icon(410, "📍");
    icon(490, "🆔");

    ctx.fillStyle = "#66d0ff";
    ctx.font = "bold 30px Inter";
    ctx.fillText("Téléphone", 120, 255);
    ctx.fillText("Email", 120, 335);
    ctx.fillText("Adresse", 120, 415);
    ctx.fillText("Matricule", 120, 495);

    ctx.fillStyle = "white";
    ctx.font = "28px Inter";
    ctx.fillText(Telephone, 260, 255);
    ctx.fillText(Email, 260, 335);
    ctx.fillText(Adresse, 260, 415);
    ctx.fillText(Matricule, 260, 495);

    /* ============================================================
       7) FOOTER
       ============================================================ */
    ctx.fillStyle = "#508bb7";
    ctx.font = "22px Inter";
    ctx.fillText("Généré le " + new Date().toLocaleDateString(), 60, 650);

    /* ============================================================
       8) EXPORT
       ============================================================ */
    const link = document.createElement("a");
    link.download = `carte_${Matricule}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

  } catch (err) {
    console.error(err);
    alert("Erreur lors de la génération de la carte.");
  }
};

}

/* ------------------ ADMIN PANEL ------------------ */
if ($("adminLogin")) {
  $("adminLogin").onclick = () => {
    const pwd = prompt("Mot de passe admin ?");
    if (pwd !== "admin123") return alert("Mot de passe admin incorrect.");
    // show admin controls
    if ($("adminLogout")) $("adminLogout").classList.remove("hidden");
    if ($("btnShowAll")) $("btnShowAll").classList.remove("hidden");
    if ($("exportCsv")) $("exportCsv").classList.remove("hidden");
    if ($("exportXlsx")) $("exportXlsx").classList.remove("hidden");
    if ($("clearAll")) $("clearAll").classList.remove("hidden");
    alert("Admin connecté.");
  };
}

if ($("adminLogout")) {
  $("adminLogout").onclick = () => {
    if ($("adminLogout")) $("adminLogout").classList.add("hidden");
    if ($("btnShowAll")) $("btnShowAll").classList.add("hidden");
    if ($("exportCsv")) $("exportCsv").classList.add("hidden");
    if ($("exportXlsx")) $("exportXlsx").classList.add("hidden");
    if ($("clearAll")) $("clearAll").classList.add("hidden");
    if ($("tableWrap")) $("tableWrap").classList.add("hidden");
    alert("Admin déconnecté.");
  };
}

/* Show all registrations in admin table */
if ($("btnShowAll")) {
  $("btnShowAll").onclick = () => {
    const regs = load(REG_KEY);
    const table = $("adminTable");
    if (!table) return alert("Table admin introuvable.");

    let html = "<thead><tr>";
    const headers = ["Matricule","Nom","Prénom","DOB","Tel","Email","Adresse","Dahira","Statut","Université","Niveau","Spécialité","Année","Disponibilités","Compétences","Domaine","Signature","Photo","Inscrit le","Actions"];
    headers.forEach(h => html += `<th>${h}</th>`);
    html += "</tr></thead><tbody>";

    regs.forEach(r => {
      html += `<tr>
        <td>${escapeHtml(r.matricule)}</td>
        <td>${escapeHtml(r.nom)}</td>
        <td>${escapeHtml(r.prenom)}</td>
        <td>${escapeHtml(r.dob || '')}</td>
        <td>${escapeHtml(r.tel || '')}</td>
        <td>${escapeHtml(r.email || '')}</td>
        <td>${escapeHtml(r.adresse || '')}</td>
        <td>${escapeHtml(r.statut_dahira || '')}</td>
        <td>${escapeHtml(r.statut || '')}</td>
        <td>${escapeHtml(r.universite || '')}</td>
        <td>${escapeHtml(r.niveau || '')}</td>
        <td>${escapeHtml(r.specialite || '')}</td>
        <td>${escapeHtml(r.annee_diplome || '')}</td>
        <td>${escapeHtml(r.disponibilites || '')}</td>
        <td>${escapeHtml(r.competences || '')}</td>
        <td>${escapeHtml(r.domaine || '')}</td>
        <td>${escapeHtml(r.signature || '')}</td>
        <td><img src="${r.photoData || window.DTM.helpers.DEFAULT_PHOTO}" style="width:56px;height:56px;object-fit:cover;border-radius:8px"/></td>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
        <td>
          <button class="btn btn-ghost adminEdit" data-id="${r.id}">Voir / Edit</button>
          <button class="btn btn-danger adminDel" data-id="${r.id}">Supprimer</button>
        </td>
      </tr>`;
    });

    html += "</tbody>";
    table.innerHTML = html;
    if ($("tableWrap")) $("tableWrap").classList.remove("hidden");

    // bind actions
    document.querySelectorAll(".adminDel").forEach(b => b.addEventListener('click', (ev) => {
      const id = ev.currentTarget.dataset.id;
      if (!confirm("Supprimer cet inscrit ?")) return;
      save(REG_KEY, load(REG_KEY).filter(x => x.id !== id));
      // remove user account too
      save(USER_KEY, load(USER_KEY).filter(u => u.registrantId !== id));
      alert("Supprimé.");
      if ($("btnShowAll")) $("btnShowAll").click();
    }));

    document.querySelectorAll(".adminEdit").forEach(b => b.addEventListener('click', (ev) => {
      const id = ev.currentTarget.dataset.id;
      openAdminEditModal(id);
    }));
  };
}

/* Admin edit modal using prompt (quick) */
function openAdminEditModal(id) {
  const regs = load(REG_KEY);
  const r = regs.find(x => x.id === id);
  if (!r) return alert("Inscrit non trouvé.");

  // show detail in prompts (quick edit). For full modal, replace with real modal UI.
  const newNom = prompt("Nom :", r.nom);
  if (newNom === null) return;
  const newPrenom = prompt("Prénom :", r.prenom);
  if (newPrenom === null) return;
  const newTel = prompt("Téléphone :", r.tel);
  if (newTel === null) return;

  r.nom = newNom.trim();
  r.prenom = newPrenom.trim();
  r.tel = newTel.trim();

  save(REG_KEY, regs);

  // sync username to email or tel
  const users = load(USER_KEY);
  const uidx = users.findIndex(u => u.registrantId === id);
  if (uidx !== -1) {
    users[uidx].username = r.email || r.tel;
    save(USER_KEY, users);
  }
  alert("Modifications enregistrées.");
  if ($("btnShowAll")) $("btnShowAll").click();
}

/* EXPORT CSV */
if ($("exportCsv")) {
  $("exportCsv").onclick = () => {
    const rows = load(REG_KEY);
    if (!rows.length) return alert("Aucune donnée à exporter.");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")].concat(rows.map(r => headers.map(h => `"${String(r[h] || '').replaceAll('"','""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = 'inscriptions_dtm.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

/* EXPORT XLSX (SheetJS required) */
if ($("exportXlsx")) {
  $("exportXlsx").onclick = () => {
    if (typeof XLSX === 'undefined') return alert("XLSX non chargé.");
    const rows = load(REG_KEY);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');
    XLSX.writeFile(wb, 'inscriptions_dtm.xlsx');
  };
}

/* CLEAR ALL */
if ($("clearAll")) {
  $("clearAll").onclick = () => {
    if (!confirm("Supprimer toutes les inscriptions et comptes ?")) return;
    localStorage.removeItem(REG_KEY);
    localStorage.removeItem(USER_KEY);
    alert("Base vidée.");
    if ($("tableWrap")) $("tableWrap").classList.add("hidden");
  };
}

/* ------------------ AUTOLOAD SESSION ON PAGE LOAD ------------------ */
(function autoloadSession() {
  document.addEventListener('DOMContentLoaded', () => {
    const sid = getItem(SESSION_KEY);
    if (sid) {
      if ($("btnLogin")) $("btnLogin").classList.add("hidden");
      if ($("btnLogout")) $("btnLogout").classList.remove("hidden");
      // load profile if function exists
      if (typeof loadUserProfile === 'function') loadUserProfile();
      showSection('userSection');
    } else {
      showSection('loginSection');
    }
  });
})();

/* Fin PARTIE 3/3 */
