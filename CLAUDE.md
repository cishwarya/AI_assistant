# IONOS Assist — Support-to-Sales Chat Widget

## What we're building
A web chat widget for IONOS (European cloud/hosting/domains provider) that
answers a customer's support question FIRST, then — only if genuinely relevant —
surfaces ONE soft product recommendation. Support first, upsell second.

## Stack (keep it simple)
- Node + Express backend (server.js) that holds the Anthropic API key in an
  env var and exposes POST /api/chat. The key must never reach the frontend.
- Static frontend (public/): a clean, IONOS-style blue/white chat UI.
- Model: claude-sonnet-4-6, max_tokens 1024.

## Behaviour contract
- The bot returns strict JSON: { reply, upsell_opportunity: { detected,
  product_id, reason, pitch } }.
- reply = the support answer. Always useful on its own.
- upsell_opportunity.detected is true ONLY when a catalog product genuinely
  fits. Max one recommendation. If nothing fits, detected=false, no card.
- Frontend renders reply as a chat bubble; when detected is true, render a soft
  product card below it (name, price, pitch, "Learn more").

## Data files (already in repo)
- products.json — the catalog the bot may recommend from.
- system-prompt.txt — the full behaviour instructions; inject products.json
  into it where it says {{PRODUCT_CATALOG}}.
