from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from database import get_db
from models.competitions import Competition
from models.matches import Match
from models.results import Result
from models.penalties import Penalty
from models.teams import Team
from schemas.competitions import CompetitionCreate, CompetitionUpdate
from blueprints.auth import require_admin
import uuid

competitions_bp = Blueprint('competitions', __name__)

# import socketio from app (will be set later)
socketio = None

def set_socketio(sio):
    # set the socketio instance
    global socketio
    socketio = sio

@competitions_bp.route('', methods=['GET'])
def get_competitions():
    # get all competitions (public endpoint)
    skip = request.args.get('skip', 0, type=int)
    limit = request.args.get('limit', 100, type=int)
    
    db = next(get_db())
    try:
        competitions = db.query(Competition).order_by(Competition.created_at.desc()).offset(skip).limit(limit).all()
        result = []
        for c in competitions:
            result.append({
                'id': str(c.id),
                'name': c.name,
                'description': c.description,
                'location': c.location,
                'start_date': c.start_date.isoformat() if c.start_date else None,
                'end_date': c.end_date.isoformat() if c.end_date else None,
                'status': c.status,
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'updated_at': c.updated_at.isoformat() if c.updated_at else None
            })
        return jsonify(result)
    finally:
        db.close()

@competitions_bp.route('/<competition_id>', methods=['GET'])
def get_competition(competition_id):
    # get a specific competition by ID with matches (public endpoint)
    try:
        competition_uuid = uuid.UUID(competition_id)
    except ValueError:
        return jsonify({"detail": "Invalid competition ID format"}), 400
    
    db = next(get_db())
    try:
        competition = db.query(Competition).filter(Competition.id == competition_uuid).first()
        if not competition:
            return jsonify({"detail": "Competition not found"}), 404
        
        matches = db.query(Match).filter(Match.competition_id == competition_uuid).order_by(Match.match_date.desc()).all()
        matches_data = []
        for match in matches:
            results = db.query(Result).filter(Result.match_id == match.id).order_by(Result.team_id).all()
            
            results_sorted = []
            if match.team1_id:
                team1_result = next((r for r in results if str(r.team_id) == str(match.team1_id)), None)
                if team1_result:
                    results_sorted.append(team1_result)
            if match.team2_id:
                team2_result = next((r for r in results if str(r.team_id) == str(match.team2_id)), None)
                if team2_result:
                    results_sorted.append(team2_result)
            
            if len(results_sorted) < len(results):
                results_sorted = results
            
            results_data = [
                {
                    'id': str(r.id),
                    'team_id': str(r.team_id),
                    'score': int(r.score) if r.score is not None else 0,
                    'fouls': int(r.fouls) if r.fouls is not None else 0,  # Kept for backward compatibility
                    'tasks_completed': int(r.tasks_completed) if r.tasks_completed is not None else 0,
                    'precision_points': int(r.precision_points) if r.precision_points is not None else 0,
                    'completion_time_milliseconds': getattr(r, 'completion_time_milliseconds', None),
                    'notes': r.notes
                }
                for r in results_sorted
            ]
            
            penalties = db.query(Penalty).filter(Penalty.match_id == match.id).all()
            penalties_data = []
            for p in penalties:
                team_name = db.query(Team.name).filter(Team.id == p.team_id).scalar() if p.team_id else None
                penalties_data.append({
                    'id': str(p.id),
                    'team_id': str(p.team_id) if p.team_id else None,
                    'team_name': team_name,
                    'penalty_type': p.penalty_type,
                    'points': p.points,
                    'description': p.description,
                    'time_occurred': p.time_occurred,
                    'issued_by': p.issued_by
                })
            
            team1_name = db.query(Team.name).filter(Team.id == match.team1_id).scalar() if match.team1_id else None
            team2_name = db.query(Team.name).filter(Team.id == match.team2_id).scalar() if match.team2_id else None
            
            matches_data.append({
                'id': str(match.id),
                'team1_id': str(match.team1_id) if match.team1_id else None,
                'team2_id': str(match.team2_id) if match.team2_id else None,
                'team1_name': team1_name,
                'team2_name': team2_name,
                'match_name': match.match_name,
                'match_date': match.match_date.isoformat() if match.match_date else None,
                'duration_minutes': match.duration_minutes,
                'current_time': match.current_time,
                'status': match.status,
                'stage': match.stage,
                'round_number': match.round_number,
                'completion_time_milliseconds': getattr(match, 'completion_time_milliseconds', None),
                'results': results_data,
                'penalties': penalties_data,
                'penalties_count': len(penalties_data)
            })
        
        competition_dict = {
            'id': str(competition.id),
            'name': competition.name,
            'description': competition.description,
            'location': competition.location,
            'start_date': competition.start_date.isoformat() if competition.start_date else None,
            'end_date': competition.end_date.isoformat() if competition.end_date else None,
            'status': competition.status,
            'created_at': competition.created_at.isoformat() if competition.created_at else None,
            'updated_at': competition.updated_at.isoformat() if competition.updated_at else None,
            'matches': matches_data
        }
        
        return jsonify(competition_dict)
    finally:
        db.close()

@competitions_bp.route('', methods=['POST'])
@require_admin
def create_competition(user):
    # create a new competition (admin only)
    data = request.get_json()
    db = next(get_db())
    try:
        db_competition = Competition(**data)
        db.add(db_competition)
        db.commit()
        db.refresh(db_competition)
        
        # Emit WebSocket event
        if socketio:
            socketio.emit('competition_created', {'competition_id': str(db_competition.id)})
        
        return jsonify({
            'id': str(db_competition.id),
            'name': db_competition.name,
            'description': db_competition.description,
            'location': db_competition.location,
            'start_date': db_competition.start_date.isoformat() if db_competition.start_date else None,
            'end_date': db_competition.end_date.isoformat() if db_competition.end_date else None,
            'status': db_competition.status,
            'created_at': db_competition.created_at.isoformat() if db_competition.created_at else None,
            'updated_at': db_competition.updated_at.isoformat() if db_competition.updated_at else None
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@competitions_bp.route('/<competition_id>', methods=['PUT'])
@require_admin
def update_competition(user, competition_id):
    # update a competition (admin only)
    try:
        competition_uuid = uuid.UUID(competition_id)
    except ValueError:
        return jsonify({"detail": "Invalid competition ID format"}), 400
    
    data = request.get_json()
    db = next(get_db())
    try:
        db_competition = db.query(Competition).filter(Competition.id == competition_uuid).first()
        if not db_competition:
            return jsonify({"detail": "Competition not found"}), 404
        
        for field, value in data.items():
            if hasattr(db_competition, field):
                setattr(db_competition, field, value)
        
        db.commit()
        db.refresh(db_competition)
        
        # Emit WebSocket event
        if socketio:
            socketio.emit('competition_updated', {'competition_id': competition_id})
        
        return jsonify({
            'id': str(db_competition.id),
            'name': db_competition.name,
            'description': db_competition.description,
            'location': db_competition.location,
            'start_date': db_competition.start_date.isoformat() if db_competition.start_date else None,
            'end_date': db_competition.end_date.isoformat() if db_competition.end_date else None,
            'status': db_competition.status,
            'created_at': db_competition.created_at.isoformat() if db_competition.created_at else None,
            'updated_at': db_competition.updated_at.isoformat() if db_competition.updated_at else None
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@competitions_bp.route('/<competition_id>', methods=['DELETE'])
@require_admin
def delete_competition(user, competition_id):
    # delete a competition (admin only)
    try:
        competition_uuid = uuid.UUID(competition_id)
    except ValueError:
        return jsonify({"detail": "Invalid competition ID format"}), 400
    
    db = next(get_db())
    try:
        db_competition = db.query(Competition).filter(Competition.id == competition_uuid).first()
        if not db_competition:
            return jsonify({"detail": "Competition not found"}), 404
        
        db.delete(db_competition)
        db.commit()
        
        # Emit WebSocket event
        if socketio:
            socketio.emit('competition_deleted', {'competition_id': competition_id})
        
        return '', 204
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

