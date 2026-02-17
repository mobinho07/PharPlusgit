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

    if (!res.ok) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();
    // data.user attendu d'après ton backend
    localStorage.setItem("auth_user", JSON.stringify(data.user));
  } catch (e) {
    // Si backend down / erreur réseau → prudence
    window.location.href = "login.html";
  }
})();
