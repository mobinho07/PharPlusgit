const API_BASE = "http://127.0.0.1:5000";
const API = {
  list: `${API_BASE}/api/users/list`,
  create: `${API_BASE}/api/users/create`,
  update: (id) => `${API_BASE}/api/users/update/${id}`,
  reset: (id) => `${API_BASE}/api/users/reset_password/${id}`,
};

const $ = (id) => document.getElementById(id);

async function fetchJson(url, opts={}) { 
  const res = await fetch(url, {
    headers: {
      "Content-Type":"application/json", 
      ...(opts.headers||{})
    },
    ...opts
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  if (data?.success === false) throw new Error(data?.error || "Erreur");
  return data;
}

function openModal() {
  $("modal").style.display = "flex";
  $("modalMsg").textContent = "";
}
function closeModal() {
  $("modal").style.display = "none";
}

function rowActions(u) {
  return `
    <button class="tinybtn" data-act="toggle" data-id="${u.id_utilisateur}">
      ${u.actif ? "Désactiver" : "Activer"}
    </button>
    <button class="tinybtn warn" data-act="reset" data-id="${u.id_utilisateur}">
      Reset MDP
    </button>
  `;
}

async function load() {
  const q = encodeURIComponent($("q").value.trim());
  const role = encodeURIComponent($("role").value);
  const actif = encodeURIComponent($("actif").value);

  const url = `${API.list}?q=${q}&role=${role}&actif=${actif}`;
  const resp = await fetchJson(url);
  const rows = resp.data || [];

  const tb = $("tbody");
  tb.innerHTML = rows.map(u => `
    <tr>
      <td>${u.id_utilisateur}</td>
      <td>${u.nom}</td>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${u.actif ? "Oui" : "Non"}</td>
      <td>${rowActions(u)}</td>
    </tr>
  `).join("");

  tb.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const act = btn.getAttribute("data-act");
      const id = Number(btn.getAttribute("data-id"));

      if (act === "toggle") {
        const makeActive = confirm("Basculer le statut actif/inactif ?");
        if (!makeActive) return;
        // on recharge l’état depuis la ligne HTML
        const row = btn.closest("tr");
        const isActif = row.children[4].textContent.trim() === "Oui";
        await fetchJson(API.update(id), {
          method: "PUT",
          body: JSON.stringify({ actif: isActif ? 0 : 1 })
        });
        await load();
      }

      if (act === "reset") {
        const np = prompt("Nouveau mot de passe :");
        if (!np) return;
        await fetchJson(API.reset(id), {
          method: "POST",
          body: JSON.stringify({ new_password: np })
        });
        alert("Mot de passe réinitialisé.");
      }
    });
  });
}

$("btnSearch").addEventListener("click", load);

$("btnNew").addEventListener("click", () => {
  $("m_nom").value = "";
  $("m_username").value = "";
  $("m_role").value = "caissier";
  $("m_password").value = "";
  openModal();
});

$("btnCancel").addEventListener("click", closeModal);

$("btnSave").addEventListener("click", async () => {
  try {
    const payload = {
      nom: $("m_nom").value.trim(),
      username: $("m_username").value.trim(),
      role: $("m_role").value,
      password: $("m_password").value
    };
    await fetchJson(API.create, { method:"POST", body: JSON.stringify(payload) });
    closeModal();
    await load();
  } catch(e) {
    $("modalMsg").textContent = e.message;
  }
});

// init
load();
