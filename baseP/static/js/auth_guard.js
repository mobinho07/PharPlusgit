(async function () {
  const isLoginPage =
    window.location.pathname.endsWith("login.html") ||
    window.location.pathname.endsWith("/login");

  if (isLoginPage) return;

  const token = localStorage.getItem("auth_token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      // token invalide -> forcer logout
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      // erreur temporaire côté backend (500, 503, CORS...) -> on évite de rediriger
      console.warn("Auth check failed (non-401):", res.status);
      return;
    }

    const data = await res.json();
    // data.user attendu d'après ton backend
    if (data && data.user) {
      localStorage.setItem("auth_user", JSON.stringify(data.user));
    }
  } catch (e) {
    // Erreur réseau ou exception -> ne pas rediriger automatiquement
    console.warn("Auth network error, keeping token:", e);
  }
})();
