from flask import Blueprint, request, jsonify
from database import get_db
from models.split_times import SplitTime
from models.matches import Match
from models.teams import Team
from blueprints.auth import require_admin_or_judge
import uuid

split_times_bp = Blueprint('split_times', __name__)

socketio = None

def set_socketio(sio):
    global socketio
    socketio = sio


def _serialize(s, team_name=None):
    mins = s.time_seconds // 60
    secs = s.time_seconds % 60
    return {
        'id': str(s.id),
        'match_id': str(s.match_id),
        'team_id': str(s.team_id) if s.team_id else None,
        'team_name': team_name,
        'time_seconds': s.time_seconds,
        'time_formatted': f'{mins:02d}:{secs:02d}',
        'label': s.label,
        'created_at': s.created_at.isoformat() if s.created_at else None,
    }


@split_times_bp.route('', methods=['GET'])
def get_split_times():
    match_id = request.args.get('match_id')
    team_id = request.args.get('team_id')

    db = next(get_db())
    try:
        query = db.query(SplitTime)
        if match_id:
            query = query.filter(SplitTime.match_id == uuid.UUID(match_id))
        if team_id:
            query = query.filter(SplitTime.team_id == uuid.UUID(team_id))
        splits = query.order_by(SplitTime.created_at).all()
        result = []
        for s in splits:
            team_name = db.query(Team.name).filter(Team.id == s.team_id).scalar() if s.team_id else None
            result.append(_serialize(s, team_name))
        return jsonify(result)
    finally:
        db.close()


@split_times_bp.route('', methods=['POST'])
@require_admin_or_judge
def create_split_time(user):
    data = request.get_json() or {}
    db = next(get_db())
    try:
        match_id = uuid.UUID(data['match_id'])
        team_id = uuid.UUID(data['team_id']) if data.get('team_id') else None
        time_seconds = int(data.get('time_seconds', 0))
        label = data.get('label', None)

        split = SplitTime(
            match_id=match_id,
            team_id=team_id,
            time_seconds=time_seconds,
            label=label,
        )
        db.add(split)
        db.commit()
        db.refresh(split)

        if socketio:
            match = db.query(Match).filter(Match.id == match_id).first()
            if match:
                socketio.emit('match_updated', {'match_id': str(match_id)})
                socketio.emit('competition_updated', {'competition_id': str(match.competition_id)})

        team_name = db.query(Team.name).filter(Team.id == split.team_id).scalar() if split.team_id else None
        return jsonify(_serialize(split, team_name)), 201
    except Exception as e:
        db.rollback()
        return jsonify({'detail': str(e)}), 500
    finally:
        db.close()


@split_times_bp.route('/<split_id>', methods=['DELETE'])
@require_admin_or_judge
def delete_split_time(user, split_id):
    try:
        split_uuid = uuid.UUID(split_id)
    except ValueError:
        return jsonify({'detail': 'Invalid ID'}), 400

    db = next(get_db())
    try:
        split = db.query(SplitTime).filter(SplitTime.id == split_uuid).first()
        if not split:
            return jsonify({'detail': 'Not found'}), 404

        match_id = str(split.match_id)
        match = db.query(Match).filter(Match.id == split.match_id).first()
        competition_id = str(match.competition_id) if match else None

        db.delete(split)
        db.commit()

        if socketio:
            socketio.emit('match_updated', {'match_id': match_id})
            if competition_id:
                socketio.emit('competition_updated', {'competition_id': competition_id})

        return '', 204
    except Exception as e:
        db.rollback()
        return jsonify({'detail': str(e)}), 500
    finally:
        db.close()
