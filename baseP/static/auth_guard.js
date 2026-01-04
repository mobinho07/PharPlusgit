(function () {
  const token = localStorage.getItem("auth_token");
  const user = localStorage.getItem("auth_user");

  if (!token || !user) {
    // Pas authentifié → retour login
    window.location.href = "login.html";
    return;
  }

  // Expose l'utilisateur globalement si besoin
  window.CURRENT_USER = JSON.parse(user);
})();
