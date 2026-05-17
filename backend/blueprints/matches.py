from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from database import get_db
from models.matches import Match
from models.teams import Team
from models.results import Result
from blueprints.auth import require_admin, require_admin_or_judge
import uuid

matches_bp = Blueprint('matches', __name__)

socketio = None

def set_socketio(sio):
    # set the socketio instance
    global socketio
    socketio = sio

@matches_bp.route('', methods=['GET'])
def get_matches():
    # get all matches, optionally filtered by competition
    competition_id = request.args.get('competition_id')
    skip = request.args.get('skip', 0, type=int)
    limit = request.args.get('limit', 100, type=int)
    
    db = next(get_db())
    try:
        query = db.query(Match)
        if competition_id:
            query = query.filter(Match.competition_id == uuid.UUID(competition_id))
        
        matches = query.offset(skip).limit(limit).all()
        result = []
        for m in matches:
            team1_name = db.query(Team.name).filter(Team.id == m.team1_id).scalar() if m.team1_id else None
            team2_name = db.query(Team.name).filter(Team.id == m.team2_id).scalar() if m.team2_id else None
            result.append({
                'id': str(m.id),
                'competition_id': str(m.competition_id),
                'team1_id': str(m.team1_id) if m.team1_id else None,
                'team2_id': str(m.team2_id) if m.team2_id else None,
                'team1_name': team1_name,
                'team2_name': team2_name,
                'match_name': m.match_name,
                'match_date': m.match_date.isoformat() if m.match_date else None,
                'duration_minutes': m.duration_minutes,
                'current_time': m.current_time,
                'round_number': m.round_number,
                'stage': m.stage,
                'status': m.status,
                'completion_time_milliseconds': getattr(m, 'completion_time_milliseconds', None),
                'created_at': m.created_at.isoformat() if m.created_at else None,
                'updated_at': m.updated_at.isoformat() if m.updated_at else None
            })
        return jsonify(result)
    finally:
        db.close()

@matches_bp.route('/<match_id>', methods=['GET'])
def get_match(match_id):
    # get a specific match by ID
    try:
        match_uuid = uuid.UUID(match_id)
    except ValueError:
        return jsonify({"detail": "Invalid match ID format"}), 400
    
    db = next(get_db())
    try:
        match = db.query(Match).filter(Match.id == match_uuid).first()
        if not match:
            return jsonify({"detail": "Match not found"}), 404
        
        team1_name = db.query(Team.name).filter(Team.id == match.team1_id).scalar() if match.team1_id else None
        team2_name = db.query(Team.name).filter(Team.id == match.team2_id).scalar() if match.team2_id else None
        
        # debug logging
        print(f"[GET_MATCH] Match ID: {match.id}")
        print(f"[GET_MATCH] Team1 ID: {match.team1_id}, Team1 Name: {team1_name}")
        print(f"[GET_MATCH] Team2 ID: {match.team2_id}, Team2 Name: {team2_name}")
        
        return jsonify({
            'id': str(match.id),
            'competition_id': str(match.competition_id),
            'team1_id': str(match.team1_id) if match.team1_id else None,
            'team2_id': str(match.team2_id) if match.team2_id else None,
            'team1_name': team1_name,
            'team2_name': team2_name,
            'match_name': match.match_name,
            'match_date': match.match_date.isoformat() if match.match_date else None,
            'duration_minutes': match.duration_minutes,
            'current_time': match.current_time,
            'round_number': match.round_number,
            'stage': match.stage,
            'status': match.status,
            'completion_time_milliseconds': getattr(match, 'completion_time_milliseconds', None),
            'created_at': match.created_at.isoformat() if match.created_at else None,
            'updated_at': match.updated_at.isoformat() if match.updated_at else None
        })
    finally:
        db.close()

@matches_bp.route('', methods=['POST'])
@require_admin
def create_match(user):
    # create a new match (admin only)
    data = request.get_json()
    db = next(get_db())
    try:
        match_data = {k: v for k, v in data.items() if k not in ['team1_name', 'team2_name']}
        
        if data.get('team1_name') and not data.get('team1_id'):
            team1 = Team(name=data['team1_name'])
            db.add(team1)
            db.flush()
            match_data['team1_id'] = team1.id
        
        if data.get('team2_name') and not data.get('team2_id'):
            team2 = Team(name=data['team2_name'])
            db.add(team2)
            db.flush()
            match_data['team2_id'] = team2.id
        
        if 'competition_id' in match_data and match_data['competition_id']:
            # Convert to string first if it's already a UUID, then to UUID
            comp_id = match_data['competition_id']
            if isinstance(comp_id, uuid.UUID):
                match_data['competition_id'] = comp_id
            else:
                match_data['competition_id'] = uuid.UUID(str(comp_id))
        if 'team1_id' in match_data and match_data['team1_id']:
            team1_id = match_data['team1_id']
            if isinstance(team1_id, uuid.UUID):
                match_data['team1_id'] = team1_id
            else:
                match_data['team1_id'] = uuid.UUID(str(team1_id))
        if 'team2_id' in match_data and match_data['team2_id']:
            team2_id = match_data['team2_id']
            if isinstance(team2_id, uuid.UUID):
                match_data['team2_id'] = team2_id
            else:
                match_data['team2_id'] = uuid.UUID(str(team2_id))
        else:
            match_data['team2_id'] = None  # solo run
        
        db_match = Match(**match_data)
        db.add(db_match)
        db.flush()
        
        # Initialize result records with zero scores
        if db_match.team1_id:
            result1 = Result(match_id=db_match.id, team_id=db_match.team1_id, score=0, fouls=0, tasks_completed=0, precision_points=0)
            db.add(result1)
        if db_match.team2_id:
            result2 = Result(match_id=db_match.id, team_id=db_match.team2_id, score=0, fouls=0, tasks_completed=0, precision_points=0)
            db.add(result2)
        
        db.commit()
        db.refresh(db_match)
        
        # Emit WebSocket event
        if socketio:
            socketio.emit('match_created', {'match_id': str(db_match.id)})
            socketio.emit('competition_updated', {'competition_id': str(db_match.competition_id)})
        
        return jsonify({
            'id': str(db_match.id),
            'competition_id': str(db_match.competition_id),
            'team1_id': str(db_match.team1_id) if db_match.team1_id else None,
            'team2_id': str(db_match.team2_id) if db_match.team2_id else None,
            'match_name': db_match.match_name,
            'match_date': db_match.match_date.isoformat() if db_match.match_date else None,
            'duration_minutes': db_match.duration_minutes,
            'current_time': db_match.current_time,
            'round_number': db_match.round_number,
            'stage': db_match.stage,
            'status': db_match.status,
            'completion_time_milliseconds': getattr(db_match, 'completion_time_milliseconds', None),
            'created_at': db_match.created_at.isoformat() if db_match.created_at else None,
            'updated_at': db_match.updated_at.isoformat() if db_match.updated_at else None
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@matches_bp.route('/<match_id>/start', methods=['POST'])
@require_admin_or_judge
def start_match(user, match_id):
    # start a match - sets status to live and initializes timer
    print(f"start_match called with match_id: {match_id}, type: {type(match_id)}")
    
    try:
        match_uuid = uuid.UUID(match_id)
        print(f"Valid UUID: {match_uuid}")
    except ValueError as e:
        print(f"Invalid UUID format: {e}")
        return jsonify({"detail": f"Invalid match ID format: {str(e)}"}), 400
    
    db = next(get_db())
    try:
        match = db.query(Match).filter(Match.id == match_uuid).first()
        if not match:
            print(f"Match not found with ID: {match_uuid}")
            return jsonify({"detail": f"Match not found with ID: {match_id}"}), 404
        
        print(f"Match found: {match.id}, status: {match.status}, current_time: {match.current_time}")
        
        if match.status == 'scheduled':
            match.status = 'live'
            match.current_time = 0
            print(f"Starting scheduled match from 0")
        elif match.status == 'paused':
            match.status = 'live'
            print(f"Resuming paused match from {match.current_time}")
        elif match.status == 'live':
            print(f"Match is already live")
        else:
            match.status = 'live'
            if match.current_time is None:
                match.current_time = 0
            print(f"Setting match to live from status: {match.status}")
        
        db.commit()
        db.refresh(match)
        
        print(f"Match updated: status={match.status}, current_time={match.current_time}")
        
        return jsonify({
            'id': str(match.id),
            'status': match.status,
            'current_time': match.current_time,
            'duration_minutes': match.duration_minutes
        })
    except Exception as e:
        db.rollback()
        print(f"Error in start_match: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@matches_bp.route('/<match_id>/pause', methods=['POST'])
@require_admin_or_judge
def pause_match(user, match_id):
    # pause a match - sets status to paused
    print(f"pause_match called with match_id: {match_id}, type: {type(match_id)}")
    
    try:
        match_uuid = uuid.UUID(match_id)
        print(f"Valid UUID: {match_uuid}")
    except ValueError as e:
        print(f"Invalid UUID format: {e}")
        return jsonify({"detail": f"Invalid match ID format: {str(e)}"}), 400
    
    db = next(get_db())
    try:
        match = db.query(Match).filter(Match.id == match_uuid).first()
        if not match:
            print(f"Match not found with ID: {match_uuid}")
            return jsonify({"detail": f"Match not found with ID: {match_id}"}), 404
        
        print(f"Match found: {match.id}, status: {match.status}, current_time: {match.current_time}")
        
        if match.status == 'live':
            match.status = 'paused'
            print(f"Pausing live match at time: {match.current_time}")
        else:
            print(f"Match status is {match.status}, not live - no change needed")
        
        db.commit()
        db.refresh(match)
        
        print(f"Match paused: status={match.status}, current_time={match.current_time}")
        
        return jsonify({
            'id': str(match.id),
            'status': match.status,
            'current_time': match.current_time,
            'duration_minutes': match.duration_minutes
        })
    except Exception as e:
        db.rollback()
        print(f"Error in pause_match: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@matches_bp.route('/<match_id>/timer', methods=['PUT'])
@require_admin_or_judge
def update_timer(user, match_id):
    # update match timer (called periodically when match is live)
    print(f"update_timer called with match_id: {match_id}, type: {type(match_id)}")
    
    try:
        match_uuid = uuid.UUID(match_id)
        print(f"Valid UUID: {match_uuid}")
    except ValueError as e:
        print(f"Invalid UUID format: {e}")
        return jsonify({"detail": f"Invalid match ID format: {str(e)}"}), 400
    
    data = request.get_json() or {}
    new_time = data.get('current_time')
    print(f"Updating timer to: {new_time}")
    
    db = next(get_db())
    try:
        match = db.query(Match).filter(Match.id == match_uuid).first()
        if not match:
            print(f"Match not found with ID: {match_uuid}")
            return jsonify({"detail": f"Match not found with ID: {match_id}"}), 404
        
        print(f"Match found: {match.id}, status: {match.status}, current_time: {match.current_time}")
        
        if new_time is not None:
            match.current_time = int(new_time)
        
        db.commit()
        db.refresh(match)
        
        return jsonify({
            'id': str(match.id),
            'status': match.status,
            'current_time': match.current_time,
            'duration_minutes': match.duration_minutes
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@matches_bp.route('/<match_id>', methods=['PUT'])
@require_admin_or_judge
def update_match(user, match_id):
    # update a match (admin or judge)
    try:
        match_uuid = uuid.UUID(match_id)
    except ValueError:
        return jsonify({"detail": "Invalid match ID format"}), 400
    
    data = request.get_json()
    db = next(get_db())
    try:
        db_match = db.query(Match).filter(Match.id == match_uuid).first()
        if not db_match:
            return jsonify({"detail": "Match not found"}), 404
        
        for field, value in data.items():
            if hasattr(db_match, field):
                if field in ['competition_id', 'team1_id', 'team2_id'] and value:
                    setattr(db_match, field, uuid.UUID(value))
                else:
                    setattr(db_match, field, value)
        
        db.commit()
        db.refresh(db_match)
        
        # Emit WebSocket event
        if socketio:
            socketio.emit('match_updated', {'match_id': match_id})
            socketio.emit('competition_updated', {'competition_id': str(db_match.competition_id)})
        
        return jsonify({
            'id': str(db_match.id),
            'competition_id': str(db_match.competition_id),
            'team1_id': str(db_match.team1_id) if db_match.team1_id else None,
            'team2_id': str(db_match.team2_id) if db_match.team2_id else None,
            'match_name': db_match.match_name,
            'match_date': db_match.match_date.isoformat() if db_match.match_date else None,
            'duration_minutes': db_match.duration_minutes,
            'current_time': db_match.current_time,
            'round_number': db_match.round_number,
            'stage': db_match.stage,
            'status': db_match.status,
            'completion_time_milliseconds': getattr(db_match, 'completion_time_milliseconds', None),
            'created_at': db_match.created_at.isoformat() if db_match.created_at else None,
            'updated_at': db_match.updated_at.isoformat() if db_match.updated_at else None
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@matches_bp.route('/<match_id>', methods=['DELETE'])
@require_admin
def delete_match(user, match_id):
    # delete a match (admin only)
    try:
        match_uuid = uuid.UUID(match_id)
    except ValueError:
        return jsonify({"detail": "Invalid match ID format"}), 400
    
    db = next(get_db())
    try:
        db_match = db.query(Match).filter(Match.id == match_uuid).first()
        if not db_match:
            return jsonify({"detail": "Match not found"}), 404
        
        competition_id = db_match.competition_id
        
        # Delete the match (cascade will handle related results and penalties)
        db.delete(db_match)
        db.commit()
        
        # Emit WebSocket event
        if socketio:
            socketio.emit('match_deleted', {'match_id': match_id})
            socketio.emit('competition_updated', {'competition_id': str(competition_id)})
        
        return jsonify({"detail": "Match deleted successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

