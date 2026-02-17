document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Simuler une connexion
    if (username === 'admin' && password === 'admin') {
        localStorage.setItem('loggedInUser', username);
        window.location.href = 'pages/dashboard.html';
    } else {
        alert('Nom d\'utilisateur ou mot de passe incorrect.');
    }
});