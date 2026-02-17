document.addEventListener('DOMContentLoaded', function () {
    const username = localStorage.getItem('loggedInUser');
    if (!username) {
        window.location.href = 'index.html';
    }

    document.getElementById('usernameDisplay').textContent = username;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString();

    const stockTable = document.getElementById('stockTable').getElementsByTagName('tbody')[0];

    // Charger le stock depuis localStorage
    let stock = JSON.parse(localStorage.getItem('stock')) || [];

    // Afficher le stock
    function renderStock() {
        stockTable.innerHTML = '';
        stock.forEach((item, index) => {
            const row = stockTable.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>
                    <button onclick="editStock(${index})">Modifier</button>
                    <button onclick="deleteStock(${index})">Supprimer</button>
                </td>
            `;
        });
    }

    // Ajouter un produit au stock
    document.getElementById('addStockForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const productName = document.getElementById('productName').value;
        const productQuantity = parseInt(document.getElementById('productQuantity').value, 10);

        stock.push({ name: productName, quantity: productQuantity });
        localStorage.setItem('stock', JSON.stringify(stock));
        renderStock();
        this.reset();
    });

    // Modifier un produit
    window.editStock = function (index) {
        const newQuantity = prompt('Entrez la nouvelle quantité :');
        if (newQuantity !== null) {
            stock[index].quantity = parseInt(newQuantity, 10);
            localStorage.setItem('stock', JSON.stringify(stock));
            renderStock();
        }
    };

    // Supprimer un produit
    window.deleteStock = function (index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
            stock.splice(index, 1);
            localStorage.setItem('stock', JSON.stringify(stock));
            renderStock();
        }
    };

    renderStock();
});