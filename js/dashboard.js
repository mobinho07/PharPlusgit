document.addEventListener('DOMContentLoaded', function () {
    // Gestion utilisateur
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
    // Initialiser le graphique
    initGraph();
});

//Recupération des données Top 5 Stock par Produit
async function TopFiveStockProduit() {
    try {
        console.log('Call API for Fetch');
        const response= await fetch('http://localhost:5000/api/products/stock', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ limit: 8 })
    });
        if (!response.ok){
            throw new Error('Erreur de réseau');
        }else{
            console.log('Response is OK');
        }

        const result = await response.json();

        if (!result.success){
            throw new Error(result.error || 'Erreur inconnue du serveur');
        }

        // Transformer les données de l'API pour correspondre à notre format
        return result.data.map(item => ({
            name: item.nom,       // 'nom' vient de votre requête SQL
            value: item.quantite   // 'quantite' vient de votre requête SQL
        }));

    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error)
        return null;
    }
}

//Fonction pour afficher les 5 produits les plus vendus
function AfficheTopVendu(data){
    if (!data || data.length === 0) {
        return '<div class="error">Aucune donnée disponible</div>';
    }

    const innerHTML=`
        
    `
}
//Fonction pour créer le graphique
function CreateGraph(data){
    if (!data || data.length === 0) {
        return '<div class="error">Aucune donnée disponible</div>';
    }

    const maxValue=Math.max(...data.map(item => item.value));
    const scaleStep=maxValue <= 100 ? 20:
                    maxValue <= 200 ? 50:
                    100;
    const graphHTML =`
        <div class="graph-container">
            <div class="graph-title">Top 10 Produits/Quantités en Stock</div>
            <div class="graph-body">
                <div class="product-labels">
                    ${data.map(item => `<div class="product-label">${item.name}</div>`).join('')}
                </div>
                <div class="bars-container">
                    ${data.map(item => `
                        <div class="bar-row">
                            <div class="bar" style="width:${(item.value/maxValue)*100}%"></div>
                            <div class="bar-value">${item.value}</div>
                        </div>`).join('')}
                </div>
            </div>
        </div>`;

        return graphHTML;
}

// Fonction principale
async function initGraph() {
    console.log("Fonction Init Graph appelle")
    const container = document.querySelector('.to-five');
    const container2 = document.querySelector('.to-five2');
    const container3 = document.querySelector('.to-five3');
    const container4 = document.querySelector('.to-five4');
    const container5 = document.querySelector('.to-five5');
    
    if (!container) {
        console.error("Element .to-five non trouvé");
        return;
    }

    // Afficher un message de chargement
    container.innerHTML = '<div class="loading">Chargement des données...</div>';
    container2.innerHTML = '<div class="loading">Chargement des données...</div>';
    container3.innerHTML = '<div class="loading">Chargement des données...</div>';
    container4.innerHTML = '<div class="loading">Chargement des données...</div>';
    container5.innerHTML = '<div class="loading">Chargement des données...</div>';

    try {
        // Récupérer les données depuis l'API
        const apiData = await TopFiveStockProduit();
        
        // Si l'API n'est pas disponible, utiliser des données par défaut
        const data = apiData || [
            { name: "Produit 5", value: 67 },
            { name: "Produit 4", value: 98 },
            { name: "Produit 3", value: 111 },
            { name: "Produit 2", value: 132 },
            { name: "Produit 1", value: 246 }
        ];
        
        // Créer et insérer le graphique
        container.innerHTML = CreateGraph(data);
        container2.innerHTML = CreateGraph(data);
        container3.innerHTML = CreateGraph(data);
        container4.innerHTML = CreateGraph(data);
        container5.innerHTML = CreateGraph(data);
    } catch (error) {
        console.error("Erreur lors de l'initialisation du graphique:", error);
        container.innerHTML = '<div class="error">Erreur lors du chargement des données</div>';
    }
}
