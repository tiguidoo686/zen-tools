console.log("ENV CHECK:", process.env.PORT, process.env.ANTHROPIC_API_KEY ? "KEY OK" : "NO KEY");

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/claude", async (req, res) => {
  try {
    const { system, content } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("[claude] API key:", apiKey ? apiKey.slice(0, 10) + "..." : "MISSING");
    const requestBody = { model: "claude-sonnet-4-20250514", max_tokens: 1500, system, messages: [{ role: "user", content }] };
    console.log("[claude] Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (!response.ok) {
      console.log("[claude] Error response:", JSON.stringify(data, null, 2));
      return res.status(response.status).json({ error: data?.error?.message || JSON.stringify(data) });
    }
    const text = (data.content || []).map((b) => b.text || "").join("");
    res.json({ text });
  } catch (err) {
    console.log("[claude] Unhandled error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.use(express.static(join(__dirname, "dist")));
app.get("/{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
