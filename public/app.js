(() => {
  const messagesEl = document.getElementById("messages");
  const composerEl = document.getElementById("composer");
  const inputEl = document.getElementById("input");
  const sendBtn = document.getElementById("send-btn");

  // Full message history sent to /api/chat. Assistant turns store the raw
  // JSON text the model produced, so the model sees its own prior output
  // in the exact format the system prompt asks it to respond in.
  const history = [];

  let productCatalog = {};

  async function loadCatalog() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      productCatalog = {};
      (data.products || []).forEach((p) => {
        productCatalog[p.id] = p;
      });
    } catch (err) {
      console.error("Failed to load product catalog", err);
    }
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addBubble(text, role) {
    const bubble = document.createElement("div");
    bubble.className = `bubble bubble--${role === "user" ? "user" : "bot"}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function addProductCard(upsell) {
    const product = productCatalog[upsell.product_id];
    if (!product) return;

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card__eyebrow">One option that could help</div>
      <div class="product-card__name">${escapeHtml(product.name)}</div>
      <div class="product-card__price">${escapeHtml(product.price)}</div>
      <div class="product-card__pitch">${escapeHtml(upsell.pitch || product.summary)}</div>
      <button class="product-card__cta" type="button">Learn more</button>
    `;

    card.querySelector(".product-card__cta").addEventListener("click", () => {
      console.log("Learn more clicked for product:", product.id, product);
    });

    messagesEl.appendChild(card);
    scrollToBottom();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.id = "typing-indicator";
    typing.innerHTML = `
      <span class="typing__dot"></span>
      <span class="typing__dot"></span>
      <span class="typing__dot"></span>
    `;
    messagesEl.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    const typing = document.getElementById("typing-indicator");
    if (typing) typing.remove();
  }

  async function sendMessage(text) {
    history.push({ role: "user", content: text });
    addBubble(text, "user");

    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      hideTyping();

      if (!res.ok) {
        addBubble("Sorry, something went wrong. Please try again.", "bot");
        return;
      }

      history.push({ role: "assistant", content: JSON.stringify(data) });

      addBubble(data.reply, "bot");

      if (data.upsell_opportunity && data.upsell_opportunity.detected) {
        addProductCard(data.upsell_opportunity);
      }
    } catch (err) {
      hideTyping();
      console.error("Chat request failed", err);
      addBubble("Sorry, I couldn't reach the assistant. Please try again.", "bot");
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  composerEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    sendMessage(text);
  });

  loadCatalog().then(() => {
    addBubble("Hi, I'm INS Assist. How can I help with your hosting, domain, or email today?", "bot");
  });
})();
