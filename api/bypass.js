const crypto = require("crypto");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

module.exports = async (req, res) => {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  // support GET & POST
  let url;
  if (req.method === "GET") {
    url = req.query?.url;
  } else if (req.method === "POST") {
    url = req.body?.url;
  } else {
    return res.status(405).json({ owner: "fidzzcodex", error: "Method not allowed" });
  }

  if (!url) return res.status(400).json({ owner: "fidzzcodex", error: "Parameter 'url' required" });

  try {
    const androidId = crypto.randomBytes(16).toString("hex");
    const deviceId = crypto.createHash("sha256").update(`bypasstools:${androidId}`).digest("hex");

    const initRes = await fetch("https://bypass.tools/api/mobile/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, platform: "android", appVersion: "1.0.0" }),
    });
    const initData = await initRes.json();
    const sessionToken = initData.sessionToken || initData.token || initData.data?.sessionToken;
    if (!sessionToken) return res.status(502).json({ owner: "fidzzcodex", error: "Init failed", raw: initData });

    const bypassRes = await fetch("https://bypass.tools/api/mobile/bypass", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
        "X-Device-ID": deviceId,
      },
      body: JSON.stringify({ url, forceRefresh: false }),
    });
    const data = await bypassRes.json();

    if (!bypassRes.ok) return res.status(502).json({ owner: "fidzzcodex", error: data.message || "Bypass failed", raw: data });

    const result = data.result || data.url || data.destination || data.bypassedUrl || data.data?.result || data.data?.url;
    if (!result) return res.status(502).json({ owner: "fidzzcodex", error: "No result", raw: data });

    return res.status(200).json({ owner: "fidzzcodex", result });
  } catch (err) {
    return res.status(500).json({ owner: "fidzzcodex", error: err.message });
  }
};
