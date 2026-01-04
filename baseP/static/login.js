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
  try { data = text ? JSON.parse(text) : null; } catch {}
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

    localStorage.setItem("auth_token", resp.token);
    localStorage.setItem("user_id", resp.user.id_utilisateur);
    localStorage.setItem("user_name", resp.user.nom || "");
    localStorage.setItem("user_role", resp.user.role || "");

    // Redirection
    window.location.href = "dashboard.html";
  } catch (e) {
    $("msg").textContent = `Erreur: ${e.message}`;
  }
});

// Enter = login
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btnLogin").click();
});
