/* ============================================================
   Dahira Touba Médecine — APP LOGIC (Final 2025)
   Features:
   - Signup complet (tous champs obligatoires)
   - Login / Logout
   - Profil utilisateur (édition complète + changer mot de passe)
   - Bouton "Télécharger ma carte" (PNG via canvas)
   - Admin: login, voir inscriptions, éditer, supprimer, exporter CSV + XLSX
   - Matricule auto: DTM-YYYY-XXXX
   - Anti-doublon: tel ou email
   - Stockage: localStorage
   ============================================================ */

const REG_KEY = "dtm_regs_final_2025";
const USER_KEY = "dtm_users_final_2025";
const SEQ_KEY = "dtm_seq_final_2025";
const SESSION_KEY = "dtm_session_final_2025";

// LOGO utilisé aussi comme photo par défaut
const DEFAULT_PHOTO = "/mnt/data/11c109cc-f1ac-4e7a-bf3e-307a1235232f.png";

// Helpers
const $ = (id) => document.getElementById(id);
const load = (k) => JSON.parse(localStorage.getItem(k) || "[]");
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getItem = (k) => localStorage.getItem(k);
const setItem = (k, v) => localStorage.setItem(k, v);

// Hash (SHA-256)
async function hash(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ============================================================
   Matricule auto
   ============================================================ */
function getSeq() {
  return JSON.parse(localStorage.getItem(SEQ_KEY) || "{}");
}
function setSeq(obj) {
  localStorage.setItem(SEQ_KEY, JSON.stringify(obj));
}
function peekMatricule() {
  const seq = getSeq();
  const y = new Date().getFullYear();
  const next = (seq[y] || 0) + 1;
  return `DTM-${y}-${String(next).padStart(4, "0")}`;
}
function nextMatricule() {
  const seq = getSeq();
  const y = new Date().getFullYear();
  seq[y] = (seq[y] || 0) + 1;
  setSeq(seq);
  return `DTM-${y}-${String(seq[y]).padStart(4, "0")}`;
}
if ($("nextMatPreview"))
  $("nextMatPreview").textContent = peekMatricule();

/* ============================================================
   INIT SAMPLE (1 fake user si vide)
   ============================================================ */
(function init() {
  const regs = load(REG_KEY);
  if (!regs.length) {
    const id = "reg-" + Date.now().toString(36);
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
      createdAt: new Date().toISOString(),
    };
    save(REG_KEY, [sample]);

    hash("password123").then((h) => {
      save(USER_KEY, [
        {
          username: "sample@example.com",
          passwordHash: h,
          registrantId: id,
          role: "user",
        },
      ]);
    });
  }
})();

/* ============================================================
   NAVIGATION ENTRE SECTIONS
   ============================================================ */
function showSection(id) {
  document.querySelectorAll(".pageSection").forEach((s) =>
    s.classList.add("hidden")
  );
  $(id).classList.remove("hidden");
}

// open signup
$("btnCreateAccount").onclick = () => showSection("signupSection");
$("gotoSignup").onclick = () => showSection("signupSection");

// profile button
$("btnProfile").onclick = () => {
  const sid = getItem(SESSION_KEY);
  if (!sid) showSection("loginSection");
  else {
    loadUserProfile();
    showSection("userSection");
  }
};

/* ============================================================
   LOGIN
   ============================================================ */
$("btnLogin").onclick = async () => {
  const ident = $("loginUser").value.trim();
  const pass = $("loginPass").value;

  if (!ident || !pass) return alert("Identifiant + mot de passe requis.");

  const users = load(USER_KEY);
  const u = users.find((x) => x.username === ident && x.role === "user");
  if (!u) return alert("Compte introuvable.");

  const h = await hash(pass);
  if (h !== u.passwordHash) return alert("Mot de passe incorrect.");

  setItem(SESSION_KEY, u.registrantId);
  $("btnLogin").classList.add("hidden");
  $("btnLogout").classList.remove("hidden");

  loadUserProfile();
  showSection("userSection");
};

/* LOGOUT */
$("btnLogout").onclick = () => {
  localStorage.removeItem(SESSION_KEY);
  $("btnLogout").classList.add("hidden");
  $("btnLogin").classList.remove("hidden");
  showSection("loginSection");
};

/* ============================================================
   SIGNUP / REGISTRATION
   ============================================================ */
$("regForm").onsubmit = async (e) => {
  e.preventDefault();

  const fields = [
    "nom","prenom","dob","lieu_naiss","sexe","nationalite","tel","email",
    "adresse","statut_dahira","statut","universite","niveau","specialite",
    "annee_diplome","disponibilites","competences","domaine","signature",
    "password","password2"
  ];

  const data = {};
  for (const f of fields) {
    const el = $(f);
    if (!el.value.trim())
      return alert("Veuillez remplir tous les champs obligatoires.");
    data[f] = el.value.trim();
  }

  if (!$("consent").checked)
    return alert("Vous devez accepter le consentement.");

  if (data.password !== data.password2)
    return alert("Les mots de passe ne correspondent pas.");

  // anti doublon
  const regs = load(REG_KEY);
  if (regs.some((r) => r.tel === data.tel || r.email === data.email))
    return alert("Un compte avec ce numéro/email existe déjà.");

  // photo
  let photoData = DEFAULT_PHOTO;
  if ($("photo").files[0]) {
    const file = $("photo").files[0];
    photoData = await fileToDataUrl(file);
  }

  // create registrant
  const matricule = nextMatricule();
  const id = "reg-" + Date.now().toString(36);

  const entry = {
    id,
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
    createdAt: new Date().toISOString(),
  };

  regs.push(entry);
  save(REG_KEY, regs);

  // user
  const users = load(USER_KEY);
  users.push({
    username: data.email || data.tel,
    passwordHash: await hash(data.password),
    registrantId: id,
    role: "user",
  });
  save(USER_KEY, users);

  alert("Inscription réussie ! Matricule : " + matricule);

  $("regForm").reset();
  if ($("nextMatPreview")) $("nextMatPreview").textContent = peekMatricule();
  showSection("loginSection");
};

/* Convert file to DataURL */
function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* ============================================================
   LOAD USER PROFILE
   ============================================================ */
function loadUserProfile() {
  const sid = getItem(SESSION_KEY);
  if (!sid) return;

  const regs = load(REG_KEY);
  const me = regs.find((x) => x.id === sid);
  if (!me) return;

  $("userMat").textContent = me.matricule;

  const fields = [
    ["nom", "Nom"],
    ["prenom", "Prénom"],
    ["dob", "Date de naissance"],
    ["lieu_naiss", "Lieu de naissance"],
    ["sexe", "Sexe"],
    ["nationalite", "Nationalité"],
    ["tel", "Téléphone"],
    ["email", "Email"],
    ["adresse", "Adresse"],
    ["statut_dahira", "Statut Dahira"],
    ["statut", "Statut académique"],
    ["universite", "Université"],
    ["niveau", "Niveau"],
    ["specialite", "Spécialité"],
    ["annee_diplome", "Année diplôme"],
    ["disponibilites", "Disponibilités"],
    ["competences", "Compétences"],
    ["domaine", "Domaine"],
    ["signature", "Signature"],
  ];

  const box = $("userDetails");
  box.innerHTML = "";

  // photo
  const img = document.createElement("img");
  img.src = me.photoData || DEFAULT_PHOTO;
  img.className = "badge-photo";
  box.appendChild(img);

  // all fields editable
  fields.forEach(([k, label]) => {
    const wrap = document.createElement("div");
    const lab = document.createElement("label");
    lab.className = "field-label";
    lab.textContent = label;

    const inp = document.createElement("input");
    inp.className = "input";
    inp.id = "user_" + k;
    inp.value = me[k] || "";

    wrap.appendChild(lab);
    wrap.appendChild(inp);
    box.appendChild(wrap);
  });

  // changer photo
  const phLab = document.createElement("label");
  phLab.textContent = "Changer photo";
  phLab.className = "field-label";
  const phInput = document.createElement("input");
  phInput.type = "file";
  phInput.id = "user_photo";
  phInput.className = "input";

  box.appendChild(phLab);
  box.appendChild(phInput);

  // badge preview
  const wrap = $("badgeWrap");
  wrap.innerHTML = `
    <div class="card badge-preview">
      <img src="${me.photoData}" class="badge-photo"/>
      <div>
        <div class="badge-name">${me.nom} ${me.prenom}</div>
        <div class="badge-mat">${me.matricule}</div>
      </div>
    </div>
  `;
}

/* ============================================================
   SAVE USER EDITS
   ============================================================ */
$("userSaveBtn").onclick = async () => {
  const sid = getItem(SESSION_KEY);
  if (!sid) return;

  const regs = load(REG_KEY);
  const idx = regs.findIndex((r) => r.id === sid);
  if (idx === -1) return;

  const me = regs[idx];
  const fields = [
    "nom","prenom","dob","lieu_naiss","sexe","nationalite","tel","email",
    "adresse","statut_dahira","statut","universite","niveau","specialite",
    "annee_diplome","disponibilites","competences","domaine","signature"
  ];

  fields.forEach((k) => {
    const el = $("user_" + k);
    if (el) me[k] = el.value.trim();
  });

  // photo
  if ($("user_photo").files[0]) {
    me.photoData = await fileToDataUrl($("user_photo").files[0]);
  }

  save(REG_KEY, regs);

  // update username
  const users = load(USER_KEY);
  const u = users.find((x) => x.registrantId === sid);
  if (u) {
    u.username = me.email || me.tel;
    save(USER_KEY, users);
  }

  alert("Profil mis à jour !");
  loadUserProfile();
};

/* ============================================================
   CHANGE PASSWORD
   ============================================================ */
$("changePassBtn").onclick = async () => {
  const sid = getItem(SESSION_KEY);
  if (!sid) return;

  const users = load(USER_KEY);
  const u = users.find((x) => x.registrantId === sid);
  if (!u) return;

  const old = prompt("Mot de passe actuel :");
  if (!old) return;

  if ((await hash(old)) !== u.passwordHash)
    return alert("Mot de passe actuel incorrect.");

  const np = prompt("Nouveau mot de passe :");
  if (!np || np.length < 6)
    return alert("Minimum 6 caractères.");

  const np2 = prompt("Confirmez le mot de passe :");
  if (np !== np2) return alert("Confirmation incorrecte.");

  u.passwordHash = await hash(np);
  save(USER_KEY, users);

  alert("Mot de passe changé !");
};

/* ============================================================
   TÉLÉCHARGER LA CARTE (PNG via canvas)
   ============================================================ */
$("downloadCardBtn").onclick = async () => {
  const sid = getItem(SESSION_KEY);
  const regs = load(REG_KEY);
  const me = regs.find((x) => x.id === sid);
  if (!me) return;

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 450;
  const ctx = canvas.getContext("2d");

  // fond
  const g = ctx.createLinearGradient(0, 0, 800, 450);
  g.addColorStop(0, "#041733");
  g.addColorStop(1, "#062046");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 800, 450);

  ctx.fillStyle = "white";
  ctx.font = "bold 32px Inter";
  ctx.fillText("DAHIRA TOUBA MEDECINE", 30, 50);

  // photo
  const img = new Image();
  img.src = me.photoData;
  await img.decode();
  ctx.drawImage(img, 30, 90, 140, 140);

  ctx.font = "26px Inter";
  ctx.fillStyle = "#a7d7ff";
  ctx.fillText("Nom : " + me.nom, 200, 130);
  ctx.fillText("Prénom : " + me.prenom, 200, 170);
  ctx.fillText("Niveau : " + me.niveau, 200, 210);
  ctx.fillText("Téléphone : " + me.tel, 200, 250);

  ctx.fillStyle = "#66aaff";
  ctx.font = "bold 28px Inter";
  ctx.fillText("Matricule : " + me.matricule, 30, 300);

  // download
  const link = document.createElement("a");
  link.download = `carte_${me.matricule}.png`;
  link.href = canvas.toDataURL();
  link.click();
};

/* ============================================================
   ADMIN
   ============================================================ */
$("adminLogin").onclick = () => {
  const pwd = prompt("Mot de passe admin ?");
  if (pwd !== "admin123") return alert("Incorrect.");
  $("adminLogout").classList.remove("hidden");
  $("btnShowAll").classList.remove("hidden");
  $("exportCsv").classList.remove("hidden");
  $("exportXlsx").classList.remove("hidden");
  $("clearAll").classList.remove("hidden");
};

$("adminLogout").onclick = () => {
  $("adminLogout").classList.add("hidden");
  $("btnShowAll").classList.add("hidden");
  $("exportCsv").classList.add("hidden");
  $("exportXlsx").classList.add("hidden");
  $("clearAll").classList.add("hidden");
  $("tableWrap").classList.add("hidden");
};

/* SHOW TABLE */
$("btnShowAll").onclick = () => {
  const regs = load(REG_KEY);
  const table = $("adminTable");

  let html = `
    <thead>
      <tr>
        <th>Matricule</th><th>Nom</th><th>Prénom</th><th>DOB</th>
        <th>Tel</th><th>Email</th><th>Adresse</th><th>Dahira</th>
        <th>Statut</th><th>Université</th><th>Niveau</th>
        <th>Spécialité</th><th>Année</th><th>Disponibilités</th>
        <th>Compétences</th><th>Domaine</th><th>Signature</th>
        <th>Photo</th><th>Date</th><th>Actions</th>
      </tr>
    </thead><tbody>
  `;

  regs.forEach((r) => {
    html += `
      <tr>
        <td>${r.matricule}</td>
        <td>${escape(r.nom)}</td>
        <td>${escape(r.prenom)}</td>
        <td>${r.dob}</td>
        <td>${escape(r.tel)}</td>
        <td>${escape(r.email)}</td>
        <td>${escape(r.adresse)}</td>
        <td>${escape(r.statut_dahira)}</td>
        <td>${escape(r.statut)}</td>
        <td>${escape(r.universite)}</td>
        <td>${escape(r.niveau)}</td>
        <td>${escape(r.specialite)}</td>
        <td>${escape(r.annee_diplome)}</td>
        <td>${escape(r.disponibilites)}</td>
        <td>${escape(r.competences)}</td>
        <td>${escape(r.domaine)}</td>
        <td>${escape(r.signature)}</td>
        <td><img src="${r.photoData}" style="width:55px;height:55px;border-radius:8px"/></td>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
        <td>
          <button class="btn btn-ghost adminEdit" data-id="${r.id}">Modifier</button>
          <button class="btn btn-danger adminDel" data-id="${r.id}">Supprimer</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody>";
  table.innerHTML = html;
  $("tableWrap").classList.remove("hidden");

  document.querySelectorAll(".adminDel").forEach((b) =>
    b.onclick = () => adminDelete(b.dataset.id)
  );

  document.querySelectorAll(".adminEdit").forEach((b) =>
    b.onclick = () => adminEdit(b.dataset.id)
  );
};

function escape(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;");
}

function adminDelete(id) {
  if (!confirm("Supprimer ?")) return;
  save(REG_KEY, load(REG_KEY).filter((x) => x.id !== id));
  save(
    USER_KEY,
    load(USER_KEY).filter((x) => x.registrantId !== id)
  );
  $("btnShowAll").click();
}

function adminEdit(id) {
  const regs = load(REG_KEY);
  const r = regs.find((x) => x.id === id);
  if (!r) return;

  const newNom = prompt("Nom :", r.nom);
  if (newNom === null) return;
  const newPrenom = prompt("Prénom :", r.prenom);
  if (newPrenom === null) return;
  const newTel = prompt("Téléphone :", r.tel);
  if (newTel === null) return;

  r.nom = newNom;
  r.prenom = newPrenom;
  r.tel = newTel;

  save(REG_KEY, regs);

  // sync username
  const users = load(USER_KEY);
  const u = users.find((x) => x.registrantId === id);
  if (u) {
    u.username = r.email || r.tel;
    save(USER_KEY, users);
  }

  alert("Modifié !");
  $("btnShowAll").click();
}

/* EXPORT CSV */
$("exportCsv").onclick = () => {
  const rows = load(REG_KEY);
  if (!rows.length) return alert("Rien à exporter.");

  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(
      rows.map((r) =>
        headers
          .map((h) => `"${String(r[h] || "").replaceAll('"', '""')}"`)
          .join(",")
      )
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inscriptions_dtm.csv";
  a.click();
};

/* EXPORT XLSX */
$("exportXlsx").onclick = () => {
  if (typeof XLSX === "undefined") return alert("XLSX non disponible.");
  const ws = XLSX.utils.json_to_sheet(load(REG_KEY));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inscriptions");
  XLSX.writeFile(wb, "inscriptions_dtm.xlsx");
};

/* CLEAR ALL */
$("clearAll").onclick = () => {
  if (!confirm("Vider toute la base ?")) return;
  localStorage.removeItem(REG_KEY);
  localStorage.removeItem(USER_KEY);
  alert("Base vidée.");
  $("tableWrap").classList.add("hidden");
};

/* ============================================================
   AUTOLOAD SESSION
   ============================================================ */
(function auto() {
  if (getItem(SESSION_KEY)) {
    $("btnLogin").classList.add("hidden");
    $("btnLogout").classList.remove("hidden");
    loadUserProfile();
    showSection("userSection");
  } else {
    showSection("loginSection");
  }
})();
