const API_BASE = "http://127.0.0.1:5000";
const API = { login: `${API_BASE}/api/auth/login` };

const $ = (id) => document.getElementById(id);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

$("btnLogin").addEventListener("click", async () => {
  $("msg").textContent = "";

  const username = $("username").value.trim();
  const password = $("password").value;

  try {
    const resp = await fetchJson(API.login, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    // Après login OK
    localStorage.setItem("auth_token", resp.token);

    // IMPORTANT: pour que auth_guard.js ne redirige pas en boucle
    localStorage.setItem("auth_user", JSON.stringify(resp.user));

    // (Optionnel) si tu gardes les anciennes clés
    localStorage.setItem("user_id", resp.user.id_utilisateur ?? resp.user.id ?? "");
    localStorage.setItem("user_name", resp.user.nom ?? resp.user.name ?? "");
    localStorage.setItem("user_role", resp.user.role ?? "");




    // Redirection
    window.location.href = "dashboard.html";
  } catch (e) {

    let message = "";

    if (e.message === "Failed to fetch") {
      message = "Impossible de joindre le serveur.";
    }

    else if (e.message.includes("Identifiants")) {
      message = "Identifiants incorrects.";
    }

    else if (e.message.includes("username et password requis")) {
      message = "Nom d'utilisateur et mot de passe requis.";
    }

    else {
      message = "Erreur inattendue."+` (${e.message})`;
    }

    $("msg").textContent = message;

    // $("msg").textContent = `Erreur: ${e.message}`;
  }
});

// Enter = login
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btnLogin").click();
});
