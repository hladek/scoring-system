from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from database import get_db
from models.results import Result
from models.matches import Match
from blueprints.auth import require_admin
import uuid

results_bp = Blueprint('results', __name__)

socketio = None

def set_socketio(sio):
    # set the socketio instance
    global socketio
    socketio = sio

@results_bp.route('', methods=['GET'])
def get_results():
    # get all results, optionally filtered by match
    match_id = request.args.get('match_id')
    
    db = next(get_db())
    try:
        query = db.query(Result)
        if match_id:
            try:
                match_uuid = uuid.UUID(match_id)
                query = query.filter(Result.match_id == match_uuid)
            except ValueError:
                return jsonify({"detail": "Invalid match ID format"}), 400
        
        results = query.all()
        return jsonify([
            {
                'id': str(r.id),
                'match_id': str(r.match_id),
                'team_id': str(r.team_id),
                'score': int(r.score) if r.score is not None else 0,
                'fouls': int(r.fouls) if r.fouls is not None else 0,  # Kept for backward compatibility
                'tasks_completed': int(r.tasks_completed) if r.tasks_completed is not None else 0,
                'precision_points': int(r.precision_points) if r.precision_points is not None else 0,
                'completion_time_milliseconds': getattr(r, 'completion_time_milliseconds', None),
                'notes': r.notes,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'updated_at': r.updated_at.isoformat() if r.updated_at else None
            }
            for r in results
        ])
    finally:
        db.close()

@results_bp.route('/<result_id>', methods=['GET'])
def get_result(result_id):
    # get a specific result by ID
    try:
        result_uuid = uuid.UUID(result_id)
    except ValueError:
        return jsonify({"detail": "Invalid result ID format"}), 400
    
    db = next(get_db())
    try:
        result = db.query(Result).filter(Result.id == result_uuid).first()
        if not result:
            return jsonify({"detail": "Result not found"}), 404
        
        return jsonify({
            'id': str(result.id),
            'match_id': str(result.match_id),
            'team_id': str(result.team_id),
            'score': int(result.score) if result.score is not None else 0,
            'fouls': int(result.fouls) if result.fouls is not None else 0,
            'tasks_completed': int(result.tasks_completed) if result.tasks_completed is not None else 0,
            'precision_points': int(result.precision_points) if result.precision_points is not None else 0,
            'completion_time_milliseconds': getattr(result, 'completion_time_milliseconds', None),
            'notes': result.notes,
            'created_at': result.created_at.isoformat() if result.created_at else None,
            'updated_at': result.updated_at.isoformat() if result.updated_at else None
        })
    finally:
        db.close()

@results_bp.route('', methods=['POST'])
@require_admin
def create_result(user):
    # create a result (admin only)
    data = request.get_json()
    db = next(get_db())
    try:
        data["match_id"] = uuid.UUID(data["match_id"])
        data["team_id"] = uuid.UUID(data["team_id"])
        
        existing = db.query(Result).filter(
            Result.match_id == data["match_id"],
            Result.team_id == data["team_id"]
        ).first()
        
        if existing:
            for field, value in data.items():
                if field not in ["match_id", "team_id"] and hasattr(existing, field):
                    setattr(existing, field, value)
            db.commit()
            db.refresh(existing)
            result = existing
        else:
            db_result = Result(**data)
            db.add(db_result)
            db.commit()
            db.refresh(db_result)
            result = db_result
        
        # Emit WebSocket event for match update
        if socketio:
            match = db.query(Match).filter(Match.id == result.match_id).first()
            if match:
                socketio.emit('match_updated', {'match_id': str(result.match_id)})
                socketio.emit('competition_updated', {'competition_id': str(match.competition_id)})
        
        return jsonify({
            'id': str(result.id),
            'match_id': str(result.match_id),
            'team_id': str(result.team_id),
            'score': int(result.score) if result.score is not None else 0,
            'fouls': int(result.fouls) if result.fouls is not None else 0,  # Kept for backward compatibility
            'tasks_completed': int(result.tasks_completed) if result.tasks_completed is not None else 0,
            'precision_points': int(result.precision_points) if result.precision_points is not None else 0,
            'completion_time_milliseconds': getattr(result, 'completion_time_milliseconds', None),
            'notes': result.notes,
            'created_at': result.created_at.isoformat() if result.created_at else None,
            'updated_at': result.updated_at.isoformat() if result.updated_at else None
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@results_bp.route('/<result_id>', methods=['PUT'])
@require_admin
def update_result(user, result_id):
    # update a result (admin only). emits websocket events for real-time updates
    try:
        result_uuid = uuid.UUID(result_id)
    except ValueError:
        return jsonify({"detail": "Invalid result ID format"}), 400
    
    data = request.get_json()
    db = next(get_db())
    try:
        db_result = db.query(Result).filter(Result.id == result_uuid).first()
        if not db_result:
            return jsonify({"detail": "Result not found"}), 404
        
        # Update fields
        if 'score' in data:
            db_result.score = int(data['score']) if data['score'] is not None else 0
        if 'fouls' in data:
            db_result.fouls = int(data['fouls']) if data['fouls'] is not None else 0
        if 'tasks_completed' in data:
            db_result.tasks_completed = int(data['tasks_completed']) if data['tasks_completed'] is not None else 0
        if 'precision_points' in data:
            db_result.precision_points = int(data['precision_points']) if data['precision_points'] is not None else 0
        if 'completion_time_milliseconds' in data:
            db_result.completion_time_milliseconds = int(data['completion_time_milliseconds']) if data['completion_time_milliseconds'] is not None else None
        if 'notes' in data:
            db_result.notes = data['notes']
        
        db.commit()
        db.refresh(db_result)
        
        # Broadcast to all connected clients
        if socketio:
            match = db.query(Match).filter(Match.id == db_result.match_id).first()
            if match:
                socketio.emit('match_updated', {'match_id': str(db_result.match_id)})
                socketio.emit('competition_updated', {'competition_id': str(match.competition_id)})
                print(f"[WEBSOCKET] Emitted match_updated and competition_updated for match {db_result.match_id}")
        
        return jsonify({
            'id': str(db_result.id),
            'match_id': str(db_result.match_id),
            'team_id': str(db_result.team_id),
            'score': int(db_result.score) if db_result.score is not None else 0,
            'fouls': int(db_result.fouls) if db_result.fouls is not None else 0,  # Kept for backward compatibility
            'tasks_completed': int(db_result.tasks_completed) if db_result.tasks_completed is not None else 0,
            'precision_points': int(db_result.precision_points) if db_result.precision_points is not None else 0,
            'completion_time_milliseconds': getattr(db_result, 'completion_time_milliseconds', None),
            'notes': db_result.notes,
            'created_at': db_result.created_at.isoformat() if db_result.created_at else None,
            'updated_at': db_result.updated_at.isoformat() if db_result.updated_at else None
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

