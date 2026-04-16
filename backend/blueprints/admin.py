from flask import Blueprint, jsonify, request
from sqlalchemy.orm import Session
from database import get_db
from models.users import User
from models.competitions import Competition
from models.matches import Match
from models.teams import Team
from models.results import Result
from models.penalties import Penalty
from sqlalchemy import func
from blueprints.auth import require_admin

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard', methods=['GET'])
@require_admin
def admin_dashboard(user):
    # admin dashboard endpoint
    return jsonify({
        "message": "Admin Dashboard",
        "user": {
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    })

@admin_bp.route('/users', methods=['GET'])
@require_admin
def get_all_users(user):
    # get all users (admin only)
    db = next(get_db())
    try:
        users = db.query(User).all()
        return jsonify([
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ])
    finally:
        db.close()


@admin_bp.route('/users', methods=['POST'])
@require_admin
def create_user(user):
    # create new user (admin only) – replaces public register
    from auth.password_handler import hash_password
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    email = (data.get('email') or '').strip() or None
    role = (data.get('role') or 'user').strip()
    if role not in ('admin', 'user', 'judge'):
        role = 'user'
    if not username or not password:
        return jsonify({"detail": "Username and password required"}), 400
    if len(password) < 6:
        return jsonify({"detail": "Password must be at least 6 characters"}), 400
    db = next(get_db())
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            return jsonify({"detail": "Username already exists"}), 400
        if email:
            existing_email = db.query(User).filter(User.email == email).first()
            if existing_email:
                return jsonify({"detail": "Email already exists"}), 400
        new_user = User(
            username=username,
            password_hash=hash_password(password),
            email=email,
            role=role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return jsonify({
            "id": str(new_user.id),
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role,
            "created_at": new_user.created_at.isoformat() if new_user.created_at else None
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@admin_bp.route('/stats', methods=['GET'])
@require_admin
def get_admin_stats(user):
    # get admin statistics
    db = next(get_db())
    try:
        total_users = db.query(User).count()
        admin_users = db.query(User).filter(User.role == "admin").count()
        regular_users = db.query(User).filter(User.role == "user").count()
        judge_users = db.query(User).filter(User.role == "judge").count()
        
        return jsonify({
            "total_users": total_users,
            "admin_users": admin_users,
            "regular_users": regular_users,
            "judge_users": judge_users
        })
    finally:
        db.close()

@admin_bp.route('/statistics', methods=['GET'])
def get_statistics():
    # get comprehensive statistics for dashboard
    db = next(get_db())
    try:
        # user stats
        total_users = db.query(User).count()
        
        # competition stats
        total_competitions = db.query(Competition).count()
        upcoming_competitions = db.query(Competition).filter(Competition.status == "upcoming").count()
        ongoing_competitions = db.query(Competition).filter(Competition.status == "ongoing").count()
        completed_competitions = db.query(Competition).filter(Competition.status == "completed").count()
        
        # Match stats
        total_matches = db.query(Match).count()
        live_matches = db.query(Match).filter(Match.status == "live").count()
        scheduled_matches = db.query(Match).filter(Match.status == "scheduled").count()
        completed_matches = db.query(Match).filter(Match.status == "completed").count()
        
        # Team stats
        total_teams = db.query(Team).count()
        
        # Result stats
        total_results = db.query(Result).count()
        avg_score = db.query(func.avg(Result.score)).scalar() or 0
        
        # Penalty stats
        total_penalties = db.query(Penalty).count()
        total_penalty_points = db.query(func.sum(Penalty.points)).scalar() or 0
        
        # Top teams by score
        top_teams = db.query(
            Team.name,
            func.sum(Result.score).label('total_score')
        ).join(Result, Team.id == Result.team_id).group_by(Team.id, Team.name).order_by(func.sum(Result.score).desc()).limit(10).all()
        
        return jsonify({
            "users": {
                "total": total_users
            },
            "competitions": {
                "total": total_competitions,
                "upcoming": upcoming_competitions,
                "ongoing": ongoing_competitions,
                "completed": completed_competitions
            },
            "matches": {
                "total": total_matches,
                "live": live_matches,
                "scheduled": scheduled_matches,
                "completed": completed_matches
            },
            "teams": {
                "total": total_teams
            },
            "results": {
                "total": total_results,
                "average_score": float(avg_score)
            },
            "penalties": {
                "total": total_penalties,
                "total_points": int(total_penalty_points)
            },
            "top_teams": [
                {"name": team[0], "total_score": int(team[1])} for team in top_teams
            ]
        })
    finally:
        db.close()

@admin_bp.route('/users/<user_id>', methods=['PUT'])
@require_admin
def update_user(user, user_id):
    # update user account details (admin only)
    from auth.password_handler import hash_password
    import uuid
    
    db = next(get_db())
    try:
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return jsonify({"detail": "Invalid user ID format"}), 400
        
        target_user = db.query(User).filter(User.id == user_uuid).first()
        if not target_user:
            return jsonify({"detail": "User not found"}), 404
        
        data = request.get_json()
        
        # update username
        if 'username' in data and data['username']:
            new_username = data['username'].strip()
            if new_username != target_user.username:
                existing = db.query(User).filter(User.username == new_username).first()
                if existing:
                    return jsonify({"detail": "Username already exists"}), 400
                target_user.username = new_username
        
        # update email
        if 'email' in data:
            new_email = data['email'].strip() if data['email'] else None
            if new_email != target_user.email:
                if new_email:
                    existing = db.query(User).filter(User.email == new_email).first()
                    if existing:
                        return jsonify({"detail": "Email already exists"}), 400
                target_user.email = new_email
        
        # update password
        if 'password' in data and data['password']:
            new_password = data['password']
            if len(new_password) < 6:
                return jsonify({"detail": "Password must be at least 6 characters"}), 400
            target_user.password_hash = hash_password(new_password)
        
        # update role
        if 'role' in data and data['role']:
            new_role = data['role']
            if new_role not in ['admin', 'user', 'judge']:
                return jsonify({"detail": "Invalid role"}), 400
            # prevent removing last admin
            if target_user.role == 'admin' and new_role != 'admin':
                admin_count = db.query(User).filter(User.role == 'admin').count()
                if admin_count <= 1:
                    return jsonify({"detail": "Cannot remove last admin user"}), 400
            target_user.role = new_role
        
        db.commit()
        db.refresh(target_user)
        
        return jsonify({
            "id": str(target_user.id),
            "username": target_user.username,
            "email": target_user.email,
            "role": target_user.role,
            "created_at": target_user.created_at.isoformat() if target_user.created_at else None,
            "updated_at": target_user.updated_at.isoformat() if target_user.updated_at else None
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@require_admin
def delete_user(user, user_id):
    # delete user account (admin only)
    import uuid
    
    db = next(get_db())
    try:
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return jsonify({"detail": "Invalid user ID format"}), 400
        
        target_user = db.query(User).filter(User.id == user_uuid).first()
        if not target_user:
            return jsonify({"detail": "User not found"}), 404
        
        # prevent deleting last admin
        if target_user.role == 'admin':
            admin_count = db.query(User).filter(User.role == 'admin').count()
            if admin_count <= 1:
                return jsonify({"detail": "Cannot delete last admin user"}), 400
        
        # prevent deleting yourself
        if str(target_user.id) == str(user.id):
            return jsonify({"detail": "Cannot delete your own account"}), 400
        
        db.delete(target_user)
        db.commit()
        
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()