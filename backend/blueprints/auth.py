from flask import Blueprint, request, jsonify
from functools import wraps
from sqlalchemy.orm import Session
from database import get_db
from models.users import User
from schemas.users import UserResponse
from auth.password_handler import verify_password
from auth.jwt_handler import create_access_token, verify_token
from datetime import timedelta

auth_bp = Blueprint('auth', __name__)

def get_current_user():
    """Extract and validate JWT token from Authorization header"""
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
        except:
            pass
    
    if not token:
        return None
    
    try:
        payload = verify_token(token)
        username = payload.get("sub")
        if username is None:
            return None
        
        db = next(get_db())
        user = db.query(User).filter(User.username == username).first()
        db.close()
        return user
    except:
        return None

def require_auth(f):
    """Decorator: require valid authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"detail": "Not authenticated"}), 401
        return f(user, *args, **kwargs)
    return decorated_function

def require_admin(f):
    """Decorator: require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"detail": "Not authenticated"}), 401
        if user.role != "admin":
            return jsonify({"detail": "Not enough permissions"}), 403
        return f(user, *args, **kwargs)
    return decorated_function

def require_admin_or_judge(f):
    """Decorator: require admin or judge role (for match control)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"detail": "Not authenticated"}), 401
        if user.role not in ("admin", "judge"):
            return jsonify({"detail": "Not enough permissions"}), 403
        return f(user, *args, **kwargs)
    return decorated_function

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
    
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"detail": "Username and password required"}), 400
    
    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == username).first()
        
        if not user or not verify_password(password, user.password_hash):
            return jsonify({"detail": "Incorrect username or password"}), 401

        if user.role != "admin":
            return jsonify({"detail": "Access denied. Only admins can log in."}), 403

        access_token_expires = timedelta(hours=24)
        access_token = create_access_token(
            data={"sub": user.username, "role": user.role},
            expires_delta=access_token_expires
        )
        
        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
        })
    finally:
        db.close()

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user_info(user):
    return jsonify({
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None
    })

