// Renvoie les infos d'un billet à la page billet.html (par code ou par numéro de transaction).
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const store = getStore("billets");

  let code = (q.code || "").toUpperCase().trim();
  if (!code && q.tx) {
    code = (await store.get("tx:" + q.tx)) || "";
  }
  if (!code) return { statusCode: 404, body: JSON.stringify({ ok: false }) };

  const brut = await store.get("billet:" + code);
  if (!brut) return { statusCode: 404, body: JSON.stringify({ ok: false }) };

  const b = JSON.parse(brut);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, code: b.code, nom: b.nom, type: b.type, prix: b.prix })
  };
};
