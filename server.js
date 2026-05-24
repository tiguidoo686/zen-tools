// Railway environment variables required:
// - ANTHROPIC_API_KEY
// - SUPABASE_URL
// - SUPABASE_KEY (anon/public key)

console.log("ENV CHECK:", process.env.PORT, process.env.ANTHROPIC_API_KEY ? "KEY OK" : "NO KEY");
console.log("Supabase URL:", process.env.SUPABASE_URL ? "OK" : "MISSING");
console.log("Supabase KEY:", process.env.SUPABASE_KEY ? "OK" : "MISSING");

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post("/api/claude", async (req, res) => {
  try {
    const { system, content } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("[claude] API key:", apiKey ? apiKey.slice(0, 10) + "..." : "MISSING");
    const requestBody = { model: "claude-sonnet-4-6", max_tokens: 1500, system, messages: [{ role: "user", content }] };
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

app.post("/api/history", async (req, res) => {
  try {
    const { prompt, result } = req.body;
    console.log("[history] Saving to Supabase:", { promptLen: (prompt || "").length, resultLen: (result || "").length });
    const response = await supabase
      .from("zen_tools_history")
      .insert({ prompt, result });
    console.log("[history] Supabase response:", JSON.stringify(response));
    const { error } = response;
    if (error) {
      console.log("[history] Save failed:", error.message, error.code, error.details);
      throw error;
    }
    console.log("[history] Saved successfully.");
    res.json({ ok: true });
  } catch (err) {
    console.log("[history] Save error (catch):", err.message || err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("zen_tools_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    console.log("[history] Fetch rows:", data ? data.length : 0, error ? "error:" + error.message : "no error");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.log("[history] Fetch error:", err.message || err);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(join(__dirname, "dist")));
app.get("/{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
