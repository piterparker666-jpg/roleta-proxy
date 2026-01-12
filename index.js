import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const ORIGIN_URL = process.env.ORIGIN_URL;
const ORIGIN_USER = process.env.ORIGIN_USER;
const ORIGIN_PASS = process.env.ORIGIN_PASS;

app.get("/", async (req, res) => {
  try {
    const auth = Buffer.from(`${ORIGIN_USER}:${ORIGIN_PASS}`).toString("base64");
    const resp = await fetch(ORIGIN_URL, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const text = await resp.text();
    res.type("application/json").send({ ok: true, body: text });
  } catch (err) {
    res.status(500).send({ ok: false, error: err.message });
  }
});

app.get("/health", (req, res) => res.send({ ok: true }));

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
