(function () {
  const path = location.pathname.split("/").pop();
  document.querySelectorAll(".navLink").forEach(a => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
})();

(function () {
  const name = localStorage.getItem("user_name") || "—";
  const role = localStorage.getItem("user_role") || "—";

  const host = document.querySelector("header .left");
  if (host) {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.innerHTML = `Utilisateur: <b>${name}</b> (${role})`;
    host.appendChild(pill);
  }

  const actions = document.querySelector("header .actions");
  if (actions) {
    const btn = document.createElement("button");
    btn.className = "danger";
    btn.textContent = "Déconnexion";
    btn.addEventListener("click", () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_name");
      localStorage.removeItem("user_role");
      location.href = "login.html";
    });
    actions.appendChild(btn);
  }
})();
