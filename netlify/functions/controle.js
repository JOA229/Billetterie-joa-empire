// Contrôle à l'entrée : vérifie un code et le marque comme utilisé.
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const p = event.queryStringParameters || {};
  if (!process.env.ADMIN_PIN || p.pin !== process.env.ADMIN_PIN) {
    return { statusCode: 401, body: JSON.stringify({ message: "Code PIN incorrect" }) };
  }
  const code = String(p.code || "").trim().toUpperCase();
  const store = getStore({
    name: "billets",
    siteID: process.env.BLOBS_SITE_ID,
    token: process.env.BLOBS_TOKEN
  });
  const raw = await store.get("billet:" + code);
  if (!raw) return { statusCode: 200, body: JSON.stringify({ valide: false, message: "Billet inconnu" }) };

  const b = JSON.parse(raw);
  if (b.utilise) {
    return { statusCode: 200, body: JSON.stringify({ valide: false, message: "Déjà utilisé", nom: b.nom }) };
  }
  b.utilise = true;
  await store.set("billet:" + code, JSON.stringify(b));
  return { statusCode: 200, body: JSON.stringify({ valide: true, message: "Billet valide " + (b.type || ""), nom: b.nom }) };
};
