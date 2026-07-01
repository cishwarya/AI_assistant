require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY. Set it in a .env file before starting the server.");
  process.exit(1);
}

const productsRaw = fs.readFileSync(path.join(__dirname, "products.json"), "utf8");
const catalog = JSON.parse(productsRaw);

const systemPromptTemplate = fs.readFileSync(path.join(__dirname, "system-prompt.txt"), "utf8");
const SYSTEM_PROMPT = systemPromptTemplate.replace("{{PRODUCT_CATALOG}}", JSON.stringify(catalog, null, 2));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Extracts the first balanced {...} JSON object from a string, tolerating
// stray text or markdown fences the model may wrap around its JSON reply.
function extractJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
      } else if (ch === "\\") {
        escapeNext = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch (err) {
          return null;
        }
      }
    }
  }

  return null;
}

app.get("/api/products", (req, res) => {
  res.json(catalog);
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errBody);
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await anthropicRes.json();
    const textBlock = data.content.find((block) => block.type === "text");
    const rawText = textBlock ? textBlock.text : "";

    const parsed = extractJsonObject(rawText);

    if (!parsed || typeof parsed.reply !== "string") {
      console.error("Failed to parse model JSON response:", rawText);
      return res.json({
        reply: "Sorry, I had trouble putting that answer together. Could you rephrase your question?",
        upsell_opportunity: { detected: false, product_id: null, reason: null, pitch: null },
      });
    }

    if (!parsed.upsell_opportunity) {
      parsed.upsell_opportunity = { detected: false, product_id: null, reason: null, pitch: null };
    }

    res.json(parsed);
  } catch (err) {
    console.error("Chat request failed:", err);
    res.status(500).json({ error: "Something went wrong talking to the assistant." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`INS Assist chat widget running at http://localhost:${PORT}`);
});
