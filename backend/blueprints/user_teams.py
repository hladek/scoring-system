from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from database import get_db
from models.users import User
from models.teams import Team
from models.user_teams import user_teams
from blueprints.auth import require_auth, require_admin
import uuid

user_teams_bp = Blueprint('user_teams', __name__)

@user_teams_bp.route('/users/<user_id>/teams', methods=['GET'])
@require_auth
def get_user_teams(user, user_id):
    # get all teams for a specific user
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return jsonify({"detail": "Invalid user ID format"}), 400
    
    db = next(get_db())
    try:
        db_user = db.query(User).filter(User.id == user_uuid).first()
        if not db_user:
            return jsonify({"detail": "User not found"}), 404
        
        # Check if user is requesting their own teams or is admin
        if str(user.id) != user_id and user.role != 'admin':
            return jsonify({"detail": "Unauthorized"}), 403
        
        teams = db_user.teams
        return jsonify([{
            "id": str(team.id),
            "name": team.name,
            "code": team.code,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "updated_at": team.updated_at.isoformat() if team.updated_at else None
        } for team in teams])
    finally:
        db.close()

@user_teams_bp.route('/users/<user_id>/teams/<team_id>', methods=['POST'])
@require_auth
def add_user_to_team(user, user_id, team_id):
    # add user to team (admin only or user adding themselves)
    try:
        user_uuid = uuid.UUID(user_id)
        team_uuid = uuid.UUID(team_id)
    except ValueError:
        return jsonify({"detail": "Invalid ID format"}), 400
    
    db = next(get_db())
    try:
        db_user = db.query(User).filter(User.id == user_uuid).first()
        db_team = db.query(Team).filter(Team.id == team_uuid).first()
        
        if not db_user:
            return jsonify({"detail": "User not found"}), 404
        if not db_team:
            return jsonify({"detail": "Team not found"}), 404
        
        # Check if user is adding themselves or is admin
        if str(user.id) != user_id and user.role != 'admin':
            return jsonify({"detail": "Unauthorized"}), 403
        
        # Check if user is already in team
        if db_team in db_user.teams:
            return jsonify({"detail": "User is already in this team"}), 400
        
        db_user.teams.append(db_team)
        db.commit()
        
        return jsonify({
            "message": "User added to team successfully",
            "user_id": str(user_id),
            "team_id": str(team_id)
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@user_teams_bp.route('/users/<user_id>/teams/<team_id>', methods=['DELETE'])
@require_auth
def remove_user_from_team(user, user_id, team_id):
    # remove user from team (admin only or user removing themselves)
    try:
        user_uuid = uuid.UUID(user_id)
        team_uuid = uuid.UUID(team_id)
    except ValueError:
        return jsonify({"detail": "Invalid ID format"}), 400
    
    db = next(get_db())
    try:
        db_user = db.query(User).filter(User.id == user_uuid).first()
        db_team = db.query(Team).filter(Team.id == team_uuid).first()
        
        if not db_user:
            return jsonify({"detail": "User not found"}), 404
        if not db_team:
            return jsonify({"detail": "Team not found"}), 404
        
        # Check if user is removing themselves or is admin
        if str(user.id) != user_id and user.role != 'admin':
            return jsonify({"detail": "Unauthorized"}), 403
        
        # Check if user is in team
        if db_team not in db_user.teams:
            return jsonify({"detail": "User is not in this team"}), 400
        
        db_user.teams.remove(db_team)
        db.commit()
        
        return jsonify({
            "message": "User removed from team successfully"
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@user_teams_bp.route('/teams/<team_id>/users', methods=['GET'])
@require_auth
def get_team_users(user, team_id):
    # get all users in a team
    try:
        team_uuid = uuid.UUID(team_id)
    except ValueError:
        return jsonify({"detail": "Invalid team ID format"}), 400
    
    db = next(get_db())
    try:
        db_team = db.query(Team).filter(Team.id == team_uuid).first()
        if not db_team:
            return jsonify({"detail": "Team not found"}), 404
        
        users = db_team.users
        return jsonify([{
            "id": str(u.id),
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users])
    finally:
        db.close()

@user_teams_bp.route('/me/teams', methods=['GET'])
@require_auth
def get_my_teams(user):
    # get current user's teams
    db = next(get_db())
    try:
        db_user = db.query(User).filter(User.id == user.id).first()
        if not db_user:
            return jsonify({"detail": "User not found"}), 404
        
        teams = db_user.teams
        return jsonify([{
            "id": str(team.id),
            "name": team.name,
            "code": team.code,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "updated_at": team.updated_at.isoformat() if team.updated_at else None
        } for team in teams])
    finally:
        db.close()

@user_teams_bp.route('/me/competitions', methods=['GET'])
@require_auth
def get_my_competitions(user):
    # get competitions where user has matches (through teams)
    from models.competitions import Competition
    from models.matches import Match
    
    db = next(get_db())
    try:
        db_user = db.query(User).filter(User.id == user.id).first()
        if not db_user:
            return jsonify({"detail": "User not found"}), 404
        
        user_team_ids = [str(team.id) for team in db_user.teams]
        
        if not user_team_ids:
            return jsonify([])
        
        # Get all matches where user's teams are involved
        matches = db.query(Match).filter(
            (Match.team1_id.in_([uuid.UUID(tid) for tid in user_team_ids])) |
            (Match.team2_id.in_([uuid.UUID(tid) for tid in user_team_ids]))
        ).all()
        
        # Get unique competition IDs
        competition_ids = set([str(match.competition_id) for match in matches])
        
        # Get competitions
        competitions = db.query(Competition).filter(
            Competition.id.in_([uuid.UUID(cid) for cid in competition_ids])
        ).all()
        
        return jsonify([{
            'id': str(c.id),
            'name': c.name,
            'description': c.description,
            'location': c.location,
            'start_date': c.start_date.isoformat() if c.start_date else None,
            'end_date': c.end_date.isoformat() if c.end_date else None,
            'status': c.status,
            'created_at': c.created_at.isoformat() if c.created_at else None,
            'updated_at': c.updated_at.isoformat() if c.updated_at else None
        } for c in competitions])
    finally:
        db.close()









