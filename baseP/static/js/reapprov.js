const API_BASE = "http://127.0.0.1:5000";
const API_URL = `${API_BASE}/api/reapprov/suggestions`;

const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function badgeClass(urgence) {
  if (urgence === "CRITIQUE") return "danger";
  if (urgence === "URGENT") return "warn";
  if (urgence === "A_COMMANDER") return "info";
  if (urgence === "A_SURVEILLER") return "muted";
  return "ok";
}

async function loadSuggestions() {
  $("status").textContent = "Chargement...";

  try {
    const res = await fetch(API_URL);
    const payload = await res.json();

    if (!payload.success) {
      throw new Error(payload.error || "Erreur API");
    }

    const rows = payload.data || [];
    $("count").textContent = rows.length;

    const tbody = $("tbody");

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">Aucune suggestion.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${esc(r.produit)}</td>
        <td class="right">${r.stock_actuel}</td>
        <td class="right">${r.quantite_vendue_30j}</td>
        <td class="right">${r.conso_jour}</td>
        <td class="right">${r.jours_restants ?? "—"}</td>
        <td class="right">${r.quantite_recommandee}</td>
        <td class="right">${r.stock_minimum}</td>
        <td>
          <span class="badge ${badgeClass(r.urgence)}">${r.urgence}</span>
        </td>
      </tr>
    `).join("");

    $("status").textContent = "OK";
  } catch (e) {
    console.error(e);
    $("status").textContent = `Erreur: ${e.message}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("btnRefresh").addEventListener("click", loadSuggestions);
  loadSuggestions();
});