// ===================== CONFIG =====================
const API_BASE = "http://localhost:5000/api"; // ou "/api" si tu sers le front via Flask
const TAX_RATE = 0.14975; // tu peux aussi le récupérer via une config backend plus tard

// ===================== STATE =====================
let cart = [];                 // { lineId, type:'item'|'discount', productId, name, price, qty, parentLineId?, barcode?, unite_mesure? }
let selectedLineId = null;
let suspendedCarts = [];       // tu peux plus tard persister côté DB

// Admin modal (démo)
let pendingAdminAction = null;
const ADMIN_PIN = "1234";

// ===================== HELPERS =====================
const $ = (id) => document.getElementById(id);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data;
}

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ===================== API: PRODUCTS =====================
// Attendu: GET /api/products2?search=xxx&active=1&limit=8 -> {success:true, data:[{id_produit, nom, prix_unitaire, code_barre, unite_mesure, ...}]}
async function apiSearchProducts(q) {
  const params = new URLSearchParams();
  params.set("search", q);
  params.set("active", "1");
  params.set("limit", "8");
  const resp = await fetchJson(`${API_BASE}/products2?${params.toString()}`);
  return resp.data || [];
}

// Attendu: GET /api/products2/lookup?barcode=100001 -> {success:true, data:{...}}
// Fallback: GET /api/products2?search=<barcode>&limit=1
async function apiGetProductByBarcode(barcode) {
  const code = String(barcode || "").trim();
  if (!code) return null;

  // Option A
  try {
    const resp = await fetchJson(`${API_BASE}/products2/lookup?barcode=${encodeURIComponent(code)}`);
    return resp.data || null;
  } catch (e) {
    // ignore -> fallback
  }

  // Option B (fallback)
  const params = new URLSearchParams();
  params.set("search", code);
  params.set("active", "1");
  params.set("limit", "1");
  const resp2 = await fetchJson(`${API_BASE}/products2?${params.toString()}`);
  return (resp2.data && resp2.data[0]) ? resp2.data[0] : null;
}

// ===================== CART LOGIC =====================
function computeTotals() {
  let sub = 0;
  for (const line of cart) {
    if (line.type === "item") sub += line.price * line.qty;
    if (line.type === "discount") sub += line.price; // négatif
  }
  const tax = sub * TAX_RATE;
  const total = sub + tax;
  return { sub, tax, total };
}

function addItemFromApiProduct(p, qty = 1) {
  // Normaliser la forme du produit backend vers le format front
  const productId = p.id_produit ?? p.id ?? p.product_id;
  const name = p.nom ?? p.name ?? "Produit";
  const price = Number(p.prix_unitaire ?? p.price ?? 0);
  const barcode = p.code_barre ?? p.barcode ?? null;
  const unite = p.unite_mesure ?? p.unite ?? null;

  if (!productId || !price) {
    alert("Produit invalide (id/prix manquant).");
    return;
  }

  const existing = cart.find(l => l.type === "item" && l.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      lineId: uid(),
      type: "item",
      productId,
      name,
      price,
      qty,
      barcode,
      unite_mesure: unite
    });
  }
  render();
}

function removeLine(lineId) {
  cart = cart.filter(l => l.lineId !== lineId && l.parentLineId !== lineId);
  if (selectedLineId === lineId) selectedLineId = null;
  render();
}

function setQty(lineId, qty) {
  const line = cart.find(l => l.lineId === lineId);
  if (!line || line.type !== "item") return;
  line.qty = Math.max(1, qty);
  render();
}

function addDiscountToLine(lineId, amount) {
  const parent = cart.find(l => l.lineId === lineId && l.type === "item");
  if (!parent) return;

  // retirer remise existante pour ce parent
  cart = cart.filter(l => !(l.type === "discount" && l.parentLineId === lineId));
  cart.push({
    lineId: uid(),
    type: "discount",
    parentLineId: lineId,
    name: "Remise",
    price: -Math.abs(amount),
    qty: 1
  });
  render();
}

// ===================== UI RENDER =====================
function render() {
  const body = $("cartBody");
  body.innerHTML = "";

  // grouper item + sa remise
  const lines = [];
  for (const item of cart.filter(l => l.type === "item")) {
    lines.push(item);
    const disc = cart.find(l => l.type === "discount" && l.parentLineId === item.lineId);
    if (disc) lines.push(disc);
  }

  for (const line of lines) {
    const tr = document.createElement("tr");
    if (line.lineId === selectedLineId) tr.classList.add("selected");

    const isDiscount = line.type === "discount";
    const qty = isDiscount ? "" : line.qty;

    const unit = (!isDiscount && line.unite_mesure) ? ` (${line.unite_mesure})` : "";
    const lineTotal = isDiscount ? line.price : (line.price * line.qty);

    tr.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="tag">${isDiscount ? "REM" : "ITEM"}</span>
          <div>
            <div ${isDiscount ? 'class="neg"' : ""}>${line.name}${unit}</div>
            ${!isDiscount ? `<div class="muted">ID: ${line.productId} • Code-barres: ${line.barcode || "—"}</div>` : ""}
          </div>
        </div>
      </td>
      <td class="right ${isDiscount ? "neg" : ""}">${money(line.price)}</td>
      <td class="right">${qty}</td>
      <td class="right ${isDiscount ? "neg" : ""}">${money(lineTotal)}</td>
      <td class="right">
        ${!isDiscount ? `
          <button class="tinybtn" data-act="disc" data-id="${line.lineId}">Remise</button>
          <button class="tinybtn danger" data-act="rm" data-id="${line.lineId}">Retirer</button>
        ` : `
          <button class="tinybtn danger" data-act="rm" data-id="${line.lineId}">Suppr</button>
        `}
      </td>
    `;

    tr.addEventListener("click", (e) => {
      if (e.target.tagName.toLowerCase() === "button") return;
      selectedLineId = (line.type === "discount" && line.parentLineId) ? line.parentLineId : line.lineId;
      $("qtyInput").value = "";
      render();
    });

    body.appendChild(tr);
  }

  body.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = btn.getAttribute("data-act");
      const id = btn.getAttribute("data-id");
      if (act === "rm") requireAdmin({ type: "remove", payload: { lineId: id } });
      if (act === "disc") {
        selectedLineId = id;
        requireAdmin({ type: "addDiscount", payload: { lineId: id } });
      }
    });
  });

  const { sub, tax, total } = computeTotals();
  $("subTotal").textContent = money(sub);
  $("taxTotal").textContent = money(tax);
  $("grandTotal").textContent = money(total);
  $("lineCount").textContent = `${cart.filter(l => l.type === "item").length} article(s)`;

  renderHoldList();
}

// ===================== AUTOCOMPLETE (API) =====================
const search = $("search");
const sug = $("suggestions");

const doSearch = debounce(async () => {
  const q = search.value.trim();
  if (!q) {
    sug.style.display = "none";
    sug.innerHTML = "";
    return;
  }
  try {
    const items = await apiSearchProducts(q);
    if (!items.length) {
      sug.style.display = "none";
      sug.innerHTML = "";
      return;
    }
    sug.innerHTML = items.map(p => {
      const name = p.nom ?? p.name ?? "Produit";
      const unit = p.unite_mesure ? ` • ${p.unite_mesure}` : "";
      const price = Number(p.prix_unitaire ?? p.price ?? 0);
      return `
        <div class="item" data-id="${p.id_produit ?? p.id}">
          <div>${name}<span class="muted">${unit}</span></div>
          <div class="muted">${money(price)}</div>
        </div>
      `;
    }).join("");
    sug.style.display = "block";

    sug.querySelectorAll(".item").forEach(it => {
      it.addEventListener("click", async () => {
        const id = Number(it.getAttribute("data-id"));
        // recharger le produit complet si tu veux, sinon utilise l’item déjà rendu:
        const p = items.find(x => Number(x.id_produit ?? x.id) === id);
        if (p) addItemFromApiProduct(p, 1);
        search.value = "";
        sug.style.display = "none";
      });
    });
  } catch (e) {
    console.error(e);
    sug.style.display = "none";
  }
}, 200);

search.addEventListener("input", doSearch);

document.addEventListener("click", (e) => {
  if (!sug.contains(e.target) && e.target !== search) sug.style.display = "none";
});

// ===================== BARCODE (API) =====================
const barcode = $("barcode");
barcode.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const code = barcode.value.trim();
  if (!code) return;

  try {
    const p = await apiGetProductByBarcode(code);
    if (p) addItemFromApiProduct(p, 1);
    else alert("Article introuvable pour ce code-barres.");
  } catch (err) {
    console.error(err);
    alert(`Erreur lookup code-barres: ${err.message}`);
  } finally {
    barcode.value = "";
  }
});

// ===================== KEYPAD QTY =====================
const qtyInput = $("qtyInput");
let qtyBuffer = "";

$("kbd").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const k = btn.getAttribute("data-k");

  if (k === "C") { qtyBuffer = ""; qtyInput.value = ""; return; }
  if (k === "DEL") { qtyBuffer = qtyBuffer.slice(0, -1); qtyInput.value = qtyBuffer; return; }
  if (k === "1x") { qtyBuffer = "1"; qtyInput.value = "1"; return; }

  if (k === "OK") {
    const qty = parseInt(qtyBuffer || "0", 10);
    if (!selectedLineId) return alert("Sélectionne d’abord un article dans le panier.");
    if (!qty || qty < 1) return alert("Quantité invalide.");
    requireAdmin({ type: "setQty", payload: { lineId: selectedLineId, qty } });
    qtyBuffer = "";
    qtyInput.value = "";
    return;
  }

  if (/^\d$/.test(k)) {
    qtyBuffer += k;
    qtyInput.value = qtyBuffer;
  }
});

// ===================== QUICK BUTTONS =====================
$("btnRemove").addEventListener("click", () => {
  if (!selectedLineId) return alert("Sélectionne une ligne à retirer.");
  requireAdmin({ type: "remove", payload: { lineId: selectedLineId } });
});

$("btnDiscount").addEventListener("click", () => {
  if (!selectedLineId) return alert("Sélectionne un article pour appliquer une remise.");
  requireAdmin({ type: "addDiscount", payload: { lineId: selectedLineId } });
});

// ===================== HOLD CARTS (LOCAL DEMO) =====================
function computeTotalsFromSnapshot(snapshot) {
  let sub = 0;
  for (const line of snapshot) {
    if (line.type === "item") sub += line.price * line.qty;
    if (line.type === "discount") sub += line.price;
  }
  const tax = sub * TAX_RATE;
  const total = sub + tax;
  return { sub, tax, total };
}

function renderHoldList() {
  const list = $("holdList");
  if (suspendedCarts.length === 0) {
    list.innerHTML = `<div class="li"><div class="meta"><b>Aucun panier</b><small>Utilise “Mettre en attente”.</small></div></div>`;
    return;
  }
  list.innerHTML = suspendedCarts.map(h => {
    const totals = computeTotalsFromSnapshot(h.cartSnapshot);
    return `
      <div class="li" data-hold="${h.holdId}">
        <div class="meta">
          <b>${h.name}</b>
          <small>${h.time} • ${money(totals.total)}</small>
        </div>
        <div class="btns">
          <button class="tinybtn" data-act="resume">Reprendre</button>
          <button class="tinybtn danger" data-act="del">Supprimer</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".li").forEach(li => {
    const holdId = li.getAttribute("data-hold");
    li.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-act");
        if (act === "resume") {
          const h = suspendedCarts.find(x => x.holdId === holdId);
          cart = JSON.parse(JSON.stringify(h.cartSnapshot));
          suspendedCarts = suspendedCarts.filter(x => x.holdId !== holdId);
          selectedLineId = null;
          $("cartName").textContent = "En cours (repris)";
          $("status").textContent = "En cours";
          render();
        }
        if (act === "del") {
          suspendedCarts = suspendedCarts.filter(x => x.holdId !== holdId);
          renderHoldList();
        }
      });
    });
  });
}

$("btnHold").addEventListener("click", () => {
  if (cart.length === 0) return alert("Panier vide.");
  const now = new Date();
  const holdId = uid();
  const totals = computeTotals();
  const name = `Panier #${String(suspendedCarts.length + 1).padStart(2, "0")}`;

  suspendedCarts.unshift({
    holdId,
    name,
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    cartSnapshot: JSON.parse(JSON.stringify(cart))
  });

  cart = [];
  selectedLineId = null;
  $("cartName").textContent = "En cours";
  $("status").textContent = "En cours";
  render();
  alert(`${name} mis en attente. Total: ${money(totals.total)}`);
});

$("btnCancel").addEventListener("click", () => {
  if (!confirm("Annuler le panier en cours ?")) return;
  cart = [];
  selectedLineId = null;
  render();
});

// ===================== FINALISER (POST SALE) =====================
// Attendu: POST /api/sales { lignes:[{id_produit, qty, prix_unitaire}], remises:[...], ... }
$("btnPay").addEventListener("click", async () => {
  if (cart.length === 0) return alert("Panier vide.");

  try {
    const items = cart.filter(l => l.type === "item").map(l => ({
      id_produit: l.productId,
      quantite: l.qty,
      prix_unitaire: l.price
    }));

    const discounts = cart
      .filter(l => l.type === "discount")
      .map(d => ({ parent_line_id: d.parentLineId, montant: d.price })); // négatif

    const totals = computeTotals();

    const payload = {
      caisse: "POS-01",
      client: "Comptoir",
      lignes: items,
      remises: discounts,
      totals: totals
    };

    // adapte le endpoint si le tien est différent
    const resp = await fetchJson(`${API_BASE}/sales`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    alert(`Vente enregistrée. ID: ${resp.data?.id_vente ?? "—"} • Total: ${money(totals.total)}`);

    cart = [];
    selectedLineId = null;
    render();
  } catch (e) {
    console.error(e);
    alert(`Erreur finalisation: ${e.message}`);
  }
});

// ===================== ADMIN MODAL =====================
function requireAdmin(action) {
  pendingAdminAction = action;
  $("adminPin").value = "";
  $("adminMsg").textContent = "";
  $("adminModal").style.display = "flex";
  $("adminPin").focus();

  if (action.type === "addDiscount") {
    const amt = prompt("Montant de la remise (ex: 2.00) :");
    if (amt === null) { closeAdmin(); return; }
    const n = Number(amt);
    if (!isFinite(n) || n <= 0) { alert("Montant invalide."); closeAdmin(); return; }
    pendingAdminAction.payload.amount = n;
  }
}

function closeAdmin() {
  $("adminModal").style.display = "none";
  pendingAdminAction = null;
}

$("adminCancel").addEventListener("click", closeAdmin);

$("adminOk").addEventListener("click", () => {
  const pin = $("adminPin").value.trim();
  if (pin !== ADMIN_PIN) { $("adminMsg").textContent = "PIN invalide."; return; }

  const a = pendingAdminAction;
  closeAdmin();
  if (!a) return;

  if (a.type === "remove") removeLine(a.payload.lineId);
  if (a.type === "setQty") setQty(a.payload.lineId, a.payload.qty);
  if (a.type === "addDiscount") addDiscountToLine(a.payload.lineId, a.payload.amount);
});

// init
render();
