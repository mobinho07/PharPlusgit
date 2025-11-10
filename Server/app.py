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

app = Flask(__name__)
CORS(app)  # Active CORS pour toutes les routes
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

@app.route('/')
def home():
    return jsonify({'status': 'API en fonctionnement'})

if __name__ == '__main__':
    print("Routes enregistrées:")
    for rule in app.url_map.iter_rules():
        print(rule)
    app.run(host='0.0.0.0', port=5000, debug=True)