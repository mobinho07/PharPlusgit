// =============================
// PharmaPlus - Dashboard (API)
// =============================

const API_BASE = "http://127.0.0.1:5000";
const API = {
    query: `${API_BASE}/api/dashboard/query`,
};

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);

function money(n) {
    return `$${Number(n || 0).toFixed(2)}`;
}

async function postQuery(name) { 
    const res = await fetch(API.query, {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({ name }),
    });

    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { }

    if (!res.ok) {
        const msg = payload?.error || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    if (!payload || payload.success !== true) {
        throw new Error(payload?.error || "Réponse API invalide");
    }
    return payload.data || [];
}

function setStatus(ok, msg) {
    $("apiStatus").textContent = ok ? "OK" : "ERREUR";
    $("apiStatus").style.color = ok ? "#30d158" : "#ff5c77";
    if (msg) $("apiStatus").title = msg;
}

function setLastRefresh() {
    const now = new Date();
    $("lastRefresh").textContent = now.toLocaleString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ---------- charts (Chart.js) ----------
let chartVentes30j = null;
let chartForecast = null;
let chartCaMensuel = null;
let chartCaSemaine = null;
let chartTop5 = null;
let chartCat = null;
let chartFournisseurs = null;


function destroyIf(chart) {
    if (chart) { chart.destroy(); }
}

function toNum(v) {
    if (v === null || v === undefined) return 0;
    // support "132,44" -> 132.44
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function toLabel(v) {
    if (v === null || v === undefined) return "—";
    return String(v);
}

function pick(row, keys, fallback = null) {
    for (const k of keys) {
        if (row && row[k] !== undefined && row[k] !== null) return row[k];
    }
    return fallback;
}

function buildCharts(data) {
    // 1) ventes 30j (bar)
    destroyIf(chartVentes30j);

    const ventesLabels = (data.ventes30j || []).map(x => toLabel(pick(x, ["jour", "date", "day"])).slice(0, 10));
    const ventesValues = (data.ventes30j || []).map(x => toNum(pick(x, ["total_vente", "nb_ventes", "total", "ventes"])));

    chartVentes30j = new Chart($("chartVentes30j"), {
        type: "bar",
        data: {
            labels: ventesLabels,
            datasets: [{ label: "Total ventes", data: ventesValues }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { maxRotation: 0 } } }
        }
    });

    // 2) forecast sma7 (line)
    destroyIf(chartForecast);

    const fLabels = (data.forecast || []).map(x => toLabel(pick(x, ["jour", "date"])).slice(0, 10));
    const fCA = (data.forecast || []).map(x => toNum(pick(x, ["ca", "total_ca", "montant"])));
    const fSMA7 = (data.forecast || []).map(x => toNum(pick(x, ["sma7", "moyenne_7j"])));

    chartForecast = new Chart($("chartForecast"), {
        type: "line",
        data: {
            labels: fLabels,
            datasets: [
                { label: "CA", data: fCA },
                { label: "SMA7", data: fSMA7 },
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            elements: { point: { radius: 0 } }
        }
    });

    // 3) CA mensuel YTD (bar)
    destroyIf(chartCaMensuel);

    const mLabels = (data.caMensuel || []).map(x => toLabel(pick(x, ["mois", "month"])));
    const mValues = (data.caMensuel || []).map(x => toNum(pick(x, ["ca_mois", "ca", "total"])));

    chartCaMensuel = new Chart($("chartCaMensuel"), {
        type: "bar",
        data: { labels: mLabels, datasets: [{ label: "CA mensuel", data: mValues }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // 4) CA semaine 12 (line)
    destroyIf(chartCaSemaine);

    const sLabels = (data.caSemaine || []).map(x => toLabel(pick(x, ["debut_semaine", "an_semaine", "semaine"])));
    const sValues = (data.caSemaine || []).map(x => toNum(pick(x, ["ca_semaine", "ca", "total"])));

    chartCaSemaine = new Chart($("chartCaSemaine"), {
        type: "line",
        data: { labels: sLabels, datasets: [{ label: "CA semaine", data: sValues }] },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            elements: { point: { radius: 2 } }
        }
    });

    // 5) Top 5 produits (bar horizontal)
    destroyIf(chartTop5);

    const tLabels = (data.top5 || []).map(x => toLabel(pick(x, ["produit", "nom_produit", "nom"])));
    const tValues = (data.top5 || []).map(x => toNum(pick(x, ["total_vendu", "qte", "quantite", "total"])));

    chartTop5 = new Chart($("chartTop5"), {
        type: "bar",
        data: { labels: tLabels, datasets: [{ label: "Qté vendue", data: tValues }] },
        options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } } }
    });

    // 6) répartition catégorie (doughnut)
    destroyIf(chartCat);

    const cLabels = (data.cat || []).map(x => toLabel(pick(x, ["category", "categorie"])) || "—");
    const cValues = (data.cat || []).map(x => toNum(pick(x, ["ca", "total_ca", "montant_total"])));

    chartCat = new Chart($("chartCat"), {
        type: "doughnut",
        data: { labels: cLabels, datasets: [{ label: "CA", data: cValues }] },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    });

    // 7) Top fournisseurs (bar horizontal)
    destroyIf(chartFournisseurs);

    const foLabels = (data.fournisseurs || []).map(x => toLabel(pick(x, ["fournisseur", "fournisseur_nom", "nom"])));
    const foValues = (data.fournisseurs || []).map(x => toNum(pick(x, ["total_achat", "achat_total", "montant"])));

    chartFournisseurs = new Chart($("chartFournisseurs"), {
        type: "bar",
        data: { labels: foLabels, datasets: [{ label: "Total achats", data: foValues }] },
        options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } } }
    });
}


// ---------- lists ----------
function renderListExp(rows) {
    const el = $("listExp");
    if (!rows || rows.length === 0) {
        el.innerHTML = `<div class="li"><div class="meta"><b>Aucun</b><small>Pas d’expiration proche</small></div><span class="badge">OK</span></div>`;
        return;
    }

    el.innerHTML = rows.slice(0, 20).map(r => {
        const produit = r.produit || "—";
        const d = r.date_expiration || "—";
        const q = r.quantite ?? "—";
        return `
      <div class="li">
        <div class="meta">
          <b>${produit}</b>
          <small>Expire: ${d}</small>
        </div>
        <span class="badge danger">Qté: ${q}</span>
      </div>
    `;
    }).join("");
}

function renderListStockBas(rows) {
    const el = $("listStockBas");
    if (!rows || rows.length === 0) {
        el.innerHTML = `<div class="li"><div class="meta"><b>Aucun</b><small>Stock OK</small></div><span class="badge">OK</span></div>`;
        return;
    }

    el.innerHTML = rows.slice(0, 30).map(r => {
        const p = r.produit || "—";
        const stock = Number(r.total_stock || 0);
        const seuil = Number(r.seuil || 0);
        const badgeClass = stock <= 0 ? "danger" : "warn";
        return `
      <div class="li">
        <div class="meta">
          <b>${p}</b>
          <small>Seuil: ${seuil}</small>
        </div>
        <span class="badge ${badgeClass}">${stock}</span>
      </div>
    `;
    }).join("");
}

function renderListResumeStock(rows) {
    const el = $("listResumeStock");
    if (!rows || rows.length === 0) {
        el.innerHTML = `<div class="li"><div class="meta"><b>Aucun</b><small>Pas de données</small></div><span class="badge">—</span></div>`;
        return;
    }

    el.innerHTML = rows.slice(0, 20).map(r => {
        const p = r.produit || "—";
        const stock = Number(r.total_stock || 0);
        return `
      <div class="li">
        <div class="meta">
          <b>${p}</b>
          <small>Total en stock</small>
        </div>
        <span class="badge">${stock}</span>
      </div>
    `;
    }).join("");
}

// ---------- KPIs ----------
function setKpi(id, value, formatMoney = false) {
    $(id).textContent = formatMoney ? money(value) : String(value ?? 0);
}

// ---------- refresh ----------
async function refreshAll() {
    try {
        setStatus(true, "");

        // 1) On définit les queries par nom
        const Q = {
            // KPIs
            kpi_ca_jour: "kpi_ca_jour",
            kpi_nb_ventes_jour: "kpi_nb_ventes_jour",
            kpi_nb_alertes_stock: "kpi_nb_alertes_stock",
            kpi_nb_produits_actifs: "kpi_nb_produits_actifs",
            kpi_valeur_stock: "kpi_valeur_stock",
            kpi_ca_ytd: "kpi_ca_ytd",

            // (tes KPIs ajoutés)
            kpi_nb_produits_expires_en_stock: "kpi_nb_produits_expires_en_stock",
            kpi_marge_brute_30j: "kpi_marge_brute_30j",
            kpi_nb_fournisseurs_30j: "kpi_nb_fournisseurs_30j",

            // Charts
            chart_ventes_30j: "chart_ventes_30j",
            chart_ca_mensuel_ytd: "chart_ca_mensuel_ytd",
            chart_ca_par_semaine_12: "chart_ca_par_semaine_12",
            top5_produits_30j: "top5_produits_30j",
            repartition_categorie_30j: "repartition_categorie_30j",
            chart_top_fournisseurs_30j: "chart_top_fournisseurs_30j",

            // Lists
            alertes_expiration_30j: "alertes_expiration_30j",
            stock_bas: "stock_bas",
            resume_stock: "resume_stock",

            // Forecast
            forecast_sma7: "forecast_sma7",
        };

        // 2) Exécution en parallèle, puis reconstruction dans un objet "byName"
        const entries = Object.entries(Q);
        const results = await Promise.all(entries.map(([key, name]) => postQuery(name)));
        const byName = Object.fromEntries(entries.map(([key], i) => [key, results[i]]));

        // 3) KPIs
        setKpi("kpi_ca_jour", byName.kpi_ca_jour?.[0]?.ca_jour, true);
        setKpi("kpi_nb_ventes_jour", byName.kpi_nb_ventes_jour?.[0]?.nb_ventes_jour, false);
        setKpi("kpi_nb_alertes_stock", byName.kpi_nb_alertes_stock?.[0]?.nb_alertes_stock, false);
        setKpi("kpi_nb_produits_actifs", byName.kpi_nb_produits_actifs?.[0]?.nb_produits_actifs, false);
        setKpi("kpi_valeur_stock", byName.kpi_valeur_stock?.[0]?.valeur_stock, true);
        setKpi("kpi_ca_ytd", byName.kpi_ca_ytd?.[0]?.ca_ytd, true);

        // (tes KPIs ajoutés)
        setKpi("kpi_nb_produits_expires_en_stock", byName.kpi_nb_produits_expires_en_stock?.[0]?.nb_produits_expires_en_stock, false);
        setKpi("kpi_marge_brute_30j", byName.kpi_marge_brute_30j?.[0]?.marge_brute_30j, true);
        setKpi("kpi_nb_fournisseurs_30j", byName.kpi_nb_fournisseurs_30j?.[0]?.nb_fournisseurs_30j, false);

        // 4) Tags (optionnel)
        $("tagVentes30j").textContent = `${(byName.chart_ventes_30j || []).length} points`;
        $("tagForecast").textContent = `${(byName.forecast_sma7 || []).length} jours`;
        $("tagCA").textContent = `YTD: ${money(byName.kpi_ca_ytd?.[0]?.ca_ytd)}`;


        // check rapide
        console.log("ventes30j sample:", (byName.chart_ventes_30j || [])[0]);
        console.log("caMensuel sample:", (byName.chart_ca_mensuel_ytd || [])[0]);

        // 5) Charts
        buildCharts({
            ventes30j: byName.chart_ventes_30j || [],
            forecast: byName.forecast_sma7 || [],
            caMensuel: byName.chart_ca_mensuel_ytd || [],
            caSemaine: byName.chart_ca_par_semaine_12 || [],
            top5: byName.top5_produits_30j || [],
            cat: byName.repartition_categorie_30j || [],
            fournisseurs: byName.chart_top_fournisseurs_30j || [],
        });

        // 6) Lists
        renderListExp(byName.alertes_expiration_30j || []);
        renderListStockBas(byName.stock_bas || []);
        renderListResumeStock(byName.resume_stock || []);

        setLastRefresh();
        setStatus(true, "");
    } catch (e) {
        console.error(e);
        setStatus(false, e.message || "Erreur");
    }
}


// ---------- auto refresh ----------
let autoOn = true;
let timer = null;

function setAuto(on) {
    autoOn = on;
    $("btnAuto").textContent = `Auto: ${autoOn ? "ON" : "OFF"}`;
    $("btnAuto").classList.toggle("primary", autoOn);

    if (timer) { clearInterval(timer); timer = null; }
    if (autoOn) {
        timer = setInterval(refreshAll, 30_000); // toutes les 30 secondes
    }
}

$("btnRefresh").addEventListener("click", refreshAll);
$("btnAuto").addEventListener("click", () => setAuto(!autoOn));

// init
(async function init() {
    setAuto(true);
    await refreshAll();
})();
