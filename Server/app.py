import os
from flask import Flask, jsonify 
from routes.products import products_bp
from routes.productmgt import productmgt_bp
from routes.sales import sales_bp
from routes.stock import stock_bp
from routes.modStock import modStock_bp
from routes.saleMvt import saleMvt_bp
from routes.qte_stock_lot import qte_stock_bp
from routes.topProduitVendu import topProduitVendu_bp
from routes.produit_expiration import expire_bp
from routes.masterView import master_bp
from routes.dashboard import dashboard_bp
from flask_cors import CORS
from routes.products2 import products2_bp
from routes.lots import lots_bp
from routes.stock2 import stock2_bp
from routes.price2 import price2_bp
from routes.fournisseurs import fournisseurs_bp
from routes.auth_api import auth_api_bp
from routes.users import users_bp
from routes.users_api import users_api_bp 
from flask import request
from routes.logs_api import logs_api

app = Flask(__name__)
#CORS(app)  # Active CORS pour toutes les routes
app.config["SECRET_KEY"] = os.environ.get("PHARMAPLUS_SECRET_KEY") or "dev-secret-change-me"
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
]}})
app.config.from_object('config.Config') 

# Enregistrement des blueprints
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(productmgt_bp, url_prefix='/api/productmgt')
app.register_blueprint(sales_bp, url_prefix='/api/sales')
app.register_blueprint(stock_bp, url_prefix='/api/stock')
app.register_blueprint(modStock_bp, url_prefix='/api/modStock')
app.register_blueprint(saleMvt_bp, url_prefix='/api/saleMvt')
app.register_blueprint(qte_stock_bp, url_prefix='/api/qteStockLot')
app.register_blueprint(topProduitVendu_bp, url_prefix='/api/produitVendu')
app.register_blueprint(expire_bp, url_prefix='/api/expire') 
app.register_blueprint(master_bp, url_prefix='/api/master') 
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(products2_bp, url_prefix="/api/products2")
app.register_blueprint(lots_bp, url_prefix="/api/lots")
app.register_blueprint(stock2_bp, url_prefix="/api/stock2")
app.register_blueprint(price2_bp, url_prefix="/api/price2")
app.register_blueprint(fournisseurs_bp, url_prefix="/api/fournisseurs")
app.register_blueprint(auth_api_bp, url_prefix="/api/auth")
app.register_blueprint(users_bp, url_prefix="/api/users2")
app.register_blueprint(users_api_bp, url_prefix="/api/users") 
app.register_blueprint(logs_api, url_prefix="/api/logs")


@app.route('/')
def home():
    return jsonify({'status': 'API en fonctionnement'})

if __name__ == '__main__':
    print("Routes enregistrées:")
    for rule in app.url_map.iter_rules():
        print(rule)
    app.run(host='0.0.0.0', port=5000, debug=True)