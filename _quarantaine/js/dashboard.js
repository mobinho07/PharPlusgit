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

//Recupération des données Top 5 Produit le plus vendu
async function FetchTopVendu() {
    try {
        const response = await fetch("http://localhost:5000/api/produitVendu/resultat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date_debut: "2025-11-01",
                date_fin: "2025-11-30",
                limit: 5,
                lite: "N"
            })
        });

        if (!response.ok) throw new Error("Erreur API");

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        return result.data.map(item => ({
            nom: item.Nom_produit,
            montant: item.Montant_vendu,
            quantiteVendue: item.Quantite_vendue,
            quantiteStock: item.Quantite_stock,
            dateVente: item.date_vente
        }));

    } catch (error) {
        console.error("Erreur FetchTopVendu :", error);
        return null;
    }
}


//Fonction pour afficher les 5 produits les plus vendus
function AfficheTopVendu(data){
    const cards= document.querySelectorAll('.cards .card');
    cards.forEach((card, index) => {
        const item = data[index];
        if (!item) {
            card.querySelector('.titre').textContent = 'N/A';
            card.querySelector('.prix').textContent = '--';
            card.querySelectorAll('.stock-value')[0].textContent = '--';
            card.querySelectorAll('.stock-value')[1].textContent = '--';
            return;
        }

        // Mettre à jour le contenu de la carte
        card.querySelector('.titre').textContent = item.nom;
        card.querySelector('.prix').textContent = item.montant + '$';
        card.querySelectorAll('.stock-value')[0].textContent = item.quantiteVendue;
        card.querySelectorAll('.stock-value')[1].textContent = item.quantiteStock;
    });
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

    // Récuperer ventes API et afficher Top Vendu
    const topVenduData = await FetchTopVendu();
    if (topVenduData) {
        AfficheTopVendu(topVenduData);
    } else {
        console.error("Aucune donnée de vente disponible pour l'affichage.");
    }

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

    // === Remplir Evolution_Vente ===
    const ventesData = await FetchVentes30J();
    const middleOne = document.getElementById("middle-one");

    if (ventesData) {
       // middleOne.innerHTML = CreateLineChart(ventesData);
        middleOne.innerHTML = CreateBarChart(ventesData);
    } else {
        middleOne.innerHTML = "<div class='error'>Impossible de charger l'évolution des ventes.</div>";
    }

}

// === Récupération des ventes des 30 jours ===
async function FetchVentes30J() {
    try {
        const response = await fetch("http://localhost:5000/api/dashboard/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "chart_ventes_30j" })
        });

        if (!response.ok) throw new Error("Erreur API ventes");

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // Transformer les données
        return result.data.map(item => ({
            jour: new Date(item.jour),    // transformer en date JS
            total: parseFloat(item.total_ventes)
        }));

    } catch (error) {
        console.error("Erreur FetchVentes30J :", error);
        return null;
    }
}

// === Graph simple en ligne (évolution des ventes) ===
function CreateLineChart(data) {
    if (!data || data.length === 0) {
        return "<div class='error'>Aucune donnée disponible</div>";
    }

    const maxValue = Math.max(...data.map(d => d.total));

    let pointsHTML = data.map((item, index) => {
        const left = (index / (data.length - 1)) * 100;
        const bottom = (item.total / maxValue) * 100;

        return `
            <div class="point" style="left:${left}%; bottom:${bottom}%" title="${item.total}$ - ${item.jour.toLocaleDateString()}"></div>
        `;
    }).join("");

    return `
        <div class="line-chart">
            <div class="line-chart-container">
                ${pointsHTML}
            </div>
        </div>
    `;
}

function CreateBarChart(data) {
    if (!data || data.length === 0) {
        return "<div class='error'>Aucune donnée disponible</div>";
    }

    const maxValue = Math.max(...data.map(d => d.total));

    return `
        <div class="bar-chart">
            ${data.map(d => `
                <div class="bar-item">
                    <div class="bar" style="height:${(d.total / maxValue) * 100}%"></div>
                    <div class="bar-label">${d.jour.toLocaleDateString("fr-CA")}</div>
                    <div class="bar-value">${d.total}$</div>
                </div>
            `).join("")}
        </div>
    `;
}
