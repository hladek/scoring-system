from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from database import get_db
from models.teams import Team
from schemas.teams import TeamCreate, TeamUpdate, TeamResponse
from blueprints.auth import require_auth, require_admin
import uuid

teams_bp = Blueprint('teams', __name__)

@teams_bp.route('', methods=['GET'])
def get_all_teams():
    # get all teams
    db = next(get_db())
    try:
        teams = db.query(Team).all()
        return jsonify([{
            "id": str(team.id),
            "name": team.name,
            "code": team.code,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "updated_at": team.updated_at.isoformat() if team.updated_at else None
        } for team in teams])
    finally:
        db.close()

@teams_bp.route('/<team_id>', methods=['GET'])
def get_team(team_id):
    # get a specific team
    db = next(get_db())
    try:
        team = db.query(Team).filter(Team.id == uuid.UUID(team_id)).first()
        if not team:
            return jsonify({"detail": "Team not found"}), 404
        return jsonify({
            "id": str(team.id),
            "name": team.name,
            "code": team.code,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "updated_at": team.updated_at.isoformat() if team.updated_at else None
        })
    finally:
        db.close()

@teams_bp.route('', methods=['POST'])
@require_admin
def create_team(user):
    # create a new team
    db = next(get_db())
    try:
        data = request.get_json()
        code = data.get('code')
        # Convert empty string to None to avoid unique constraint violation
        if code == '':
            code = None
        team = Team(
            name=data.get('name'),
            code=code
        )
        db.add(team)
        db.commit()
        db.refresh(team)
        return jsonify({
            "id": str(team.id),
            "name": team.name,
            "code": team.code,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "updated_at": team.updated_at.isoformat() if team.updated_at else None
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@teams_bp.route('/<team_id>', methods=['PUT'])
@require_admin
def update_team(user, team_id):
    # update a team
    db = next(get_db())
    try:
        team = db.query(Team).filter(Team.id == uuid.UUID(team_id)).first()
        if not team:
            return jsonify({"detail": "Team not found"}), 404
        
        data = request.get_json()
        if 'name' in data:
            team.name = data['name']
        if 'code' in data:
            code = data.get('code')
            # Convert empty string to None to avoid unique constraint violation
            if code == '':
                code = None
            team.code = code
        
        db.commit()
        db.refresh(team)
        return jsonify({
            "id": str(team.id),
            "name": team.name,
            "code": team.code,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "updated_at": team.updated_at.isoformat() if team.updated_at else None
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@teams_bp.route('/<team_id>', methods=['DELETE'])
@require_admin
def delete_team(user, team_id):
    # delete a team
    db = next(get_db())
    try:
        team = db.query(Team).filter(Team.id == uuid.UUID(team_id)).first()
        if not team:
            return jsonify({"detail": "Team not found"}), 404
        
        db.delete(team)
        db.commit()
        return jsonify({"message": "Team deleted successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

