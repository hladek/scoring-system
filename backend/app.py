from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from database import engine, Base, get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
import os

# Import models to register with SQLAlchemy
from models import users, teams, competitions as comp_models, matches as match_models, results as result_models, penalties as penalty_models, timer, split_times as split_times_model

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# CORS configuration for dev and Docker environments
CORS(app, 
     resources={
         r"/api/*": {
             "origins": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost", "http://127.0.0.1"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires", "X-Requested-With"],
             "expose_headers": ["*"],
             "supports_credentials": True
         },
         r"/socket.io/*": {
             "origins": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost", "http://127.0.0.1"]
         },
         r"/health": {
             "origins": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost", "http://127.0.0.1"],
             "methods": ["GET", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires"]
         }
     },
     supports_credentials=True
)

@app.after_request
def after_request(response):
    """Add CORS headers dynamically based on origin"""
    origin = request.headers.get('Origin')
    allowed_origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost", "http://127.0.0.1"]
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Cache-Control, Pragma, Expires, X-Requested-With'
        response.headers['Access-Control-Expose-Headers'] = '*'
    
    return response

socketio = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost", "http://127.0.0.1"],
    async_mode='threading',
    logger=True,
    engineio_logger=True
)

Base.metadata.create_all(bind=engine)
from blueprints.auth import auth_bp
from blueprints.admin import admin_bp
from blueprints.competitions import competitions_bp, set_socketio as set_competitions_socketio
from blueprints.matches import matches_bp, set_socketio as set_matches_socketio
from blueprints.results import results_bp, set_socketio as set_results_socketio
from blueprints.penalties import penalties_bp, set_socketio as set_penalties_socketio
from blueprints.teams import teams_bp
from blueprints.user_teams import user_teams_bp
from blueprints.split_times import split_times_bp, set_socketio as set_split_times_socketio

set_competitions_socketio(socketio)
set_matches_socketio(socketio)
set_results_socketio(socketio)
set_penalties_socketio(socketio)
set_split_times_socketio(socketio)
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(competitions_bp, url_prefix='/api/competitions')
app.register_blueprint(matches_bp, url_prefix='/api/matches')
app.register_blueprint(results_bp, url_prefix='/api/results')
app.register_blueprint(penalties_bp, url_prefix='/api/penalties')
app.register_blueprint(teams_bp, url_prefix='/api/teams')
app.register_blueprint(user_teams_bp, url_prefix='/api/user-teams')
app.register_blueprint(split_times_bp, url_prefix='/api/splits')

# WebSocket event handlers for real-time communication
@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('connected', {'message': 'Connected to RoboComp server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

@socketio.on('subscribe_competition')
def handle_subscribe_competition(data):
    """Client subscribes to specific competition updates"""
    competition_id = data.get('competition_id')
    if competition_id:
        print(f'Client {request.sid} subscribed to competition {competition_id}')
        emit('subscribed', {'competition_id': competition_id, 'status': 'subscribed'})

@socketio.on('subscribe_match')
def handle_subscribe_match(data):
    """Client subscribes to specific match updates"""
    match_id = data.get('match_id')
    if match_id:
        print(f'Client {request.sid} subscribed to match {match_id}')
        emit('subscribed', {'match_id': match_id, 'status': 'subscribed'})

# Broadcast helpers - called from blueprints when data changes
def emit_competition_update(competition_id):
    socketio.emit('competition_updated', {'competition_id': competition_id})

def emit_match_update(match_id):
    socketio.emit('match_updated', {'match_id': match_id})

def emit_result_update(match_id):
    socketio.emit('match_updated', {'match_id': match_id})

def emit_penalty_update(match_id):
    socketio.emit('match_updated', {'match_id': match_id})
@app.route('/')
def index():
    return {"message": "RoboComp API is running"}

@app.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Database connection health check"""
    if request.method == 'OPTIONS':
        return '', 200
    
    db = next(get_db())
    try:
        db.execute(text("SELECT 1"))
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "unhealthy", "database": "disconnected", "error": str(e)})
    finally:
        db.close()

if __name__ == '__main__':
    # Development server - use gunicorn for production
    socketio.run(app, host='0.0.0.0', port=8000, debug=True, allow_unsafe_werkzeug=True)

