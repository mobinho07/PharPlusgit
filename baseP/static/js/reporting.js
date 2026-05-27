// =============================
// PharmaPlus - Reporting
// =============================

const API_BASE = "http://127.0.0.1:5000";
const API = { query: `${API_BASE}/api/reporting/query` };

const $ = (id) => document.getElementById(id);

const REPORT_LABELS = {
  sales_by_day: "Ventes par jour",
  sales_by_month: "Ventes par mois",
  top_products: "Top produits",
  gross_margin_by_month: "Marge brute par mois",
  purchases_by_supplier: "Approvisionnements par fournisseur",
  stock_movements: "Mouvements de stock",
  declassements_ajustements: "Déclassements / ajustements",
  expiring_stock: "Lots à expiration"
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function startOfYearISO() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

function renderTable(rows) {
  const host = $("reportTable");
  const count = $("rowCount");
  count.textContent = String(rows.length);

  if (!rows.length) {
    host.innerHTML = `<div class="muted" style="padding:14px;">Aucune donnée pour cette période.</div>`;
    return;
  }

  const cols = Object.keys(rows[0]);
  const thead = `<thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `
    <tr>${cols.map(c => `<td>${esc(r[c])}</td>`).join("")}</tr>
  `).join("")}</tbody>`;

  host.innerHTML = `<table>${thead}${tbody}</table>`;
}

function downloadCsv(rows) {
  if (!rows.length) return;

  const cols = Object.keys(rows[0]);
  const csv = [
    cols.join(";"),
    ...rows.map(r => cols.map(c => `"${String(r[c] ?? "").replaceAll('"', '""')}"`).join(";"))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pharmaplus_${$("reportName").value}_${$("dateFrom").value}_${$("dateTo").value}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

let currentRows = [];

async function runReport() {
  const name = $("reportName").value;
  const date_from = $("dateFrom").value;
  const date_to = $("dateTo").value;

  $("status").textContent = "Chargement...";
  $("status").style.color = "";

  try {
    const payload = await fetchJson(API.query, {
      method: "POST",
      body: JSON.stringify({ name, date_from, date_to })
    });

    currentRows = payload.data || [];
    $("reportTitle").textContent = REPORT_LABELS[name] || name;
    renderTable(currentRows);
    $("status").textContent = "OK";
    $("status").style.color = "#30d158";
  } catch (e) {
    console.error(e);
    currentRows = [];
    renderTable([]);
    $("status").textContent = `Erreur: ${e.message}`;
    $("status").style.color = "#ff5c77";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("dateFrom").value = startOfYearISO();
  $("dateTo").value = todayISO();
  $("btnRun").addEventListener("click", runReport);
  $("btnCsv").addEventListener("click", () => downloadCsv(currentRows));
  runReport();
});
