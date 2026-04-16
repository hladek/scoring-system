from database import SessionLocal
from models.users import User
from auth.password_handler import hash_password

def create_admin_user():
    """Create default admin user if it doesn't exist"""
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if admin_user:
            print("Admin user already exists!")
            return
        
        admin_user = User(
            username="admin",
            email="admin@scoring-system.com",
            password_hash=hash_password("admin123"),
            role="admin"
        )
        
        db.add(admin_user)
        db.commit()
        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()

