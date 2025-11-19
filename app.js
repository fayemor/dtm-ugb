$("downloadCardBtn").onclick = async () => {
  try {

    const sid = getItem(SESSION_KEY);
    if (!sid) return alert("Aucun utilisateur connecté.");

    const regs = load(REG_KEY);
    const me = regs.find(r => r.id === sid);
    if (!me) return alert("Profil introuvable.");

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 520;
    const ctx = canvas.getContext("2d");

    /* --------------------------------------------------
       1. FOND DÉGRADÉ
    -------------------------------------------------- */
    const grad = ctx.createLinearGradient(0, 0, 900, 520);
    grad.addColorStop(0, "#021026");
    grad.addColorStop(1, "#063b79");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 520);

    /* --------------------------------------------------
       2. WATERMARK LOGO (SAFE LOAD)
    -------------------------------------------------- */
    const wm = new Image();
    wm.crossOrigin = "anonymous";
    wm.src = me.photoData || DEFAULT_PHOTO;
    await new Promise(res => { wm.onload = res; wm.onerror = res; });

    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.drawImage(wm, 600, 260, 260, 260);
    ctx.restore();


    /* --------------------------------------------------
       3. BANDE GAUCHE
    -------------------------------------------------- */
    const grad2 = ctx.createLinearGradient(0, 0, 200, 520);
    grad2.addColorStop(0, "#009dff");
    grad2.addColorStop(1, "#0066cc");

    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, 170, 520);


    /* --------------------------------------------------
       4. PHOTO RONDE (SAFE LOAD)
    -------------------------------------------------- */
    const pimg = new Image();
    pimg.crossOrigin = "anonymous";
    pimg.src = me.photoData || DEFAULT_PHOTO;
    await new Promise(res => { pimg.onload = res; pimg.onerror = res; });

    const radius = 70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(110, 140, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(pimg, 110 - radius, 140 - radius, radius * 2, radius * 2);
    ctx.restore();


    /* --------------------------------------------------
       5. TEXTE
    -------------------------------------------------- */
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Inter";
    ctx.fillText("DAHIRA TOUBA MEDECINE", 210, 80);

    ctx.font = "bold 32px Inter";
    ctx.fillStyle = "#d7e9ff";
    ctx.fillText(`Nom : ${me.nom}`, 210, 150);
    ctx.fillText(`Prénom : ${me.prenom}`, 210, 200);

    ctx.font = "bold 30px Inter";
    ctx.fillStyle = "#bcd6ff";
    ctx.fillText(`Niveau : ${me.niveau}`, 210, 250);
    ctx.fillText(`Téléphone : ${me.tel}`, 210, 300);

    ctx.fillStyle = "#4bb3ff";
    ctx.font = "bold 38px Inter";
    ctx.fillText(`Matricule : ${me.matricule}`, 50, 430);


    /* --------------------------------------------------
       6. DOWNLOAD
    -------------------------------------------------- */
    const url = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = url;
    a.download = `carte_${me.matricule}.png`;
    a.click();

  } catch (e) {
    console.error(e);
    alert("Erreur lors de la génération de la carte.");
  }
};
