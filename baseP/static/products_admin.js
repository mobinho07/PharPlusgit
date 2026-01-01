// ====== CONFIG ======
const API_BASE = "http://localhost:5000/api"; // ajuste si besoin
const DEMO_USER_ID = 1; // TODO: remplacer par utilisateur connecté

// ====== HELPERS ======
const $ = (id) => document.getElementById(id);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (iso) => {
  if(!iso) return "—";
  // accepte yyyy-mm-dd / datetime
  const d = new Date(iso);
  if(String(d) === "Invalid Date") return iso;
  return d.toISOString().slice(0,10);
};

async function fetchJson(url, opts = {}){
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      // Si tu actives windows_auth_required plus tard:
      // "Authorization": "demo"
    },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if(!res.ok || data.success === false || data.status === "error"){
    const msg = data.error || data.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function debounce(fn, wait=250){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ====== STATE ======
let products = [];
let selectedProductId = null;
let selectedProduct = null;
let lots = [];

// lot modal state
let lotMode = "create"; // create|update
let editingLotId = null;

// ====== INIT ======
async function pingApi(){
  try{
    const data = await fetchJson(`${API_BASE}/products2/ping`);
    $("apiStatus").textContent = "OK";
  }catch(e){
    $("apiStatus").textContent = "OFF";
  }
}

function clearProductForm(){
  selectedProductId = null;
  selectedProduct = null;
  $("currentProductName").textContent = "Aucun";
  $("productIdTag").textContent = "ID: —";

  $("p_nom").value = "";
  $("p_code_barre").value = "";
  $("p_prix_unitaire").value = "";
  $("p_category").value = "";
  $("p_seuil").value = "";
  $("p_actif").value = "1";
  $("p_description").value = "";

  $("btnSaveProduct").disabled = false;
  $("btnDeactivate").disabled = true;
  $("btnNewLot").disabled = true;
  $("btnRefreshLots").disabled = true;
  $("btnChangePrice").disabled = true;

  $("stockTag").textContent = "Stock: —";
  $("lotTableBody").innerHTML = "";
  $("movementList").innerHTML = "";
  $("priceHistoryList").innerHTML = "";
}

function fillProductForm(p){
  selectedProductId = p.id_produit;
  selectedProduct = p;

  $("currentProductName").textContent = p.nom || "—";
  $("productIdTag").textContent = `ID: ${p.id_produit}`;

  $("p_nom").value = p.nom ?? "";
  $("p_code_barre").value = p.code_barre ?? "";
  $("p_prix_unitaire").value = p.prix_unitaire ?? "";
  $("p_category").value = p.category ?? "";
  $("p_seuil").value = p.seuil ?? "";
  $("p_actif").value = String(p.actif ?? 1);
  $("p_description").value = p.description ?? "";

  $("btnSaveProduct").disabled = false;
  $("btnDeactivate").disabled = false;
  $("btnNewLot").disabled = false;
  $("btnRefreshLots").disabled = false;
  $("btnChangePrice").disabled = false;
}

// ====== RENDER ======
function renderProductList(){
  const list = $("productList");
  if(products.length === 0){
    list.innerHTML = `<div class="li"><div class="meta"><b>Aucun résultat</b><small>Essaie une autre recherche.</small></div></div>`;
    return;
  }

  list.innerHTML = products.map(p => {
    const isSel = p.id_produit === selectedProductId;
    const badge = (p.actif ? "Actif" : "Inactif");
    const small = `Code: ${p.code_barre || "—"} • Cat: ${p.category || "—"} • ${badge}`;
    return `
      <div class="li ${isSel ? "selected" : ""}" data-id="${p.id_produit}">
        <div class="meta">
          <b>${p.nom}</b>
          <small>${small}</small>
        </div>
        <div class="btns">
          <span class="tag">${money(p.prix_unitaire)}</span>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".li").forEach(li => {
    li.addEventListener("click", async () => {
      const id = Number(li.getAttribute("data-id"));
      await loadProduct(id);
    });
  });
}

function renderLots(){
  const body = $("lotTableBody");
  body.innerHTML = "";

  if(lots.length === 0){
    body.innerHTML = `<tr><td colspan="5" class="muted">Aucun lot pour ce produit.</td></tr>`;
    $("stockTag").textContent = "Stock: 0";
    return;
  }

  const totalStock = lots.reduce((s, l) => s + Number(l.quantite || 0), 0);
  $("stockTag").textContent = `Stock: ${totalStock}`;

  for(const l of lots){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${l.id_lot}</td>
      <td class="right">${l.quantite ?? 0}</td>
      <td>${l.date_expiration ? fmtDate(l.date_expiration) : "—"}</td>
      <td class="right">${money(l.prix_achat)}</td>
      <td class="right">
        <button class="tinybtn" data-act="edit" data-id="${l.id_lot}">Modifier</button>
      </td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll("button[data-act='edit']").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const lot = lots.find(x => x.id_lot === id);
      if(lot) openLotModal("update", lot);
    });
  });
}

function renderMovements(items){
  const list = $("movementList");
  if(!items || items.length === 0){
    list.innerHTML = `<div class="li"><div class="meta"><b>Aucun mouvement</b><small>Pas d'historique pour ce produit.</small></div></div>`;
    return;
  }

  list.innerHTML = items.map(m => {
    const small = `${m.type_mouvement || "—"} • Qté: ${m.quantite ?? 0} • ${m.date_mouvement || "—"}`;
    return `
      <div class="li">
        <div class="meta">
          <b>${m.nom || selectedProduct?.nom || "Produit"}</b>
          <small>${small}</small>
        </div>
        <div class="btns">
          <span class="tag">Lot: ${m.id_lot ?? "—"}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderPriceHistory(items){
  const list = $("priceHistoryList");
  if(!items || items.length === 0){
    list.innerHTML = `<div class="li"><div class="meta"><b>Aucun historique</b><small>Modifie le prix pour tracer l'historique.</small></div></div>`;
    return;
  }

  list.innerHTML = items.map(x => {
    const small = `${x.date_modif || "—"} • ${x.motif || "—"} • par: ${x.modifie_par || "—"}`;
    return `
      <div class="li">
        <div class="meta">
          <b>${money(x.ancien_prix)} → ${money(x.nouveau_prix)}</b>
          <small>${small}</small>
        </div>
      </div>
    `;
  }).join("");
}

// ====== LOADERS ======
async function loadProducts(){
  const q = $("searchProduct").value.trim();
  const active = $("filterActive").value;
  const cat = $("filterCategory").value;

  const params = new URLSearchParams();
  if(q) params.set("search", q);
  if(active !== "") params.set("active", active);
  if(cat) params.set("category", cat);
  params.set("limit", "60");

  const data = await fetchJson(`${API_BASE}/products2?${params.toString()}`);
  products = data.data || [];
  renderProductList();

  // remplir catégories (simple)
  const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  const sel = $("filterCategory");
  const cur = sel.value;
  sel.innerHTML = `<option value="">Toutes catégories</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join("");
  sel.value = cur || "";
}

async function loadProduct(id){
  const p = await fetchJson(`${API_BASE}/products2/${id}`);
  fillProductForm(p.data);

  const lotsResp = await fetchJson(`${API_BASE}/lots?product_id=${id}&available_only=0`);
  lots = lotsResp.data || [];
  renderLots();

  // mouvements : tu as déjà /api/stock/movements en POST (id_produit) :contentReference[oaicite:1]{index=1}
  // Ici on utilise /stock2/movements en GET (nouvelle route) pour faciliter le front
  const mv = await fetchJson(`${API_BASE}/stock2/movements?product_id=${id}&limit=30`);
  renderMovements(mv.data || []);

  const ph = await fetchJson(`${API_BASE}/price2/history?product_id=${id}&limit=30`);
  renderPriceHistory(ph.data || []);
}

// ====== PRODUCT SAVE ======
async function saveProduct(){
  const payload = {
    nom: $("p_nom").value.trim(),
    code_barre: $("p_code_barre").value.trim() || null,
    prix_unitaire: Number($("p_prix_unitaire").value || 0),
    category: $("p_category").value.trim() || null,
    seuil: $("p_seuil").value ? Number($("p_seuil").value) : null,
    actif: Number($("p_actif").value || 1),
    description: $("p_description").value.trim() || null
  };

  if(!payload.nom) throw new Error("Le nom est obligatoire.");
  if(!payload.prix_unitaire || payload.prix_unitaire <= 0) throw new Error("Prix unitaire invalide.");

  if(selectedProductId){
    await fetchJson(`${API_BASE}/products2/${selectedProductId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }else{
    const created = await fetchJson(`${API_BASE}/products2`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    selectedProductId = created.data.id_produit;
  }

  await loadProducts();
  if(selectedProductId) await loadProduct(selectedProductId);
}

async function deactivateProduct(){
  if(!selectedProductId) return;
  await fetchJson(`${API_BASE}/products2/${selectedProductId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ actif: 0 })
  });
  await loadProducts();
  await loadProduct(selectedProductId);
}

// ====== LOT MODAL ======
function openLotModal(mode, lot=null){
  lotMode = mode;
  editingLotId = lot?.id_lot ?? null;

  $("lotModalTitle").textContent = (mode === "create") ? "Nouveau lot (Approvisionnement)" : `Modifier lot #${editingLotId}`;
  $("lotMsg").textContent = "";

  $("l_quantite").value = lot?.quantite ?? "";
  $("l_date_expiration").value = lot?.date_expiration ? fmtDate(lot.date_expiration) : "";
  $("l_fournisseur").value = lot?.fournisseur ?? "";
  $("l_prix_achat").value = lot?.prix_achat ?? "";
  $("l_raison").value = (mode === "create") ? "Approvisionnement" : "Ajustement / Correction";

  $("lotModal").style.display = "flex";
}

function closeLotModal(){
  $("lotModal").style.display = "none";
  lotMode = "create";
  editingLotId = null;
}

async function submitLot(){
  if(!selectedProductId) throw new Error("Sélectionne un produit.");
  const payload = {
    id_produit: selectedProductId,
    quantite: Number($("l_quantite").value || 0),
    date_expiration: $("l_date_expiration").value || null,
    fournisseur: $("l_fournisseur").value.trim() || null,
    prix_achat: Number($("l_prix_achat").value || 0),
    raison: $("l_raison").value.trim() || null,
    id_utilisateur: DEMO_USER_ID,
  };

  if(!payload.quantite || payload.quantite <= 0) throw new Error("Quantité invalide.");
  if(!payload.prix_achat || payload.prix_achat <= 0) throw new Error("Prix achat invalide.");

  if(lotMode === "create"){
    await fetchJson(`${API_BASE}/lots`, { method: "POST", body: JSON.stringify(payload) });
  }else{
    await fetchJson(`${API_BASE}/lots/${editingLotId}`, { method: "PUT", body: JSON.stringify(payload) });
  }

  closeLotModal();
  await loadProduct(selectedProductId);
}

// ====== PRICE MODAL ======
function openPriceModal(){
  $("priceMsg").textContent = "";
  $("newPrice").value = selectedProduct?.prix_unitaire ?? "";
  $("priceMotif").value = "Ajustement de prix";
  $("priceModal").style.display = "flex";
}
function closePriceModal(){ $("priceModal").style.display = "none"; }

async function submitPrice(){
  if(!selectedProductId) return;
  const nouveau_prix = Number($("newPrice").value || 0);
  if(!nouveau_prix || nouveau_prix <= 0) throw new Error("Nouveau prix invalide.");

  await fetchJson(`${API_BASE}/price2/change`, {
    method: "POST",
    body: JSON.stringify({
      id_produit: selectedProductId,
      nouveau_prix,
      id_utilisateur: DEMO_USER_ID,
      motif: $("priceMotif").value.trim() || "Ajustement de prix"
    })
  });

  closePriceModal();
  await loadProduct(selectedProductId);
}

// ====== EVENTS ======
$("btnNewProduct").addEventListener("click", clearProductForm);

$("btnSaveProduct").addEventListener("click", async () => {
  try{ await saveProduct(); }
  catch(e){ alert(e.message); }
});

$("btnDeactivate").addEventListener("click", async () => {
  try{
    if(!confirm("Désactiver ce produit ?")) return;
    await deactivateProduct();
  }catch(e){ alert(e.message); }
});

$("btnNewLot").addEventListener("click", () => openLotModal("create"));
$("btnRefreshLots").addEventListener("click", async () => {
  if(selectedProductId) await loadProduct(selectedProductId);
});

$("lotCancel").addEventListener("click", closeLotModal);
$("lotOk").addEventListener("click", async () => {
  try{ await submitLot(); }
  catch(e){ $("lotMsg").textContent = e.message; }
});

$("btnChangePrice").addEventListener("click", openPriceModal);
$("priceCancel").addEventListener("click", closePriceModal);
$("priceOk").addEventListener("click", async () => {
  try{ await submitPrice(); }
  catch(e){ $("priceMsg").textContent = e.message; }
});

$("searchProduct").addEventListener("input", debounce(async () => {
  try{ await loadProducts(); }catch(e){ /* ignore */ }
}, 250));

$("filterActive").addEventListener("change", async () => {
  await loadProducts();
});
$("filterCategory").addEventListener("change", async () => {
  await loadProducts();
});

// ====== BOOT ======
(async function boot(){
  clearProductForm();
  await pingApi();
  try{ await loadProducts(); }catch(e){}
})();
