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



---

# 📅 Plan réaliste – 5 sprints

⏳ **Durée par sprint : 3 semaines** (adapté à ton emploi du temps et à tes études).  
👉 Cela fait **~4 mois au total** pour une version solide et pro.

---

### 🔹 Sprint 1 (Semaines 1–3) → README + nettoyage
- Finaliser le README.md.  
- Créer `.env` pour gérer les variables sensibles (DB, secret key).  
- Réorganiser le backend (dossiers `models`, `services`).  
- Livrable : projet plus propre, bien documenté.  

⏰ Temps : 6–8 séances de 2h (lundi-vendredi)  
🎯 Conseil : prends 2 jours pour le README/doc, puis 4–5 pour la réorganisation.

---

### 🔹 Sprint 2 (Semaines 4–6) → Authentification solide
- Intégrer bcrypt ou argon2 pour le hash des mots de passe.  
- Ajouter JWT (connexion → token → accès routes protégées).  
- Créer un système de rôles (admin, user).  
- Livrable : login/logout sécurisés.  

⏰ Temps : 7–8 séances de 2–3h.  
🎯 Conseil : décomposer → d’abord hash, puis JWT, enfin rôles.

---

### 🔹 Sprint 3 (Semaines 7–9) → Dockerisation
- Écrire un `Dockerfile` pour Flask.  
- Ajouter `docker-compose.yml` (API + DB).  
- Documenter dans README.  
- Livrable : projet lançable avec `docker-compose up`.  

⏰ Temps : 5–6 séances.  
🎯 Conseil : commencer simple (API seule), puis ajouter DB.

---

### 🔹 Sprint 4 (Semaines 10–12) → Tests + CI/CD
- Ajouter `pytest`.  
- Écrire des tests simples (ex. création produit, login).  
- Intégrer GitHub Actions (tests lancés automatiquement à chaque push).  
- Livrable : badge ✅ CI dans README.  

⏰ Temps : 6–7 séances.  
🎯 Conseil : commencer avec 2–3 tests unitaires, puis étendre.

---

### 🔹 Sprint 5 (Semaines 13–15) → Frontend/API + Doc
- Documenter API avec Swagger/Flasgger.  
- Relier proprement frontend JS → API REST.  
- Bonus : explorer React/Vue pour un module (ex. gestion produits).  
- Livrable : doc API + frontend connecté.  

⏰ Temps : 8–9 séances.  
🎯 Conseil : viser petit → 1 module React/Vue max, pas tout refaire.

---

# 🧭 Méthode de travail
- **Rituels** : choisis 3 jours fixes/semaine (ex. Lundi, Mercredi, Vendredi → 14h–16h).  
- **Kanban/Trello** : crée un tableau avec "À faire / En cours / Fini".  
- **Livrable par sprint** : à la fin des 3 semaines, tu pushes sur GitHub + notes dans README ce qui a été fait.  

---

