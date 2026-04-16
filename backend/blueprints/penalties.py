from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from database import get_db
from models.penalties import Penalty
from models.matches import Match
from models.teams import Team
from blueprints.auth import require_admin
import uuid

penalties_bp = Blueprint('penalties', __name__)

socketio = None

def set_socketio(sio):
    # set the socketio instance
    global socketio
    socketio = sio

@penalties_bp.route('', methods=['GET'])
def get_penalties():
    # get all penalties, optionally filtered by match or team
    match_id = request.args.get('match_id')
    team_id = request.args.get('team_id')
    
    db = next(get_db())
    try:
        query = db.query(Penalty)
        if match_id:
            try:
                match_uuid = uuid.UUID(match_id)
                query = query.filter(Penalty.match_id == match_uuid)
            except ValueError:
                return jsonify({"detail": "Invalid match ID format"}), 400
        if team_id:
            try:
                team_uuid = uuid.UUID(team_id)
                query = query.filter(Penalty.team_id == team_uuid)
            except ValueError:
                return jsonify({"detail": "Invalid team ID format"}), 400
        
        penalties = query.all()
        result = []
        for p in penalties:
            team_name = db.query(Team.name).filter(Team.id == p.team_id).scalar() if p.team_id else None
            result.append({
                'id': str(p.id),
                'match_id': str(p.match_id),
                'team_id': str(p.team_id) if p.team_id else None,
                'team_name': team_name,
                'penalty_type': p.penalty_type,
                'points': p.points,
                'description': p.description,
                'time_occurred': p.time_occurred,
                'issued_by': p.issued_by,
                'created_at': p.created_at.isoformat() if p.created_at else None
            })
        return jsonify(result)
    finally:
        db.close()

@penalties_bp.route('/<penalty_id>', methods=['GET'])
def get_penalty(penalty_id):
    # get a specific penalty by ID
    try:
        penalty_uuid = uuid.UUID(penalty_id)
    except ValueError:
        return jsonify({"detail": "Invalid penalty ID format"}), 400
    
    db = next(get_db())
    try:
        penalty = db.query(Penalty).filter(Penalty.id == penalty_uuid).first()
        if not penalty:
            return jsonify({"detail": "Penalty not found"}), 404
        
        team_name = db.query(Team.name).filter(Team.id == penalty.team_id).scalar() if penalty.team_id else None
        return jsonify({
            'id': str(penalty.id),
            'match_id': str(penalty.match_id),
            'team_id': str(penalty.team_id) if penalty.team_id else None,
            'team_name': team_name,
            'penalty_type': penalty.penalty_type,
            'points': penalty.points,
            'description': penalty.description,
            'time_occurred': penalty.time_occurred,
            'issued_by': penalty.issued_by,
            'created_at': penalty.created_at.isoformat() if penalty.created_at else None
        })
    finally:
        db.close()

@penalties_bp.route('', methods=['POST'])
@require_admin
def create_penalty(user):
    # create a new penalty (admin only)
    data = request.get_json()
    db = next(get_db())
    try:
        penalty_data = {k: v for k, v in data.items()}
        penalty_data["match_id"] = uuid.UUID(penalty_data["match_id"])
        if penalty_data.get("team_id"):
            penalty_data["team_id"] = uuid.UUID(penalty_data["team_id"])
        else:
            penalty_data["team_id"] = None
        
        db_penalty = Penalty(**penalty_data)
        db.add(db_penalty)
        db.commit()
        db.refresh(db_penalty)
        
        # Emit WebSocket event
        if socketio:
            match = db.query(Match).filter(Match.id == db_penalty.match_id).first()
            if match:
                socketio.emit('match_updated', {'match_id': str(db_penalty.match_id)})
                socketio.emit('competition_updated', {'competition_id': str(match.competition_id)})
        
        team_name = db.query(Team.name).filter(Team.id == db_penalty.team_id).scalar() if db_penalty.team_id else None
        return jsonify({
            'id': str(db_penalty.id),
            'match_id': str(db_penalty.match_id),
            'team_id': str(db_penalty.team_id) if db_penalty.team_id else None,
            'team_name': team_name,
            'penalty_type': db_penalty.penalty_type,
            'points': db_penalty.points,
            'description': db_penalty.description,
            'time_occurred': db_penalty.time_occurred,
            'issued_by': db_penalty.issued_by,
            'created_at': db_penalty.created_at.isoformat() if db_penalty.created_at else None
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@penalties_bp.route('/<penalty_id>', methods=['PUT'])
@require_admin
def update_penalty(user, penalty_id):
    # update a penalty (admin only)
    try:
        penalty_uuid = uuid.UUID(penalty_id)
    except ValueError:
        return jsonify({"detail": "Invalid penalty ID format"}), 400
    
    data = request.get_json()
    db = next(get_db())
    try:
        db_penalty = db.query(Penalty).filter(Penalty.id == penalty_uuid).first()
        if not db_penalty:
            return jsonify({"detail": "Penalty not found"}), 404
        
        for field, value in data.items():
            if hasattr(db_penalty, field):
                setattr(db_penalty, field, value)
        
        db.commit()
        db.refresh(db_penalty)
        
        # Emit WebSocket event
        if socketio:
            match = db.query(Match).filter(Match.id == db_penalty.match_id).first()
            if match:
                socketio.emit('match_updated', {'match_id': str(db_penalty.match_id)})
                socketio.emit('competition_updated', {'competition_id': str(match.competition_id)})
        
        team_name = db.query(Team.name).filter(Team.id == db_penalty.team_id).scalar() if db_penalty.team_id else None
        return jsonify({
            'id': str(db_penalty.id),
            'match_id': str(db_penalty.match_id),
            'team_id': str(db_penalty.team_id) if db_penalty.team_id else None,
            'team_name': team_name,
            'penalty_type': db_penalty.penalty_type,
            'points': db_penalty.points,
            'description': db_penalty.description,
            'time_occurred': db_penalty.time_occurred,
            'issued_by': db_penalty.issued_by,
            'created_at': db_penalty.created_at.isoformat() if db_penalty.created_at else None
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@penalties_bp.route('/<penalty_id>', methods=['DELETE'])
@require_admin
def delete_penalty(user, penalty_id):
    # delete a penalty (admin only)
    try:
        penalty_uuid = uuid.UUID(penalty_id)
    except ValueError:
        return jsonify({"detail": "Invalid penalty ID format"}), 400
    
    db = next(get_db())
    try:
        db_penalty = db.query(Penalty).filter(Penalty.id == penalty_uuid).first()
        if not db_penalty:
            return jsonify({"detail": "Penalty not found"}), 404
        
        match_id = str(db_penalty.match_id)
        competition_id = None
        match = db.query(Match).filter(Match.id == db_penalty.match_id).first()
        if match:
            competition_id = str(match.competition_id)
        
        db.delete(db_penalty)
        db.commit()
        
        # Emit WebSocket event
        if socketio:
            socketio.emit('match_updated', {'match_id': match_id})
            if competition_id:
                socketio.emit('competition_updated', {'competition_id': competition_id})
        
        return '', 204
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

