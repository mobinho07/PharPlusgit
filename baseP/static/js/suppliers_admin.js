// =============================
// PharmaPlus - Fournisseurs Admin
// =============================

const API_BASE = "http://127.0.0.1:5000";
const API = {
  list: `${API_BASE}/api/fournisseurs/list`,
  search: `${API_BASE}/api/fournisseurs/search`,
  create: `${API_BASE}/api/fournisseurs`,
  update: (id) => `${API_BASE}/api/fournisseurs/${id}`,
  del: (id) => `${API_BASE}/api/fournisseurs/${id}`,
};

const $ = (id) => document.getElementById(id);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function setApiStatus(ok, msg = "") {
  const el = $("apiStatus");
  el.textContent = ok ? "OK" : "ERREUR";
  el.style.color = ok ? "#30d158" : "#ff5c77";
  el.title = msg || "";
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ------- State -------
let rows = [];
let editingId = null;
let deletingId = null;

// ------- Load / render -------
async function load() {
  const q = ($("q").value || "").trim();
  const limit = Number($("limit").value || "25");

  try {
    setApiStatus(true, "");
    let url = "";
    if (q) {
      url = `${API.search}?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;
    } else {
      // list n'a pas de limit -> on passe par search sans q pour limiter
      url = `${API.search}?limit=${encodeURIComponent(limit)}`;
    }

    const res = await fetchJson(url, { method: "GET" });
    rows = res.data || [];
    render();
    setApiStatus(true, "");
  } catch (e) {
    console.error(e);
    setApiStatus(false, e.message);
    rows = [];
    render();
  }
}

function render() {
  $("count").textContent = String(rows.length);

  const tbody = $("tbody");
  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="muted" style="padding:14px;">
          Aucun fournisseur trouvé.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><b>${esc(r.nom)}</b></td>
      <td>${esc(r.contact || "—")}</td>
      <td>${esc(r.telephone || "—")}</td>
      <td>${esc(r.email || "—")}</td>
      <td class="right">
        <button class="tinybtn" data-act="edit" data-id="${r.id_fournisseur}">Modifier</button>
        <button class="tinybtn danger" data-act="del" data-id="${r.id_fournisseur}">Supprimer</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      const act = btn.getAttribute("data-act");
      const id = Number(btn.getAttribute("data-id"));
      if (act === "edit") openModalEdit(id);
      if (act === "del") openDelete(id);
    });
  });
}

// ------- Modal create/edit -------
function openModalCreate() {
  editingId = null;
  $("modalTitle").textContent = "Nouveau fournisseur";
  $("msg").textContent = "";
  $("nom").value = "";
  $("contact").value = "";
  $("telephone").value = "";
  $("email").value = "";
  $("modal").style.display = "flex";
  $("nom").focus();
}

function openModalEdit(id) {
  const r = rows.find(x => Number(x.id_fournisseur) === Number(id));
  if (!r) return;

  editingId = id;
  $("modalTitle").textContent = "Modifier fournisseur";
  $("msg").textContent = "";
  $("nom").value = r.nom || "";
  $("contact").value = r.contact || "";
  $("telephone").value = r.telephone || "";
  $("email").value = r.email || "";
  $("modal").style.display = "flex";
  $("nom").focus();
}

function closeModal() {
  $("modal").style.display = "none";
  editingId = null;
}

async function save() {
  const payload = {
    nom: ($("nom").value || "").trim(),
    contact: ($("contact").value || "").trim() || null,
    telephone: ($("telephone").value || "").trim() || null,
    email: ($("email").value || "").trim() || null,
  };

  if (!payload.nom) {
    $("msg").textContent = "Le champ 'nom' est requis.";
    return;
  }

  try {
    $("msg").textContent = "Enregistrement...";
    if (editingId) {
      await fetchJson(API.update(editingId), {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await fetchJson(API.create, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    closeModal();
    await load();
  } catch (e) {
    console.error(e);
    $("msg").textContent = `Erreur: ${e.message}`;
  }
}

// ------- Delete modal -------
function openDelete(id) {
  deletingId = id;
  const r = rows.find(x => Number(x.id_fournisseur) === Number(id));
  $("delInfo").innerHTML = r
    ? `<b>${esc(r.nom)}</b> • ${esc(r.email || "—")} • ${esc(r.telephone || "—")}`
    : `ID: ${id}`;
  $("delMsg").textContent = "";
  $("modalDelete").style.display = "flex";
}

function closeDelete() {
  $("modalDelete").style.display = "none";
  deletingId = null;
}

async function doDelete(cascade = false) {
  if (!deletingId) return;

  try {
    $("delMsg").textContent = "Suppression...";
    const url = `${API.del(deletingId)}?cascade=${cascade ? 1 : 0}`;
    await fetchJson(url, { method: "DELETE" });
    closeDelete();
    await load();
  } catch (e) {
    console.error(e);
    // 409 attendu si utilisé
    $("delMsg").textContent = `Erreur: ${e.message}`;
  }
}

// ------- Events -------
$("btnNew").addEventListener("click", openModalCreate);
$("btnRefresh").addEventListener("click", load);

$("q").addEventListener("input", () => {
  // petit debounce simple
  window.clearTimeout(window.__t);
  window.__t = window.setTimeout(load, 250);
});
$("limit").addEventListener("change", load);

$("btnClose").addEventListener("click", closeModal);
$("btnCancel").addEventListener("click", closeModal);
$("btnSave").addEventListener("click", save);

$("btnDelCancel").addEventListener("click", closeDelete);
$("btnDel").addEventListener("click", () => doDelete(false));
$("btnDelCascade").addEventListener("click", () => doDelete(true));

// init
load();
