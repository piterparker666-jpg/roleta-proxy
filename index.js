import http from "http";

const PORT = process.env.PORT || 10000;

// ORIGEM (API Pragmatic)
const ORIGIN_URL  = (process.env.ORIGIN_URL  || "http://189.1.172.114:8080/api-pragmatic/Brasileira_Roleta/results.json").trim();
const ORIGIN_USER = (process.env.ORIGIN_USER || "AmadeuF").trim();
const ORIGIN_PASS = (process.env.ORIGIN_PASS || "COLOQUE_SUA_SENHA_AQUI").trim();

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,accept",
    "cache-control": "no-store"
  });
  res.end(body);
}

async function fetchOrigin() {
  const u = new URL(ORIGIN_URL);
  u.searchParams.set("_", Date.now().toString()); // cache-buster

  const headers = {
    "accept": "application/json,text/plain,*/*",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "user-agent": "Amadeu-Roleta/1.0 (Render)"
  };

  // Basic Auth
  if (ORIGIN_USER) {
    const token = Buffer.from(`${ORIGIN_USER}:${ORIGIN_PASS}`).toString("base64");
    headers["authorization"] = `Basic ${token}`;
  }

  const r = await fetch(u.toString(), { method: "GET", headers, redirect: "follow" });
  const text = await r.text();
  return { status: r.status, text };
}

function extractNumbers(text) {
  // tenta JSON primeiro
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j)) {
      return j.map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 36);
    }
  } catch (_) {}

  // fallback: regex
  const m = text.match(/\b\d+\b/g);
  const nums = (m || []).map(n => Number(n)).filter(n => Number.isFinite(n) && n >= 0 && n <= 36);

  // remove duplicados mantendo ordem
  const seen = new Set();
  const out = [];
  for (const n of nums) {
    if (!seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 200, { ok: true });

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (path === "/health") return json(res, 200, { ok: true });

    const t0 = Date.now();
    const { status, text } = await fetchOrigin();
    const ms = Date.now() - t0;

    if (path === "/raw") {
      res.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      });
      return res.end(text);
    }

    const items = extractNumbers(text);

    if (status >= 400) {
      return json(res, 200, {
        ok: false,
        status,
        items: [],
        roulette: "Brasileira_Roleta",
        hint: `Upstream HTTP ${status} (senha/user errados ou bloqueio por IP).`,
        sample: text.slice(0, 200),
        ms
      });
    }

    // padrão: JSON com números
    return json(res, 200, {
      ok: true,
      status,
      roulette: "Brasileira_Roleta",
      items,
      ms
    });
  } catch (e) {
    return json(res, 200, { ok: false, status: 0, items: [], hint: String(e?.message || e) });
  }
});

server.listen(PORT, () => {
  console.log("Listening on", PORT);
});
