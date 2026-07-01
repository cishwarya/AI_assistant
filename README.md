# INS Assist: Support-to-Sales Chat Widget

A chat widget for a European cloud/hosting/domains provider. It answers a
customer's support question first, then — only if genuinely relevant —
surfaces one soft product recommendation from the catalog.

## Stack

- **Backend:** Node + Express (`server.js`). Holds `ANTHROPIC_API_KEY` server-side
  and exposes `POST /api/chat`. The key never reaches the frontend.
- **Frontend:** Static HTML/CSS/JS in `public/` — a blue/white chat widget.
- **Model:** `claude-sonnet-4-6`, `max_tokens: 1024`.
- **Data:** `products.json` (catalog) is injected into `system-prompt.txt` at
  startup, replacing `{{PRODUCT_CATALOG}}`.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
npm start
```

Then open http://localhost:3000.

## How it works

1. On startup, the server reads `products.json` and `system-prompt.txt`,
   injecting the catalog JSON into the prompt template.
2. The frontend posts the full message history to `POST /api/chat`.
3. The server calls the Anthropic Messages API with that history and the
   system prompt, and parses Claude's reply — a strict JSON object:

   ```json
   {
     "reply": "the support answer",
     "upsell_opportunity": {
       "detected": true,
       "product_id": "cdn-plus",
       "reason": "internal note on why it fits",
       "pitch": "one soft customer-facing recommendation line"
     }
   }
   ```

   If Claude wraps the JSON in stray text or markdown fences, the server
   extracts the first balanced `{...}` object before parsing.
4. The frontend renders `reply` as a chat bubble. If `upsell_opportunity.detected`
   is `true`, it renders a product card below the bubble (name, price, pitch,
   and a "Learn more" button — currently logs to the console).

## Project structure

```
server.js            Express server + Anthropic API integration
products.json         Product catalog
system-prompt.txt     Behaviour instructions (catalog injected at {{PRODUCT_CATALOG}})
public/
  index.html          Chat widget markup
  styles.css          Blue/white IONOS-style UI
  app.js              Chat logic, rendering, product cards
```
