document.addEventListener('DOMContentLoaded', function () {
    const username = localStorage.getItem('loggedInUser');
    if (!username) {
        window.location.href = 'index.html';
    }

    document.getElementById('usernameDisplay').textContent = username;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString();

    document.getElementById('userIcon').addEventListener('click', function () {
        const dropdown = document.getElementById('userDropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
});