"""
Flask API server for Fresh AI Trade.
Handles authentication endpoints: /register and /login
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from auth import register_user, login_user
from products import create_product, get_products_by_farmer, get_product, update_product, delete_product, get_all_products_for_marketplace
from cart import get_cart, get_cart_count, add_to_cart, update_cart_item, remove_from_cart, checkout, buy_now
from buyer import (
    get_buyer_dashboard,
    get_saved_products,
    add_saved_product,
    remove_saved_product,
    get_buyer_profile,
    update_buyer_profile,
    list_buyer_orders,
    list_buyer_payments,
    list_buyer_complaints,
    add_buyer_complaint,
)
from farmer import (
    get_farmer_profile,
    update_farmer_profile,
    get_farmer_overview,
    list_farmer_orders,
    update_farmer_order_status,
    get_farmer_reports,
    list_farmer_complaints,
    resolve_farmer_complaint,
    list_farmer_documents,
    add_farmer_document,
)
from admin import (
    get_admin_overview,
    list_users,
    set_user_status,
    list_farmers,
    set_farmer_approval,
    list_products,
    set_product_approval,
    list_orders,
    list_payments,
    get_reports_summary,
)
from price_prediction import get_prediction_options, predict_price
from otp_service import send_otp, verify_otp, consume_verification_token, validate_verification_token
from weather_service import get_weather_forecast

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        data = request.get_json() or {}

        # Validate required fields
        required_fields = ['name', 'password', 'user_type']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "message": f"Missing required field: {field}"
                }), 400

        email = (data.get("email") or "").strip()
        phone = (data.get("phone") or "").strip()
        if not email and not phone:
            return jsonify({
                "success": False,
                "message": "Email or phone number is required"
            }), 400

        # Optional OTP verification support (if client sends token/type).
        verification_type = (data.get("verification_type") or "").strip().lower()
        verification_token = (data.get("verification_token") or "").strip()
        if verification_type or verification_token:
            if verification_type not in {"email", "phone"}:
                return jsonify({
                    "success": False,
                    "message": "verification_type must be 'email' or 'phone'"
                }), 400
            identifier = email if verification_type == "email" else phone
            if not identifier:
                return jsonify({
                    "success": False,
                    "message": f"Provide {verification_type} to match OTP verification"
                }), 400
            if not validate_verification_token(verification_type, identifier, verification_token):
                return jsonify({
                    "success": False,
                    "message": "OTP verification token is invalid or expired"
                }), 400

        # Validate password confirmation (if provided)
        if 'confirmPassword' in data and data['password'] != data['confirmPassword']:
            return jsonify({
                "success": False,
                "message": "Passwords don't match"
            }), 400

        # Register user
        result = register_user(
            name=data['name'],
            email=email,
            phone=phone,
            password=data['password'],
            user_type=data['user_type']
        )

        if result['success']:
            if verification_type and verification_token:
                consume_verification_token(verification_type, identifier, verification_token)
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp_route():
    """Send OTP to email or phone (dev mode returns otp in response)."""
    try:
        data = request.get_json() or {}
        identifier_type = (data.get("identifier_type") or "").strip().lower()
        identifier = (data.get("identifier") or "").strip()

        if identifier_type not in {"email", "phone"}:
            return jsonify({"success": False, "message": "identifier_type must be 'email' or 'phone'"}), 400
        if not identifier:
            return jsonify({"success": False, "message": "identifier is required"}), 400

        result = send_otp(identifier_type, identifier)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp_route():
    """Verify OTP and return short-lived verification token."""
    try:
        data = request.get_json() or {}
        identifier_type = (data.get("identifier_type") or "").strip().lower()
        identifier = (data.get("identifier") or "").strip()
        otp = (data.get("otp") or "").strip()

        if identifier_type not in {"email", "phone"}:
            return jsonify({"success": False, "message": "identifier_type must be 'email' or 'phone'"}), 400
        if not identifier:
            return jsonify({"success": False, "message": "identifier is required"}), 400
        if not otp:
            return jsonify({"success": False, "message": "otp is required"}), 400

        result = verify_otp(identifier_type, identifier, otp)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    """Login a user."""
    try:
        data = request.get_json()

        # Validate required fields
        if 'email' not in data or 'password' not in data:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        # Get user_type if provided (optional for login)
        user_type = data.get('user_type')

        # Login user
        result = login_user(
            email=data['email'],
            password=data['password'],
            user_type=user_type
        )

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 401

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": "Fresh AI Trade API is running"}), 200


@app.route('/api/prediction/options', methods=['GET'])
def prediction_options():
    """Get regions and commodity options for fruit/vegetable models."""
    try:
        options = get_prediction_options()
        return jsonify({"success": True, **options}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/weather/forecast', methods=['GET'])
def weather_forecast():
    """Fetch next few days of weather for a district from the selected date."""
    try:
        region = (request.args.get("region") or "").strip()
        target_date = (request.args.get("date") or "").strip()

        if not region:
            return jsonify({"success": False, "message": "region is required"}), 400
        if not target_date:
            return jsonify({"success": False, "message": "date is required"}), 400

        forecast = get_weather_forecast(region, target_date)
        return jsonify({"success": True, "forecast": forecast}), 200
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/predict-price', methods=['POST'])
def predict_price_route():
    """Predict LKR price for selected fruit/vegetable commodity."""
    try:
        data = request.get_json() or {}
        result = predict_price(data)
        return jsonify({"success": True, "prediction": result}), 200
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# Product Management Endpoints

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get products: use ?farmer_id= for farmer's products, or ?all=1 for marketplace."""
    try:
        all_products = request.args.get('all', type=int)
        if all_products:
            result = get_all_products_for_marketplace()
            if result['success']:
                return jsonify(result), 200
            return jsonify(result), 500

        farmer_id = request.args.get('farmer_id', type=int)
        if not farmer_id:
            return jsonify({
                "success": False,
                "message": "farmer_id or all=1 is required"
            }), 400

        result = get_products_by_farmer(farmer_id)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    """Get a single product by ID."""
    try:
        result = get_product(product_id)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route('/api/products', methods=['POST'])
def add_product():
    """Create a new product."""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['farmer_id', 'name', 'category', 'quality', 'price', 'unit', 'available_quantity']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "message": f"Missing required field: {field}"
                }), 400

        # Create product
        result = create_product(
            farmer_id=data['farmer_id'],
            name=data['name'],
            category=data['category'],
            quality=data['quality'],
            price=float(data['price']),
            unit=data['unit'],
            available_quantity=float(data['available_quantity']),
            image_url=data.get('image_url'),
            description=data.get('description')
        )

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product_by_id(product_id):
    """Update a product."""
    try:
        data = request.get_json()

        if 'farmer_id' not in data:
            return jsonify({
                "success": False,
                "message": "farmer_id is required"
            }), 400

        # Update product
        result = update_product(
            product_id=product_id,
            farmer_id=data['farmer_id'],
            name=data.get('name'),
            category=data.get('category'),
            quality=data.get('quality'),
            price=float(data['price']) if 'price' in data else None,
            unit=data.get('unit'),
            available_quantity=float(data['available_quantity']) if 'available_quantity' in data else None,
            image_url=data.get('image_url'),
            description=data.get('description'),
            status=data.get('status')
        )

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product_by_id(product_id):
    """Delete a product."""
    try:
        data = request.get_json()

        if 'farmer_id' not in data:
            return jsonify({
                "success": False,
                "message": "farmer_id is required"
            }), 400

        # Delete product
        result = delete_product(product_id, data['farmer_id'])

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


# Cart & Checkout (Buyer)

@app.route('/api/cart', methods=['GET'])
def get_cart_route():
    """Get cart for buyer. Use ?count=1 for just item count."""
    try:
        buyer_id = request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        if request.args.get('count'):
            result = get_cart_count(buyer_id)
        else:
            result = get_cart(buyer_id)
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/cart', methods=['POST'])
def add_to_cart_route():
    """Add to cart: body { buyer_id, product_id, quantity }."""
    try:
        data = request.get_json()
        for k in ['buyer_id', 'product_id', 'quantity']:
            if k not in data:
                return jsonify({"success": False, "message": f"Missing {k}"}), 400
        result = add_to_cart(int(data['buyer_id']), int(data['product_id']), float(data['quantity']))
        if result['success']:
            return jsonify(result), 201
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/cart/<int:product_id>', methods=['PUT'])
def update_cart_route(product_id):
    """Update cart item quantity: body { buyer_id, quantity }."""
    try:
        data = request.get_json()
        if 'buyer_id' not in data or 'quantity' not in data:
            return jsonify({"success": False, "message": "buyer_id and quantity required"}), 400
        result = update_cart_item(int(data['buyer_id']), product_id, float(data['quantity']))
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/cart/<int:product_id>', methods=['DELETE'])
def remove_from_cart_route(product_id):
    """Remove from cart: body { buyer_id } or ?buyer_id=."""
    try:
        data = request.get_json() or {}
        buyer_id = data.get('buyer_id') or request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = remove_from_cart(int(buyer_id), product_id)
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/checkout', methods=['POST'])
def checkout_route():
    """Checkout: body { buyer_id, payment_method? }."""
    try:
        data = request.get_json()
        if not data or 'buyer_id' not in data:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        payment_method = (data.get('payment_method') or 'COD').strip().upper()
        result = checkout(int(data['buyer_id']), payment_method)
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buy-now', methods=['POST'])
def buy_now_route():
    """Buy now: body { buyer_id, product_id, quantity, payment_method? }."""
    try:
        data = request.get_json() or {}
        required = ['buyer_id', 'product_id', 'quantity']
        for field in required:
            if field not in data:
                return jsonify({"success": False, "message": f"{field} required"}), 400

        payment_method = (data.get('payment_method') or 'COD').strip().upper()
        result = buy_now(
            int(data['buyer_id']),
            int(data['product_id']),
            float(data['quantity']),
            payment_method
        )
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buyer/dashboard', methods=['GET'])
def buyer_dashboard_route():
    """Buyer dashboard: stats, saved products, recent orders."""
    try:
        buyer_id = request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = get_buyer_dashboard(buyer_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/saved-products', methods=['GET'])
def get_saved_products_route():
    try:
        buyer_id = request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = get_saved_products(buyer_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/saved-products', methods=['POST'])
def add_saved_product_route():
    try:
        data = request.get_json() or {}
        if 'buyer_id' not in data or 'product_id' not in data:
            return jsonify({"success": False, "message": "buyer_id and product_id required"}), 400
        result = add_saved_product(int(data['buyer_id']), int(data['product_id']))
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/saved-products/<int:product_id>', methods=['DELETE'])
def remove_saved_product_route(product_id):
    try:
        data = request.get_json() or {}
        buyer_id = data.get('buyer_id') or request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = remove_saved_product(int(buyer_id), product_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buyer/profile', methods=['GET'])
def buyer_profile_route():
    try:
        buyer_id = request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = get_buyer_profile(buyer_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buyer/profile', methods=['PUT'])
def buyer_profile_update_route():
    try:
        data = request.get_json() or {}
        buyer_id = int(data.get("buyer_id") or 0)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = update_buyer_profile(
            buyer_id,
            data.get("name"),
            data.get("phone"),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buyer/orders', methods=['GET'])
def buyer_orders_route():
    try:
        buyer_id = request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = list_buyer_orders(
            buyer_id,
            request.args.get('status', default='').strip(),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buyer/payments', methods=['GET'])
def buyer_payments_route():
    try:
        buyer_id = request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = list_buyer_payments(
            buyer_id,
            request.args.get('payment_status', default='').strip(),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buyer/complaints', methods=['GET'])
def buyer_complaints_route():
    try:
        buyer_id = request.args.get('buyer_id', type=int)
        if not buyer_id:
            return jsonify({"success": False, "message": "buyer_id required"}), 400
        result = list_buyer_complaints(buyer_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/buyer/complaints', methods=['POST'])
def buyer_complaints_add_route():
    try:
        data = request.get_json() or {}
        buyer_id = int(data.get("buyer_id") or 0)
        order_id = int(data.get("order_id") or 0)
        subject = (data.get("subject") or "").strip()
        message = (data.get("message") or "").strip()
        if not buyer_id or not order_id or not subject or not message:
            return jsonify({"success": False, "message": "buyer_id, order_id, subject, message required"}), 400
        result = add_buyer_complaint(buyer_id, order_id, subject, message)
        if result.get("success"):
            return jsonify(result), 201
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/overview', methods=['GET'])
def farmer_overview_route():
    try:
        farmer_id = request.args.get('farmer_id', type=int)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = get_farmer_overview(farmer_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/profile', methods=['GET'])
def farmer_profile_get_route():
    try:
        farmer_id = request.args.get('farmer_id', type=int)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = get_farmer_profile(farmer_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/profile', methods=['PUT'])
def farmer_profile_update_route():
    try:
        data = request.get_json() or {}
        farmer_id = int(data.get("farmer_id") or 0)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = update_farmer_profile(
            farmer_id,
            data.get("name"),
            data.get("phone"),
            data.get("farm_location"),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/orders', methods=['GET'])
def farmer_orders_route():
    try:
        farmer_id = request.args.get('farmer_id', type=int)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = list_farmer_orders(
            farmer_id,
            request.args.get('status', default='').strip(),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/orders/<int:order_id>/status', methods=['PUT'])
def farmer_order_status_route(order_id):
    try:
        data = request.get_json() or {}
        farmer_id = int(data.get("farmer_id") or 0)
        status = (data.get("status") or "").strip()
        if not farmer_id or not status:
            return jsonify({"success": False, "message": "farmer_id and status required"}), 400
        result = update_farmer_order_status(farmer_id, order_id, status)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/reports', methods=['GET'])
def farmer_reports_route():
    try:
        farmer_id = request.args.get('farmer_id', type=int)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = get_farmer_reports(
            farmer_id,
            request.args.get('days', type=int) or 30,
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/complaints', methods=['GET'])
def farmer_complaints_route():
    try:
        farmer_id = request.args.get('farmer_id', type=int)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = list_farmer_complaints(
            farmer_id,
            request.args.get('status', default='').strip(),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/complaints/<int:complaint_id>/resolve', methods=['PUT'])
def farmer_complaint_resolve_route(complaint_id):
    try:
        data = request.get_json() or {}
        farmer_id = int(data.get("farmer_id") or 0)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = resolve_farmer_complaint(
            farmer_id,
            complaint_id,
            data.get("resolution_note") or "",
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/documents', methods=['GET'])
def farmer_documents_route():
    try:
        farmer_id = request.args.get('farmer_id', type=int)
        if not farmer_id:
            return jsonify({"success": False, "message": "farmer_id required"}), 400
        result = list_farmer_documents(farmer_id)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/farmer/documents', methods=['POST'])
def farmer_documents_add_route():
    try:
        data = request.get_json() or {}
        farmer_id = int(data.get("farmer_id") or 0)
        document_name = (data.get("document_name") or "").strip()
        document_url = (data.get("document_url") or "").strip()
        if not farmer_id or not document_name or not document_url:
            return jsonify({"success": False, "message": "farmer_id, document_name, document_url required"}), 400
        result = add_farmer_document(farmer_id, document_name, document_url)
        if result.get("success"):
            return jsonify(result), 201
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/overview', methods=['GET'])
def admin_overview_route():
    try:
        result = get_admin_overview()
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/users', methods=['GET'])
def admin_users_route():
    try:
        result = list_users(
            request.args.get('user_type', default='').strip(),
            request.args.get('account_status', default='').strip(),
            request.args.get('q', default='').strip(),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/users/<int:user_id>/status', methods=['PUT'])
def admin_user_status_route(user_id):
    try:
        data = request.get_json() or {}
        status = (data.get("status") or "").strip()
        if not status:
            return jsonify({"success": False, "message": "status required"}), 400
        result = set_user_status(user_id, status)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/farmers', methods=['GET'])
def admin_farmers_route():
    try:
        result = list_farmers(request.args.get('approval_status', default='').strip())
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/farmers/<int:user_id>/approval', methods=['PUT'])
def admin_farmer_approval_route(user_id):
    try:
        data = request.get_json() or {}
        approval_status = (data.get("approval_status") or "").strip()
        if not approval_status:
            return jsonify({"success": False, "message": "approval_status required"}), 400
        result = set_farmer_approval(user_id, approval_status)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/products', methods=['GET'])
def admin_products_route():
    try:
        result = list_products(
            request.args.get('approval_status', default='').strip(),
            request.args.get('status', default='').strip(),
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/products/<int:product_id>/approval', methods=['PUT'])
def admin_product_approval_route(product_id):
    try:
        data = request.get_json() or {}
        approval_status = (data.get("approval_status") or "").strip()
        if not approval_status:
            return jsonify({"success": False, "message": "approval_status required"}), 400
        result = set_product_approval(product_id, approval_status)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/orders', methods=['GET'])
def admin_orders_route():
    try:
        result = list_orders(
            request.args.get('status', default='').strip(),
            request.args.get('limit', type=int) or 50,
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/payments', methods=['GET'])
def admin_payments_route():
    try:
        result = list_payments(
            request.args.get('payment_status', default='').strip(),
            request.args.get('method', default='').strip(),
            request.args.get('limit', type=int) or 50,
        )
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/admin/reports', methods=['GET'])
def admin_reports_route():
    try:
        result = get_reports_summary()
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == '__main__':
    print("Starting Fresh AI Trade API server...")
    print("API endpoints:")
    print("  POST /api/register - Register a new user")
    print("  POST /api/login - Login a user")
    print("  POST /api/auth/send-otp - Send OTP for email/phone verification")
    print("  POST /api/auth/verify-otp - Verify OTP and issue verification token")
    print("  GET  /api/health - Health check")
    print("  GET  /api/prediction/options - Get model options")
    print("  GET  /api/weather/forecast?region=<district>&date=YYYY-MM-DD - Fetch district weather")
    print("  POST /api/predict-price - Predict price in LKR")
    print("  GET  /api/products?farmer_id=<id> - Get farmer's products")
    print("  GET  /api/products/<id> - Get product by ID")
    print("  POST /api/products - Create new product")
    print("  PUT  /api/products/<id> - Update product")
    print("  DELETE /api/products/<id> - Delete product")
    print("  GET  /api/farmer/overview - Farmer dashboard stats")
    print("  GET  /api/farmer/profile - Farmer profile")
    print("  GET  /api/farmer/orders - Farmer order management")
    print("  GET  /api/farmer/reports - Farmer reports")
    print("  GET  /api/farmer/complaints - Farmer complaints")
    print("  GET  /api/farmer/documents - Farmer documents")
    print("  GET  /api/buyer/profile - Buyer profile")
    print("  GET  /api/buyer/orders - Buyer orders")
    print("  GET  /api/buyer/payments - Buyer payments")
    print("  GET  /api/buyer/complaints - Buyer complaints")
    print("  GET  /api/admin/overview - Admin dashboard stats")
    print("  GET  /api/admin/users - Admin user management")
    print("  GET  /api/admin/farmers - Admin farmer approvals")
    print("  GET  /api/admin/products - Admin product approvals")
    print("  GET  /api/admin/orders - Admin order monitoring")
    print("  GET  /api/admin/payments - Admin payment monitoring")
    print("  GET  /api/admin/reports - Admin reports summary")
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug_mode, host='0.0.0.0', port=5000, use_reloader=False)
