from flask import Flask, jsonify
from flask_json import FlaskJSON
from routes.products import products_bp
from routes.productmgt import productmgt_bp
from routes.sales import sales_bp
from routes.stock import stock_bp
from routes.modStock import modStock_bp
from routes.saleMvt import saleMvt_bp
from routes.qte_stock_lot import qte_stock_bp

app = Flask(__name__)
app.config.from_object('config.Config')
FlaskJSON(app)

# Enregistrement des blueprints
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(productmgt_bp, url_prefix='/api/productmgt')
app.register_blueprint(sales_bp, url_prefix='/api/sales')
app.register_blueprint(stock_bp, url_prefix='/api/stock')
app.register_blueprint(modStock_bp, url_prefix='/api/modStock')
app.register_blueprint(saleMvt_bp, url_prefix='/api/saleMvt')
app.register_blueprint(qte_stock_bp, url_prefix='/api/qteStockLot')

@app.route('/')
def home():
    return jsonify({'status': 'API en fonctionnement'})

if __name__ == '__main__':
    app.run(debug=True)