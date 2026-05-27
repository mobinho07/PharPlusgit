// =============================
// POS - Module Vente (API ready)
// =============================

// --- Config ---
const API_BASE = "http://127.0.0.1:5000";

const API = {
  catalog: `${API_BASE}/api/master/list`,
  sale: `${API_BASE}/api/saleMvt/vente`,
};


const TAX_RATE = 0.14975; // QC (TPS+TVQ) exemple
const ADMIN_PIN = "1234"; // demo
 
const CURRENT_USER_ID = Number(localStorage.getItem("user_id") || "0");


// --- State ---
let catalogRows = []; // rows from vue_produits_disponibles
// Cart line model:
// { lineId, type: 'item'|'discount', id_lot, id_produit, name, code_barre, price, qty, parentLineId? }
let cart = [];
let selectedLineId = null;

// Hold carts: { holdId, name, time, cartSnapshot }
let suspendedCarts = [];

// Admin modal state
let pendingAdminAction = null; // { type: 'remove'|'setQty'|'addDiscount', payload: {...} }

// --- Helpers ---
const $ = (id) => document.getElementById(id);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

async function fetchJson(url, opts = {}) { 
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",      ...(opts.headers || {})
    },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function parseDateDMY(dmy) {
  if (!dmy || typeof dmy !== "string") return null;

  const parts = dmy.split("-");
  if (parts.length !== 3) return null;

  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;

  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

function parseDateSafe(dmy) {
  const d = parseDateDMY(dmy);
  return d;
}

// filtre les lots périmés
function todayLocalMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function isExpiredDMY(dateStr) {
  const d = parseDateDMY(dateStr); // ton parser DD-MM-YYYY
  if (!d) return false; // si pas de date -> on considère non expiré (à toi d’ajuster)
  d.setHours(0, 0, 0, 0);
  return d < todayLocalMidnight();
}


// ---- Mapping helpers (catalog row -> normalized fields) ----
// Comme vue_produits_disponibles est un SELECT *,
// ses colonnes peuvent varier. On essaie plusieurs noms possibles.
function pick(obj, keys, fallback = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

function normalizeCatalogRow(r) {
  return {
    raw: r,
    id_lot: Number(r.id_lot),
    id_produit: Number(r.id_produit),
    name: String(r.nom_produit || ""),
    code_barre: String(r.code_barre || ""),
    price: Number(r.prix_vente || 0),
    quantite: Number(r.quantite || 0),
    actif: Number(r.actif ?? 1),
    date_expiration: r.date_expiration || null,      // "DD-MM-YYYY"
    date_approvisionnement: r.date_approvisionnement || null
  };
}



// --- Catalog search ---
function findRowsByName(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];

  const matches = catalogRows.filter(p =>
    p.name.toLowerCase().includes(s) &&
    p.actif === 1 &&
    p.quantite > 0 &&
    p.id_lot
  );

  // Tri FEFO + nom
  matches.sort((a, b) => {
    const da = parseDateDMY(a.date_expiration);
    const db = parseDateDMY(b.date_expiration);

    if (da && db && da.getTime() !== db.getTime()) return da - db;
    if (da && !db) return -1;
    if (!da && db) return 1;

    return a.name.localeCompare(b.name, "fr");
  });

  return matches.slice(0, 8);
}



function findRowByBarcode(code) {
  const c = (code || "").trim();
  if (!c) return null;

  const matches = catalogRows.filter(p =>
    p.code_barre === c &&
    p.actif === 1 &&
    p.quantite > 0 &&
    p.id_lot
  );

  if (matches.length === 0) return null;

  // FEFO : date_expiration la plus proche
  matches.sort((a, b) => {
    const da = parseDateDMY(a.date_expiration);
    const db = parseDateDMY(b.date_expiration);

    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;

    return da - db;
  });

  return matches[0];
}



// --- Totals ---
function computeTotals() {
  let sub = 0;
  for (const line of cart) {
    if (line.type === "item") sub += line.price * line.qty;
    if (line.type === "discount") sub += line.price; // negative
  }
  const tax = sub * TAX_RATE;
  const total = sub + tax;
  return { sub, tax, total };
}

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

// --- Cart ops ---
function addItemFromCatalogRow(prodRow, qty = 1) {
  if (!prodRow) return;

  // Merge sur id_lot (car vente = id_lot)
  const existing = cart.find(l => l.type === "item" && l.id_lot === prodRow.id_lot);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      lineId: uid(),
      type: "item",
      id_lot: prodRow.id_lot,
      id_produit: prodRow.id_produit,
      name: prodRow.name,
      code_barre: prodRow.code_barre,
      price: prodRow.price,
      qty
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

  // Ton backend ne gère pas les remises: ici c'est purement UI.
  // Si tu veux persister en DB, il faudra un modèle "discount line" côté ventes.
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

// --- Render ---
function render() {
  const body = $("cartBody");
  body.innerHTML = "";

  // Group discount lines under parent
  const lines = [];
  for (const item of cart.filter(l => l.type === "item")) {
    lines.push(item);
    const disc = cart.find(l => l.type === "discount" && l.parentLineId === item.lineId);
    if (disc) lines.push(disc);
  }
  for (const d of cart.filter(l => l.type === "discount")) {
    if (!cart.find(i => i.type === "item" && i.lineId === d.parentLineId)) lines.push(d);
  }

  for (const line of lines) {
    const tr = document.createElement("tr");
    if (line.lineId === selectedLineId) tr.classList.add("selected");

    const isDiscount = line.type === "discount";
    const qty = isDiscount ? "" : line.qty;
    const lineTotal = isDiscount ? line.price : (line.price * line.qty);

    tr.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="tag">${isDiscount ? "REM" : "ITEM"}</span>
          <div>
            <div ${isDiscount ? 'class="neg"' : ""}>${line.name}</div>
            ${!isDiscount ? `<div class="muted">Lot: ${line.id_lot} • Produit: ${line.id_produit} • Code-barres: ${line.code_barre || "—"}</div>` : ""}
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
      selectedLineId = line.lineId;
      if (line.type === "discount" && line.parentLineId) selectedLineId = line.parentLineId;
      $("qtyInput").value = "";
      render();
    });

    body.appendChild(tr);
  }

  // Buttons actions
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

// --- Autocomplete ---
const search = $("search");
const sug = $("suggestions");

search.addEventListener("input", () => {
  const res = findRowsByName(search.value);
  if (res.length === 0) {
    sug.style.display = "none";
    sug.innerHTML = "";
    return;
  }

  sug.innerHTML = res.map(p => `
    <div class="item" data-lot="${p.id_lot}">
      <div>${p.name}</div>
      <div class="muted">${money(p.price)} • Stock: ${p.quantite}${p.unite_mesure ? " " + p.unite_mesure : ""}</div>
    </div>
  `).join("");

  sug.style.display = "block";

  sug.querySelectorAll(".item").forEach(it => {
    it.addEventListener("click", () => {
      const lotId = Number(it.getAttribute("data-lot"));
      const p = catalogRows.find(x => x.id_lot === lotId);
      addItemFromCatalogRow(p, 1);
      search.value = "";
      sug.style.display = "none";
    });
  });
});

document.addEventListener("click", (e) => {
  if (!sug.contains(e.target) && e.target !== search) sug.style.display = "none";
});

// --- Barcode add ---
const barcode = $("barcode");
barcode.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const p = findRowByBarcode(barcode.value);
    if (p) addItemFromCatalogRow(p, 1);
    else alert("Article introuvable pour ce code-barres.");
    barcode.value = "";
  }
});

// --- Keypad qty ---
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

// --- Quick buttons ---
$("btnRemove").addEventListener("click", () => {
  if (!selectedLineId) return alert("Sélectionne une ligne à retirer.");
  requireAdmin({ type: "remove", payload: { lineId: selectedLineId } });
});

$("btnDiscount").addEventListener("click", () => {
  if (!selectedLineId) return alert("Sélectionne un article pour appliquer une remise.");
  requireAdmin({ type: "addDiscount", payload: { lineId: selectedLineId } });
});

// --- Hold carts ---
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
    cartSnapshot: JSON.parse(JSON.stringify(cart)),
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

// --- Pay (POST /api/saleMvt/vente) ---
$("btnPay").addEventListener("click", async () => {
  if (cart.length === 0) return alert("Panier vide.");

  // On n'envoie que les lignes "item" (discount = UI only)
  const lignes = cart
    .filter(l => l.type === "item")
    .map(l => ({ id_lot: l.id_lot, quantite: l.qty }));

  try {
    const resp = await fetchJson(API.sale, {
      method: "POST",
      body: JSON.stringify({
        id_utilisateur: CURRENT_USER_ID,
        lignes
      }),
    });

    // Backend renvoie {status, id_vente, montant_total, ...} :contentReference[oaicite:5]{index=5}
    const apiTotal = resp.montant_total;
    alert(`Vente OK ✅\nID vente: ${resp.id_vente}\nTotal (API - hors taxes): ${money(apiTotal)}`);

    cart = [];
    selectedLineId = null;
    render();

    // Optionnel: recharger catalogue pour refléter le stock après vente
    await loadCatalog();

  } catch (e) {
    alert(`Erreur paiement: ${e.message}`);
  }
});

// --- Admin modal ---
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
  if (pin !== ADMIN_PIN) {
    $("adminMsg").textContent = "PIN invalide.";
    return;
  }

  const a = pendingAdminAction;
  closeAdmin();
  if (!a) return;

  if (a.type === "remove") removeLine(a.payload.lineId);
  if (a.type === "setQty") setQty(a.payload.lineId, a.payload.qty);
  if (a.type === "addDiscount") addDiscountToLine(a.payload.lineId, a.payload.amount);
});

// --- Load catalog from API ---
async function loadCatalog() {
  const resp = await fetchJson(API.catalog, { method: "GET" });

  if (!resp || resp.success !== true) {
    throw new Error(resp?.error || "Catalogue indisponible");
  }

  catalogRows = (resp.data || [])
    .map(normalizeCatalogRow)
  //.filter(p => p.id_lot && p.id_produit && p.name && p.price > 0);
  catalogRows = (resp.data || [])
    .map(normalizeCatalogRow)
    .filter(p =>
      p.id_lot &&
      p.id_produit &&
      p.name &&
      p.price > 0 &&
      p.actif === 1 &&
      p.quantite > 0 &&
      !isExpiredDMY(p.date_expiration)   // ✅ bloque expirés
    );

}



// --- init ---
(async function init() {
  await loadCatalog();
  render();
})();
