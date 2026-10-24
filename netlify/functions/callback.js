// Reçoit l'appel de PayPlus quand un paiement réussit, crée le billet et l'enregistre.
const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

// Prix en FCFA -> type de billet
const TYPES = { 10000: "STANDARD", 15000: "VIP", 20000: "SOUTIEN" };

function genCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(5);
  let c = "";
  for (let i = 0; i < 5; i++) c += a[bytes[i] % a.length];
  return "JOA-" + c;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 200, body: "OK" };

  const secret = (event.queryStringParameters || {}).secret;
  if (!process.env.CALLBACK_SECRET || secret !== process.env.CALLBACK_SECRET) {
    return { statusCode: 401, body: "Non autorisé" };
  }

  let data = {};
  try { data = JSON.parse(event.body || "{}"); }
  catch (e) { data = Object.fromEntries(new URLSearchParams(event.body || "")); }

  // Journal : permet de voir exactement ce que PayPlus envoie (Netlify > Logs > Functions)
  console.log("CALLBACK PAYPLUS:", JSON.stringify(data));

  const statut = String(data.status || data.statut || data.payment_status || "").toLowerCase();
  const reussi = ["success", "successful", "completed", "paid", "approved", "ok", "1", "00"].includes(statut);
  if (!reussi) return { statusCode: 200, body: "Paiement non réussi, aucun billet créé" };

  const transactionId = String(data.transaction_id || data.transactionId || data.reference || data.id || "");
  if (!transactionId) return { statusCode: 400, body: "Identifiant de transaction manquant" };

  const store = getStore("billets");
  const existant = await store.get("tx:" + transactionId);
  if (existant) return { statusCode: 200, body: "Billet déjà créé" };

  const montant = parseInt(String(data.amount || data.montant || "0").replace(/\D/g, ""), 10) || 0;
  const type = TYPES[montant] || "STANDARD";

  const prenom = data.customer_firstname || data.firstname || data.prenom || "";
  const nomFamille = data.customer_lastname || data.lastname || data.nom || "";
  const complet = (prenom + " " + nomFamille).trim() || data.customer_name || data.client_name || data.name || "Participant";

  const code = genCode();
  const billet = {
    code, transactionId, nom: complet, type,
    prix: montant ? montant.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") : "",
    telephone: data.customer_phone || data.phone || data.telephone || "",
    cree: new Date().toISOString(), utilise: false
  };

  await store.set("billet:" + code, JSON.stringify(billet));
  await store.set("tx:" + transactionId, code);
  return { statusCode: 200, body: JSON.stringify({ ok: true, code }) };
};
