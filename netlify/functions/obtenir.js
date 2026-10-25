// Renvoie les infos d'un billet (par code, par numéro de transaction ou par téléphone).
const { getStore } = require("@netlify/blobs");
const QRCode = require("qrcode");

const chiffres = (s) => String(s || "").replace(/\D/g, "");

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const store = getStore({
    name: "billets",
    siteID: process.env.BLOBS_SITE_ID,
    token: process.env.BLOBS_TOKEN
  });

  let code = (q.code || "").toUpperCase().trim();

  if (!code && q.tx) {
    code = (await store.get("tx:" + q.tx)) || "";
  }

  if (!code && q.tel) {
    const fin = chiffres(q.tel).slice(-8);
    if (fin.length < 8) return { statusCode: 404, body: JSON.stringify({ ok: false }) };
    const liste = await store.list({ prefix: "billet:" });
    const tous = await Promise.all(
      (liste.blobs || []).map(async (x) => {
        try { return JSON.parse(await store.get(x.key)); } catch (e) { return null; }
      })
    );
    const trouves = tous
      .filter((b) => b && chiffres(b.telephone).slice(-8) === fin)
      .sort((a, b) => String(b.cree).localeCompare(String(a.cree)));
    if (trouves.length) code = trouves[0].code;
  }

  if (!code) return { statusCode: 404, body: JSON.stringify({ ok: false }) };

  const brut = await store.get("billet:" + code);
  if (!brut) return { statusCode: 404, body: JSON.stringify({ ok: false }) };

  const b = JSON.parse(brut);
  let qr = "";
  try { qr = await QRCode.toDataURL(b.code, { width: 280, margin: 1 }); } catch (e) {}

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, code: b.code, nom: b.nom, type: b.type, prix: b.prix, qr })
  };
};
