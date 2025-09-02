# 💊 Pharmaplus – Application de gestion pharmaceutique

Pharmaplus est une application de gestion de stock et de ventes pour pharmacie.  
Elle permet de gérer les **produits, stocks, ventes, utilisateurs et prévisions** via une interface web (HTML/JS) et une API backend (Flask/Python).

---

## 🚀 Fonctionnalités principales
- Gestion des produits (ajout, modification, suppression).
- Gestion du stock et suivi des lots.
- Suivi des ventes et mouvements.
- Rapport sur les produits les plus vendus.
- Gestion des utilisateurs.
- Authentification basique.
- Frontend HTML/CSS/JS connecté au backend.

---

## 🛠️ Technologies utilisées
- **Backend** : Python, Flask
- **Base de données** : (MySQL/SQLite selon config)
- **Frontend** : HTML, CSS, JavaScript
- **Outils** : SQLAlchemy (prévu), Flask Blueprints

---

## 📂 Structure du projet
PharPlusgit/
│── index.html
│── css/
│── js/
│── pages/
│── Server/
│ ├── app.py # Point d'entrée
│ ├── auth.py # Authentification
│ ├── config.py # Configuration
│ ├── database.py # Connexion DB
│ ├── routes/ # Routes organisées par module
│ └── requirements.txt

---

## ⚙️ Installation

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/ton-compte/PharPlusgit.git
   cd PharPlusgit/Server
2. Créer un environnement virtuel
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

3. Installer les dépendances
pip install -r requirements.txt

4. Configurer la base de données
Vérifier les paramètres dans config.py.
Créer la base si nécessaire (MySQL ou SQLite).

5. Lancer le serveur
python app.py

Le backend sera disponible sur http://localhost:5000.
