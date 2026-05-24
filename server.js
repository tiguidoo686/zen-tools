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
    const requestBody = { model: "claude-sonnet-4-6", max_tokens: 6000, system, messages: [{ role: "user", content }] };
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
    console.log("[history] GET — querying table: zen_tools_history");
    const response = await supabase
      .from("zen_tools_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    console.log("[history] GET full response:", JSON.stringify(response));
    const { data, error } = response;
    if (error) throw error;
    console.log("[history] GET rows returned:", data ? data.length : 0);
    res.json(data);
  } catch (err) {
    console.log("[history] Fetch error:", err.message || err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history/test", async (req, res) => {
  const results = {};
  try {
    const insertResp = await supabase
      .from("zen_tools_history")
      .insert({ prompt: "[test] ping", result: "[test] pong" });
    results.insert = JSON.stringify(insertResp);
    console.log("[history/test] Insert response:", results.insert);
  } catch (err) {
    results.insertError = err.message;
    console.log("[history/test] Insert error:", err.message);
  }
  try {
    const selectResp = await supabase
      .from("zen_tools_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    results.select = JSON.stringify(selectResp);
    console.log("[history/test] Select response:", results.select);
  } catch (err) {
    results.selectError = err.message;
    console.log("[history/test] Select error:", err.message);
  }
  res.json(results);
});


app.post("/api/sessions", async (req, res) => {
  try {
    const { objective } = req.body;
    console.log("[sessions] Creating:", (objective || "").slice(0, 50));
    const { data, error } = await supabase.from("zen_sessions").insert({ objective, status: "active" }).select().single();
    console.log("[sessions] Response:", JSON.stringify({ data: data?.id, error }));
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[sessions] Create error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_sessions").select("*").order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { console.log("[sessions] Fetch error:", err.message); res.status(500).json({ error: err.message }); }
});

app.patch("/api/sessions/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_sessions").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[sessions] Update error:", err.message); res.status(500).json({ error: err.message }); }
});

app.post("/api/steps", async (req, res) => {
  try {
    const { session_id, text } = req.body;
    const { data, error } = await supabase.from("zen_steps").insert({ session_id, text, completed: false }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[steps] Create error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/steps/:sessionId", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_steps").select("*").eq("session_id", req.params.sessionId).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { console.log("[steps] Fetch error:", err.message); res.status(500).json({ error: err.message }); }
});

app.patch("/api/steps/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_steps").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[steps] Update error:", err.message); res.status(500).json({ error: err.message }); }
});

app.delete("/api/steps/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("zen_steps").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { console.log("[steps] Delete error:", err.message); res.status(500).json({ error: err.message }); }
});

app.post("/api/parking", async (req, res) => {
  try {
    const { session_id, content } = req.body;
    const { data, error } = await supabase.from("zen_parking_lot").insert({ session_id, content }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.log("[parking] Create error:", err.message); res.status(500).json({ error: err.message }); }
});

app.delete("/api/parking/session/:sessionId", async (req, res) => {
  try {
    const { error } = await supabase.from("zen_parking_lot").delete().eq("session_id", req.params.sessionId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { console.log("[parking] Clear error:", err.message); res.status(500).json({ error: err.message }); }
});

app.get("/api/parking/:sessionId", async (req, res) => {
  try {
    const { data, error } = await supabase.from("zen_parking_lot").select("*").eq("session_id", req.params.sessionId).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { console.log("[parking] Fetch error:", err.message); res.status(500).json({ error: err.message }); }
});

app.delete("/api/parking/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("zen_parking_lot").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { console.log("[parking] Delete error:", err.message); res.status(500).json({ error: err.message }); }
});

app.use(express.static(join(__dirname, "dist")));
app.get("/{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
